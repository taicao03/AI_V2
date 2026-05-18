alter table public.poker_players add column if not exists is_bot boolean not null default false;
alter table public.poker_players add column if not exists bot_session_token text;
create index if not exists poker_players_table_bot_idx on public.poker_players (table_id, is_bot, left_at, is_spectator);

create or replace function public.poker_add_npcs(
  p_session_token text,
  p_table_id uuid,
  p_count integer default 1
)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
  target_table public.poker_tables%rowtype;
  active_seated integer := 0;
  slots_left integer := 0;
  requested integer := 0;
  added integer := 0;
  bot_uid uuid;
  bot_token text;
  seat_num integer;
  bot_index integer;
begin
  select * into profile from public.users u where u.uid = current_uid;
  if not found or profile.is_banned then
    raise exception 'Account cannot add NPC' using errcode = '42501';
  end if;

  select * into target_table
  from public.poker_tables t
  where t.table_id = p_table_id
  for update;

  if not found then
    raise exception 'Poker table not found' using errcode = 'P0002';
  end if;

  if target_table.status not in ('waiting', 'countdown') then
    return 0;
  end if;

  select count(*) into active_seated
  from public.poker_players p
  where p.table_id = p_table_id
    and p.left_at is null
    and p.is_spectator = false;

  slots_left := greatest(0, target_table.max_players - active_seated);
  requested := least(greatest(1, coalesce(p_count, 1)), slots_left);

  while added < requested loop
    select u.uid
    into bot_uid
    from public.users u
    where u.account_name like 'poker_bot_%'
      and u.is_banned = false
      and not exists (
        select 1
        from public.poker_players p
        where p.user_id = u.uid
          and p.left_at is null
          and p.is_spectator = false
      )
    order by u.updated_at asc
    limit 1;

    if bot_uid is null then
      bot_index := floor(random() * 900000)::integer + 100000;
      bot_uid := gen_random_uuid();

      insert into public.users (
        uid,
        account_name,
        display_name,
        email,
        points,
        locked_points,
        vip_level,
        created_at,
        updated_at,
        points_updated_at
      )
      values (
        bot_uid,
        'poker_bot_' || bot_index::text,
        'NPC ' || bot_index::text,
        'poker_bot_' || bot_index::text || '@local',
        500000,
        0,
        0,
        now(),
        now(),
        now()
      )
      on conflict (uid) do nothing;
    else
      update public.users
      set points = greatest(public.users.points, 500000),
          is_banned = false,
          points_updated_at = now(),
          updated_at = now()
      where uid = bot_uid;
    end if;

    select seat_candidate.seat_no
    into seat_num
    from generate_series(1, target_table.max_players) as seat_candidate(seat_no)
    where not exists (
      select 1
      from public.poker_players p
      where p.table_id = p_table_id
        and p.left_at is null
        and p.is_spectator = false
        and p.seat_order = seat_candidate.seat_no
    )
    order by seat_candidate.seat_no asc
    limit 1;

    if seat_num is null then
      exit;
    end if;

    bot_token := public.create_account_session(bot_uid);

    insert into public.poker_players (
      table_id,
      user_id,
      seat_order,
      is_ready,
      is_spectator,
      current_bet,
      joined_at,
      left_at,
      last_heartbeat_at,
      is_bot,
      bot_session_token
    )
    values (
      p_table_id,
      bot_uid,
      seat_num,
      true,
      false,
      target_table.min_bet,
      now(),
      null,
      now(),
      true,
      bot_token
    )
    on conflict (table_id, user_id) do update
      set seat_order = excluded.seat_order,
          is_ready = true,
          is_spectator = false,
          current_bet = excluded.current_bet,
          left_at = null,
          last_heartbeat_at = now(),
          has_folded = false,
          is_all_in = false,
          total_bet = 0,
          round_bet = 0,
          last_action = null,
          acted_in_phase = false,
          player_status = 'ready',
          is_bot = true,
          bot_session_token = excluded.bot_session_token,
          updated_at = now();

    added := added + 1;
  end loop;

  update public.poker_tables
  set last_activity_at = now(),
      updated_at = now()
  where table_id = p_table_id;

  return added;
end;
$$;

create or replace function public.poker_bot_decide_action(
  p_round_id uuid,
  p_table_id uuid,
  p_user_id uuid
)
returns table (
  action text,
  raise_to integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  round_record public.poker_rounds%rowtype;
  table_record public.poker_tables%rowtype;
  player_record public.poker_players%rowtype;
  user_record public.users%rowtype;
  hand_cards text[];
  eval_record record;
  hand_rank smallint := 9;
  to_call integer := 0;
  available integer := 0;
  step_raise integer := 0;
  target_raise integer := 0;
  max_total_bet integer := 0;
  raise_room integer := 0;
begin
  select * into round_record from public.poker_rounds r where r.round_id = p_round_id;
  select * into table_record from public.poker_tables t where t.table_id = p_table_id;
  select * into player_record
  from public.poker_players p
  where p.table_id = p_table_id and p.user_id = p_user_id and p.left_at is null and p.is_spectator = false;
  select * into user_record from public.users u where u.uid = p_user_id;
  select h.cards into hand_cards
  from public.poker_hands h
  where h.round_id = p_round_id
    and h.user_id = p_user_id;

  if not found then
    return;
  end if;

  if round_record.status <> 'playing'
    or round_record.round_phase not in ('round1', 'round2', 'round3')
    or player_record.has_folded
    or player_record.is_all_in
    or player_record.acted_in_phase then
    return;
  end if;

  to_call := greatest(0, coalesce(round_record.current_bet, 0) - coalesce(player_record.round_bet, 0));
  available := greatest(0, user_record.points - user_record.locked_points);
  step_raise := greatest(1, coalesce(round_record.min_raise, 1), coalesce(table_record.min_bet, 1));
  max_total_bet := least(coalesce(player_record.round_bet, 0) + available, table_record.max_bet);
  raise_room := greatest(0, max_total_bet - coalesce(round_record.current_bet, 0));

  if hand_cards is not null and array_length(hand_cards, 1) = 3 and array_length(round_record.community_cards, 1) = 2 then
    select * into eval_record
    from public.poker_evaluate_hand(hand_cards || round_record.community_cards)
    limit 1;

    hand_rank := coalesce(eval_record.hand_rank, 9);
  end if;

  if available <= 0 then
    action := 'fold';
    raise_to := null;
    return next;
    return;
  end if;

  if hand_rank <= 2 then
    if to_call >= greatest(1, floor(available * 0.45)::integer) or random() < 0.82 then
      action := 'all-in';
      raise_to := null;
      return next;
      return;
    end if;

    target_raise := coalesce(round_record.current_bet, 0) + greatest(step_raise * 2, floor(available * 0.6)::integer);
    target_raise := least(target_raise, max_total_bet);
    if target_raise > coalesce(round_record.current_bet, 0) then
      action := 'raise';
      raise_to := target_raise;
      return next;
      return;
    end if;
  elsif hand_rank = 3 then
    if to_call >= greatest(1, floor(available * 0.5)::integer) and random() < 0.7 then
      action := 'all-in';
      raise_to := null;
      return next;
      return;
    end if;

    if raise_room >= step_raise and random() < 0.68 then
      target_raise := coalesce(round_record.current_bet, 0) + greatest(step_raise, floor(available * 0.45)::integer);
      target_raise := least(target_raise, max_total_bet);
      if target_raise > coalesce(round_record.current_bet, 0) then
        action := 'raise';
        raise_to := target_raise;
        return next;
        return;
      end if;
    end if;
  elsif hand_rank in (4, 5) then
    if to_call >= greatest(1, floor(available * 0.65)::integer) and random() < 0.28 then
      action := 'all-in';
      raise_to := null;
      return next;
      return;
    end if;

    if raise_room >= step_raise and random() < 0.45 then
      target_raise := coalesce(round_record.current_bet, 0) + greatest(step_raise, floor(available * 0.28)::integer);
      target_raise := least(target_raise, max_total_bet);
      if target_raise > coalesce(round_record.current_bet, 0) then
        action := 'raise';
        raise_to := target_raise;
        return next;
        return;
      end if;
    end if;
  end if;

  if to_call = 0 then
    if raise_room >= step_raise and random() < 0.2 then
      target_raise := least(coalesce(round_record.current_bet, 0) + step_raise, max_total_bet);
      if target_raise > coalesce(round_record.current_bet, 0) then
        action := 'raise';
        raise_to := target_raise;
      else
        action := 'check';
        raise_to := null;
      end if;
    else
      action := 'check';
      raise_to := null;
    end if;
    return next;
    return;
  end if;

  if to_call >= available then
    action := 'all-in';
    raise_to := null;
    return next;
    return;
  end if;

  if hand_rank <= 7 then
    if to_call <= greatest(1, floor(available * 0.75)::integer) then
      action := 'call';
      raise_to := null;
    else
      action := case when random() < 0.22 then 'all-in' else 'fold' end;
      raise_to := null;
    end if;
  elsif hand_rank = 8 then
    if to_call <= greatest(1, floor(available * 0.2)::integer) then
      action := case when random() < 0.2 then 'call' else 'fold' end;
      raise_to := null;
    else
      action := 'fold';
      raise_to := null;
    end if;
  else
    if to_call <= greatest(1, floor(available * 0.12)::integer) and random() < 0.1 then
      action := 'call';
      raise_to := null;
    else
      action := 'fold';
      raise_to := null;
    end if;
  end if;

  return next;
end;
$$;

create or replace function public.poker_tick_tables(p_session_token text)
returns table (
  table_id uuid,
  status text,
  active_round_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
  table_record public.poker_tables%rowtype;
  round_record public.poker_rounds%rowtype;
  npc_table_id uuid;
  ready_count integer;
  human_seated_count integer;
  seated_count integer;
  bots_needed integer;
  alive_count integer;
  pending_action_count integer;
  unresolved_bet_count integer;
  bot_record record;
  bot_action text;
  bot_raise_to integer;
begin
  select * into profile from public.users u where u.uid = current_uid;
  if not found or profile.is_banned then
    raise exception 'Account cannot manage poker tick' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext('poker_tick_tables_v3'));

  update public.poker_players p
  set left_at = now(),
      is_ready = false,
      has_folded = true,
      player_status = 'folded',
      updated_at = now()
  where p.left_at is null
    and p.is_spectator = false
    and p.is_bot = false
    and p.last_heartbeat_at < now() - interval '90 seconds';

  select t.table_id
  into npc_table_id
  from public.poker_tables t
  where t.status <> 'closed'
    and t.is_private = false
    and t.name = 'NPC Arena'
  order by t.updated_at desc
  limit 1;

  if npc_table_id is null then
    insert into public.poker_tables as t (
      name,
      is_private,
      max_players,
      min_bet,
      max_bet,
      status,
      created_by,
      last_activity_at
    )
    values (
      'NPC Arena',
      false,
      6,
      10,
      1000,
      'waiting',
      current_uid,
      now()
    )
    returning t.table_id into npc_table_id;
  end if;

  if exists (
    select 1
    from public.poker_tables t
    where t.table_id = npc_table_id
      and t.status in ('waiting', 'countdown')
  ) then
    perform public.poker_add_npcs(
      p_session_token => p_session_token,
      p_table_id => npc_table_id,
      p_count => 2
    );
  end if;

  for table_record in
    select *
    from public.poker_tables t
    where t.status <> 'closed'
    for update
  loop
    if table_record.status in ('waiting', 'countdown') then
      update public.poker_players p
      set is_ready = true,
          current_bet = greatest(1, table_record.min_bet),
          has_folded = false,
          is_all_in = false,
          total_bet = 0,
          round_bet = 0,
          last_action = null,
          acted_in_phase = false,
          player_status = 'ready',
          updated_at = now()
      where p.table_id = table_record.table_id
        and p.left_at is null
        and p.is_spectator = false
        and p.is_bot = true;

      select count(*) into human_seated_count
      from public.poker_players p
      where p.table_id = table_record.table_id
        and p.left_at is null
        and p.is_spectator = false
        and p.is_bot = false;

      select count(*) into seated_count
      from public.poker_players p
      where p.table_id = table_record.table_id
        and p.left_at is null
        and p.is_spectator = false;

      if human_seated_count > 0 and seated_count < 2 then
        bots_needed := greatest(0, least(table_record.max_players - seated_count, 2 - seated_count));
        if bots_needed > 0 then
          perform public.poker_add_npcs(
            p_session_token => p_session_token,
            p_table_id => table_record.table_id,
            p_count => bots_needed
          );
        end if;
      end if;
    end if;

    select count(*)
    into ready_count
    from public.poker_players p
    where p.table_id = table_record.table_id
      and p.left_at is null
      and p.is_spectator = false
      and p.is_ready = true;

    if table_record.status = 'waiting' then
      if ready_count >= 2 then
        update public.poker_tables t
        set status = 'countdown',
            countdown_ends_at = now() + interval '10 seconds',
            updated_at = now(),
            last_activity_at = now()
        where t.table_id = table_record.table_id
        returning * into table_record;
      end if;
    elsif table_record.status = 'countdown' then
      if ready_count < 2 then
        update public.poker_tables t
        set status = 'waiting',
            countdown_ends_at = null,
            updated_at = now(),
            last_activity_at = now()
        where t.table_id = table_record.table_id
        returning * into table_record;
      elsif table_record.countdown_ends_at is not null and table_record.countdown_ends_at <= now() then
        round_record := public.poker_start_round(table_record.table_id);
        select * into table_record from public.poker_tables t where t.table_id = table_record.table_id;
      end if;
    elsif table_record.status = 'playing' and table_record.active_round_id is not null then
      select * into round_record from public.poker_rounds r where r.round_id = table_record.active_round_id for update;

      if found and round_record.status = 'playing' then
        if round_record.phase_ends_at is not null and round_record.phase_ends_at <= now() then
          update public.poker_players p
          set acted_in_phase = true,
              has_folded = case when p.round_bet <> round_record.current_bet then true else p.has_folded end,
              player_status = case
                when p.round_bet <> round_record.current_bet then 'folded'
                when p.is_all_in then 'all-in'
                else 'ready'
              end,
              last_action = case when p.round_bet <> round_record.current_bet then 'auto-fold' else 'auto-check' end,
              action_at = now(),
              updated_at = now()
          where p.table_id = table_record.table_id
            and p.left_at is null
            and p.is_spectator = false
            and p.has_folded = false
            and p.is_all_in = false
            and p.acted_in_phase = false;
        end if;

        for bot_record in
          select p.user_id, p.bot_session_token
          from public.poker_players p
          where p.table_id = table_record.table_id
            and p.left_at is null
            and p.is_spectator = false
            and p.is_bot = true
            and p.has_folded = false
            and p.is_all_in = false
            and p.acted_in_phase = false
        loop
          select d.action, d.raise_to
          into bot_action, bot_raise_to
          from public.poker_bot_decide_action(round_record.round_id, table_record.table_id, bot_record.user_id) d
          limit 1;

          if bot_action is null then
            continue;
          end if;

          begin
            if bot_record.bot_session_token is null or length(trim(bot_record.bot_session_token)) < 32 then
              update public.poker_players p
              set bot_session_token = public.create_account_session(bot_record.user_id),
                  updated_at = now()
              where p.table_id = table_record.table_id and p.user_id = bot_record.user_id
              returning p.bot_session_token into bot_record.bot_session_token;
            end if;

            perform public.poker_take_action(
              bot_record.bot_session_token,
              table_record.table_id,
              bot_action,
              bot_raise_to
            );
          exception when others then
            begin
              update public.poker_players p
              set bot_session_token = public.create_account_session(bot_record.user_id),
                  updated_at = now()
              where p.table_id = table_record.table_id and p.user_id = bot_record.user_id
              returning p.bot_session_token into bot_record.bot_session_token;

              perform public.poker_take_action(
                bot_record.bot_session_token,
                table_record.table_id,
                bot_action,
                bot_raise_to
              );
            exception when others then
              null;
            end;
          end;
        end loop;

        select * into round_record from public.poker_rounds r where r.round_id = table_record.active_round_id for update;

        select count(*) into alive_count
        from public.poker_players p
        where p.table_id = table_record.table_id
          and p.left_at is null
          and p.is_spectator = false
          and p.has_folded = false;

        select count(*) into pending_action_count
        from public.poker_players p
        where p.table_id = table_record.table_id
          and p.left_at is null
          and p.is_spectator = false
          and p.has_folded = false
          and p.is_all_in = false
          and p.acted_in_phase = false;

        select count(*) into unresolved_bet_count
        from public.poker_players p
        where p.table_id = table_record.table_id
          and p.left_at is null
          and p.is_spectator = false
          and p.has_folded = false
          and p.is_all_in = false
          and p.round_bet <> round_record.current_bet;

        if alive_count <= 1 then
          round_record := public.poker_showdown_round(round_record.round_id);
        elsif pending_action_count = 0 and unresolved_bet_count = 0 then
          if round_record.round_phase in ('round1', 'round2') then
            round_record := public.poker_prepare_next_phase(round_record.round_id);
          elsif round_record.round_phase = 'round3' then
            round_record := public.poker_showdown_round(round_record.round_id);
          end if;
        end if;

        select * into table_record from public.poker_tables t where t.table_id = table_record.table_id;
      end if;
    elsif table_record.status = 'completed' then
      if table_record.countdown_ends_at is not null and table_record.countdown_ends_at <= now() then
        update public.poker_tables t
        set status = 'waiting',
            active_round_id = null,
            countdown_ends_at = null,
            updated_at = now(),
            last_activity_at = now()
        where t.table_id = table_record.table_id
        returning * into table_record;

        update public.poker_players p
        set has_folded = false,
            is_all_in = false,
            total_bet = 0,
            round_bet = 0,
            last_action = null,
            acted_in_phase = false,
            player_status = case when p.is_bot then 'ready' else 'ready' end,
            is_ready = case when p.is_bot then true else p.is_ready end,
            updated_at = now()
        where p.table_id = table_record.table_id
          and p.left_at is null
          and p.is_spectator = false;
      end if;
    end if;

    table_id := table_record.table_id;
    status := table_record.status;
    active_round_id := table_record.active_round_id;
    return next;
  end loop;
end;
$$;

create or replace function public.poker_get_table_state(p_session_token text, p_table_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  target_table public.poker_tables%rowtype;
  active_round public.poker_rounds%rowtype;
  deal_visible integer := 0;
begin
  select * into target_table from public.poker_tables t where t.table_id = p_table_id;
  if not found then
    raise exception 'Poker table not found' using errcode = 'P0002';
  end if;

  select * into active_round from public.poker_rounds r where r.round_id = target_table.active_round_id;

  deal_visible := case
    when active_round.round_phase = 'round1' then 3
    when active_round.round_phase = 'round2' then 4
    when active_round.round_phase = 'round3' then 5
    when active_round.round_phase in ('showdown', 'completed') then 5
    else 0
  end;

  return jsonb_build_object(
    'table', to_jsonb(target_table),
    'round', to_jsonb(active_round),
    'players', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'user_id', p.user_id,
        'seat_order', p.seat_order,
        'is_bot', p.is_bot,
        'is_ready', p.is_ready,
        'is_spectator', p.is_spectator,
        'current_bet', p.current_bet,
        'left_at', p.left_at,
        'last_heartbeat_at', p.last_heartbeat_at,
        'display_name', u.display_name,
        'avatar_url', u.avatar_url,
        'is_me', p.user_id = current_uid,
        'has_folded', p.has_folded,
        'is_all_in', p.is_all_in,
        'total_bet', p.total_bet,
        'round_bet', p.round_bet,
        'last_action', p.last_action,
        'acted_in_phase', p.acted_in_phase,
        'player_status', p.player_status
      ) order by p.is_spectator asc, p.seat_order asc nulls last), '[]'::jsonb)
      from public.poker_players p
      join public.users u on u.uid = p.user_id
      where p.table_id = p_table_id and p.left_at is null
    ),
    'hands', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'user_id', h.user_id,
        'cards', case
          when coalesce(active_round.round_phase, '') in ('showdown', 'completed') then h.cards
          when h.user_id = current_uid then (
            array(
              select case when idx <= deal_visible then h.cards[idx] else 'XX' end
              from generate_subscripts(h.cards, 1) as idx
            )
          )
          else (
            array(
              select 'XX'
              from generate_subscripts(h.cards, 1)
            )
          )
        end,
        'hand_rank', h.hand_rank,
        'hand_name', h.hand_name,
        'hand_score', h.hand_score,
        'is_winner', h.is_winner,
        'revealed_at', h.revealed_at
      ) order by p.seat_order asc nulls last), '[]'::jsonb)
      from public.poker_hands h
      left join public.poker_players p on p.table_id = h.table_id and p.user_id = h.user_id
      where h.table_id = p_table_id
        and active_round.round_id is not null
        and h.round_id = active_round.round_id
    ),
    'recent_results', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb)
      from (
        select pr.* from public.poker_results pr where pr.table_id = p_table_id order by pr.created_at desc limit 30
      ) r
    ),
    'chat', (
      select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at asc), '[]'::jsonb)
      from (
        select * from public.poker_chat_messages where table_id = p_table_id order by created_at desc limit 80
      ) m
    )
  );
end;
$$;

create or replace function public.poker_start_round(p_table_id uuid)
returns public.poker_rounds
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target_table public.poker_tables%rowtype;
  round_record public.poker_rounds%rowtype;
  player_record public.poker_players%rowtype;
  deck text[];
  seat_players uuid[] := '{}'::uuid[];
  cursor integer := 1;
  dealer_uid uuid;
  community text[];
begin
  select * into target_table
  from public.poker_tables t
  where t.table_id = p_table_id
  for update;

  if not found then
    raise exception 'Poker table not found' using errcode = 'P0002';
  end if;

  seat_players := array(
    select p.user_id
    from public.poker_players p
    where p.table_id = p_table_id
      and p.left_at is null
      and p.is_spectator = false
      and p.is_ready = true
    order by p.seat_order asc
  );

  if array_length(seat_players, 1) < 2 then
    raise exception 'Not enough ready players' using errcode = '22023';
  end if;

  dealer_uid := seat_players[1];
  deck := public.poker_shuffle_deck();
  community := deck[array_length(seat_players, 1) * 3 + 1:array_length(seat_players, 1) * 3 + 2];

  insert into public.poker_rounds (
    table_id, status, round_phase, phase_ends_at, deck_hash, deck_cards, cards_dealt, deal_cursor,
    started_at, showdown_at, completed_at, winner_ids, pot_amount, current_bet, min_raise,
    dealer_user_id, action_count, last_action_at, community_cards, community_revealed
  )
  values (
    p_table_id, 'playing', 'round1', now() + interval '30 seconds',
    encode(digest(array_to_string(deck, ','), 'sha256'), 'hex'),
    deck,
    3,
    array_length(seat_players, 1) * 3 + 3,
    now(), null, null, '{}'::uuid[], 0, 0, greatest(1, target_table.min_bet),
    dealer_uid, 0, null, community, 0
  )
  returning * into round_record;

  for player_record in
    select *
    from public.poker_players p
    where p.table_id = p_table_id
      and p.left_at is null
      and p.is_spectator = false
      and p.is_ready = true
    order by p.seat_order asc
    for update
  loop
    insert into public.poker_hands (round_id, table_id, user_id, cards)
    values (round_record.round_id, p_table_id, player_record.user_id, deck[cursor:cursor + 2]);

    update public.poker_players
    set has_folded = false,
        is_all_in = false,
        total_bet = 0,
        round_bet = 0,
        last_action = null,
        acted_in_phase = false,
        action_at = null,
        player_status = 'thinking',
        updated_at = now()
    where table_id = p_table_id
      and user_id = player_record.user_id;

    cursor := cursor + 3;
  end loop;

  update public.poker_tables
  set status = 'playing',
      active_round_id = round_record.round_id,
      countdown_ends_at = round_record.phase_ends_at,
      last_activity_at = now(),
      updated_at = now()
  where table_id = p_table_id;

  return round_record;
end;
$$;

create or replace function public.poker_prepare_next_phase(p_round_id uuid)
returns public.poker_rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  round_record public.poker_rounds%rowtype;
begin
  select * into round_record
  from public.poker_rounds r
  where r.round_id = p_round_id
  for update;

  if not found then
    raise exception 'Round not found' using errcode = 'P0002';
  end if;

  if round_record.round_phase = 'round1' then
    update public.poker_rounds
    set round_phase = 'round2',
        community_revealed = 1,
        phase_ends_at = now() + interval '30 seconds',
        current_bet = 0,
        action_count = 0
    where round_id = p_round_id
    returning * into round_record;
  elsif round_record.round_phase = 'round2' then
    update public.poker_rounds
    set round_phase = 'round3',
        community_revealed = 2,
        phase_ends_at = now() + interval '30 seconds',
        current_bet = 0,
        action_count = 0
    where round_id = p_round_id
    returning * into round_record;
  else
    update public.poker_rounds
    set round_phase = 'showdown',
        community_revealed = 2,
        phase_ends_at = now()
    where round_id = p_round_id
    returning * into round_record;
  end if;

  update public.poker_players
  set round_bet = 0,
      acted_in_phase = false,
      player_status = case when has_folded then 'folded' when is_all_in then 'all-in' else 'thinking' end,
      updated_at = now()
  where table_id = round_record.table_id
    and left_at is null
    and is_spectator = false;

  update public.poker_tables
  set countdown_ends_at = round_record.phase_ends_at,
      updated_at = now()
  where table_id = round_record.table_id;

  return round_record;
end;
$$;

create or replace function public.poker_showdown_round(p_round_id uuid)
returns public.poker_rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  round_record public.poker_rounds%rowtype;
  hand_record public.poker_hands%rowtype;
  eval_record record;
  top_score bigint;
  alive_count integer;
  combined_cards text[];
begin
  select * into round_record
  from public.poker_rounds r
  where r.round_id = p_round_id
  for update;

  if not found then
    raise exception 'Round not found' using errcode = 'P0002';
  end if;

  update public.poker_rounds
  set round_phase = 'showdown',
      community_revealed = 2
  where round_id = p_round_id
  returning * into round_record;

  select count(*) into alive_count
  from public.poker_players p
  where p.table_id = round_record.table_id
    and p.left_at is null
    and p.is_spectator = false
    and p.has_folded = false;

  if alive_count <= 1 then
    update public.poker_hands h
    set is_winner = (
      h.user_id = (
        select p.user_id
        from public.poker_players p
        where p.table_id = round_record.table_id
          and p.left_at is null
          and p.is_spectator = false
          and p.has_folded = false
        limit 1
      )
    ),
    revealed_at = now()
    where h.round_id = p_round_id;
  else
    for hand_record in
      select h.*
      from public.poker_hands h
      join public.poker_players p
        on p.table_id = h.table_id
       and p.user_id = h.user_id
      where h.round_id = p_round_id
        and p.has_folded = false
      for update
    loop
      if array_length(hand_record.cards, 1) = 5 then
        combined_cards := hand_record.cards;
      elsif array_length(hand_record.cards, 1) = 3 and array_length(round_record.community_cards, 1) = 2 then
        combined_cards := hand_record.cards || round_record.community_cards;
      elsif array_length(hand_record.cards, 1) = 4 and array_length(round_record.deck_cards, 1) >= 5 then
        combined_cards := hand_record.cards || round_record.deck_cards[5:5];
      elsif array_length(hand_record.cards, 1) >= 5 then
        combined_cards := hand_record.cards[1:5];
      elsif array_length(hand_record.cards, 1) = 3 and array_length(round_record.deck_cards, 1) >= 5 then
        combined_cards := hand_record.cards || round_record.deck_cards[4:5];
      else
        combined_cards := null;
      end if;

      if combined_cards is null or array_length(combined_cards, 1) <> 5 then
        update public.poker_hands
        set hand_rank = 9,
            hand_name = public.poker_hand_name(9),
            hand_score = 0,
            score_vector = array[0],
            revealed_at = now()
        where hand_id = hand_record.hand_id;
        continue;
      end if;

      select * into eval_record from public.poker_evaluate_hand(combined_cards) limit 1;

      update public.poker_hands
      set hand_rank = eval_record.hand_rank,
          hand_name = eval_record.hand_name,
          hand_score = eval_record.hand_score,
          score_vector = eval_record.tie_break,
          revealed_at = now()
      where hand_id = hand_record.hand_id;
    end loop;

    select max(h.hand_score)
    into top_score
    from public.poker_hands h
    join public.poker_players p
      on p.table_id = h.table_id
     and p.user_id = h.user_id
    where h.round_id = p_round_id
      and p.has_folded = false;

    update public.poker_hands h
    set is_winner = (h.hand_score = top_score)
    from public.poker_players p
    where h.round_id = p_round_id
      and p.table_id = h.table_id
      and p.user_id = h.user_id
      and p.has_folded = false;
  end if;

  delete from public.poker_results where round_id = p_round_id;

  insert into public.poker_results (
    round_id, table_id, user_id, is_winner, rank_position, payout_amount, hand_name, hand_rank, hand_score
  )
  select
    h.round_id,
    h.table_id,
    h.user_id,
    h.is_winner,
    dense_rank() over (order by coalesce(h.hand_score, 0) desc),
    0,
    h.hand_name,
    h.hand_rank,
    h.hand_score
  from public.poker_hands h
  join public.poker_players p
    on p.table_id = h.table_id
   and p.user_id = h.user_id
  where h.round_id = p_round_id
    and p.has_folded = false;

  update public.poker_rounds
  set round_phase = 'showdown',
      status = 'showdown',
      showdown_at = now(),
      phase_ends_at = now()
  where round_id = p_round_id;

  round_record := public.poker_settle_round_points(p_round_id);
  return round_record;
end;
$$;

create or replace function public.poker_get_table_state(p_session_token text, p_table_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  target_table public.poker_tables%rowtype;
  active_round public.poker_rounds%rowtype;
  reveal_count integer := 0;
begin
  select * into target_table from public.poker_tables t where t.table_id = p_table_id;
  if not found then
    raise exception 'Poker table not found' using errcode = 'P0002';
  end if;

  select * into active_round from public.poker_rounds r where r.round_id = target_table.active_round_id;
  reveal_count := greatest(0, least(2, coalesce(active_round.community_revealed, 0)));

  return jsonb_build_object(
    'table', to_jsonb(target_table),
    'round', (
      case
        when active_round.round_id is null then null
        else (
          (to_jsonb(active_round) - 'community_cards')
          || jsonb_build_object(
            'community_cards',
            array[
              case when reveal_count >= 1 then active_round.community_cards[1] else 'XX' end,
              case when reveal_count >= 2 then active_round.community_cards[2] else 'XX' end
            ],
            'community_revealed',
            reveal_count
          )
        )
      end
    ),
    'players', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'user_id', p.user_id,
        'seat_order', p.seat_order,
        'is_bot', p.is_bot,
        'is_ready', p.is_ready,
        'is_spectator', p.is_spectator,
        'current_bet', p.current_bet,
        'left_at', p.left_at,
        'last_heartbeat_at', p.last_heartbeat_at,
        'display_name', u.display_name,
        'avatar_url', u.avatar_url,
        'is_me', p.user_id = current_uid,
        'has_folded', p.has_folded,
        'is_all_in', p.is_all_in,
        'total_bet', p.total_bet,
        'round_bet', p.round_bet,
        'last_action', p.last_action,
        'acted_in_phase', p.acted_in_phase,
        'player_status', p.player_status
      ) order by p.is_spectator asc, p.seat_order asc nulls last), '[]'::jsonb)
      from public.poker_players p
      join public.users u on u.uid = p.user_id
      where p.table_id = p_table_id and p.left_at is null
    ),
    'hands', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'user_id', h.user_id,
        'cards', case
          when coalesce(active_round.round_phase, '') in ('showdown', 'completed') then h.cards
          when h.user_id = current_uid then h.cards
          else array['XX','XX','XX']::text[]
        end,
        'hand_rank', h.hand_rank,
        'hand_name', h.hand_name,
        'hand_score', h.hand_score,
        'is_winner', h.is_winner,
        'revealed_at', h.revealed_at
      ) order by p.seat_order asc nulls last), '[]'::jsonb)
      from public.poker_hands h
      left join public.poker_players p on p.table_id = h.table_id and p.user_id = h.user_id
      where h.table_id = p_table_id
        and active_round.round_id is not null
        and h.round_id = active_round.round_id
    ),
    'recent_results', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb)
      from (
        select pr.* from public.poker_results pr where pr.table_id = p_table_id order by pr.created_at desc limit 30
      ) r
    ),
    'chat', (
      select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at asc), '[]'::jsonb)
      from (
        select * from public.poker_chat_messages where table_id = p_table_id order by created_at desc limit 80
      ) m
    )
  );
end;
$$;

revoke all on function public.poker_take_action(text, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.poker_take_action(text, uuid, text, integer) to anon, authenticated;

revoke all on function public.poker_add_npcs(text, uuid, integer) from public, anon, authenticated;
grant execute on function public.poker_add_npcs(text, uuid, integer) to anon, authenticated;

update public.poker_tables t
set active_round_id = null,
    countdown_ends_at = null,
    updated_at = now()
where t.status = 'waiting'
  and t.active_round_id is not null
  and exists (
    select 1
    from public.poker_rounds r
    where r.round_id = t.active_round_id
      and r.status in ('completed', 'cancelled')
  );

notify pgrst, 'reload schema';

create or replace function public.poker_set_bet(p_session_token text, p_table_id uuid, p_bet_amount integer)
returns public.poker_players
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
  target_table public.poker_tables%rowtype;
  player_record public.poker_players%rowtype;
begin
  select * into profile from public.users u where u.uid = current_uid;
  if not found or profile.is_banned then
    raise exception 'Account cannot play poker' using errcode = '42501';
  end if;

  select * into target_table from public.poker_tables t where t.table_id = p_table_id for update;
  if not found then
    raise exception 'Poker table not found' using errcode = 'P0002';
  end if;

  if target_table.status not in ('waiting', 'countdown', 'completed') then
    raise exception 'Round already in progress' using errcode = '22023';
  end if;

  if p_bet_amount < target_table.min_bet or p_bet_amount > target_table.max_bet then
    raise exception 'Bet out of range' using errcode = '22023';
  end if;

  if profile.points - profile.locked_points < p_bet_amount then
    raise exception 'Not enough available points' using errcode = '22023';
  end if;

  update public.poker_players
  set current_bet = p_bet_amount,
      is_ready = false,
      updated_at = now()
  where table_id = p_table_id
    and user_id = current_uid
    and left_at is null
    and is_spectator = false
  returning * into player_record;

  if not found then
    raise exception 'Player seat not found' using errcode = 'P0002';
  end if;

  update public.poker_tables
  set last_activity_at = now(),
      updated_at = now()
  where table_id = p_table_id;

  return player_record;
end;
$$;

create or replace function public.poker_set_ready(
  p_session_token text,
  p_table_id uuid,
  p_is_ready boolean default true
)
returns public.poker_players
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
  target_table public.poker_tables%rowtype;
  player_record public.poker_players%rowtype;
begin
  select * into profile from public.users where uid = current_uid;
  if not found or profile.is_banned then
    raise exception 'Account cannot play poker' using errcode = '42501';
  end if;

  select * into target_table from public.poker_tables where table_id = p_table_id for update;
  if not found then
    raise exception 'Poker table not found' using errcode = 'P0002';
  end if;

  if target_table.status not in ('waiting', 'countdown', 'completed') then
    raise exception 'Cannot change ready state while hand is running' using errcode = '22023';
  end if;

  update public.poker_players
  set is_ready = coalesce(p_is_ready, true),
      updated_at = now(),
      last_heartbeat_at = now()
  where table_id = p_table_id
    and user_id = current_uid
    and left_at is null
    and is_spectator = false
  returning * into player_record;

  if not found then
    raise exception 'Player seat not found' using errcode = 'P0002';
  end if;

  if player_record.current_bet < target_table.min_bet or player_record.current_bet > target_table.max_bet then
    raise exception 'Bet must be set before ready' using errcode = '22023';
  end if;

  if coalesce(p_is_ready, true) and profile.points - profile.locked_points < player_record.current_bet then
    raise exception 'Not enough available points for ready bet' using errcode = '22023';
  end if;

  update public.poker_tables
  set last_activity_at = now(),
      updated_at = now()
  where table_id = p_table_id;

  return player_record;
end;
$$;

notify pgrst, 'reload schema';



-- FINAL OVERRIDES (ALL-IN side-pot + lifecycle + NPC AI)
-- ======================================

create table if not exists public.poker_side_pots (
  side_pot_id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.poker_rounds(round_id) on delete cascade,
  table_id uuid not null references public.poker_tables(table_id) on delete cascade,
  pot_index integer not null check (pot_index >= 1),
  pot_amount integer not null check (pot_amount >= 0),
  eligible_user_ids uuid[] not null default '{}'::uuid[],
  winner_ids uuid[] not null default '{}'::uuid[],
  payout_map jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (round_id, pot_index)
);

create index if not exists poker_side_pots_round_idx on public.poker_side_pots (round_id, pot_index);

alter table public.poker_players add column if not exists npc_personality text;
alter table public.poker_players drop constraint if exists poker_players_npc_personality_check;
alter table public.poker_players
  add constraint poker_players_npc_personality_check
  check (
    npc_personality is null
    or npc_personality in ('conservative', 'aggressive', 'random', 'smart')
  );

create or replace function public.poker_start_round(p_table_id uuid)
returns public.poker_rounds
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target_table public.poker_tables%rowtype;
  round_record public.poker_rounds%rowtype;
  player_record public.poker_players%rowtype;
  deck text[];
  seat_players uuid[] := '{}'::uuid[];
  cursor integer := 1;
  dealer_uid uuid;
  community text[];
begin
  select * into target_table
  from public.poker_tables t
  where t.table_id = p_table_id
  for update;

  if not found then
    raise exception 'Poker table not found' using errcode = 'P0002';
  end if;

  seat_players := array(
    select p.user_id
    from public.poker_players p
    where p.table_id = p_table_id
      and p.left_at is null
      and p.is_spectator = false
      and p.is_ready = true
    order by p.seat_order asc
  );

  if array_length(seat_players, 1) < 2 then
    raise exception 'Not enough ready players' using errcode = '22023';
  end if;

  dealer_uid := seat_players[1];
  deck := public.poker_shuffle_deck();
  community := deck[array_length(seat_players, 1) * 3 + 1:array_length(seat_players, 1) * 3 + 2];

  insert into public.poker_rounds (
    table_id, status, round_phase, phase_ends_at, deck_hash, deck_cards, cards_dealt, deal_cursor,
    started_at, showdown_at, completed_at, winner_ids, pot_amount, current_bet, min_raise,
    dealer_user_id, action_count, last_action_at, community_cards, community_revealed
  )
  values (
    p_table_id, 'playing', 'round1', now() + interval '30 seconds',
    encode(digest(array_to_string(deck, ','), 'sha256'), 'hex'),
    deck,
    3,
    array_length(seat_players, 1) * 3 + 3,
    now(), null, null, '{}'::uuid[], 0, 0, greatest(1, target_table.min_bet),
    dealer_uid, 0, null, community, 0
  )
  returning * into round_record;

  delete from public.poker_side_pots where round_id = round_record.round_id;

  for player_record in
    select *
    from public.poker_players p
    where p.table_id = p_table_id
      and p.left_at is null
      and p.is_spectator = false
      and p.is_ready = true
    order by p.seat_order asc
    for update
  loop
    insert into public.poker_hands (round_id, table_id, user_id, cards)
    values (round_record.round_id, p_table_id, player_record.user_id, deck[cursor:cursor + 2]);

    update public.poker_players
    set has_folded = false,
        is_all_in = false,
        total_bet = 0,
        round_bet = 0,
        last_action = null,
        acted_in_phase = false,
        action_at = null,
        player_status = 'thinking',
        npc_personality = case
          when is_bot then (
            array['conservative', 'aggressive', 'random', 'smart']
          )[1 + floor(random() * 4)::integer]
          else null
        end,
        updated_at = now()
    where table_id = p_table_id
      and user_id = player_record.user_id;

    cursor := cursor + 3;
  end loop;

  update public.poker_tables
  set status = 'playing',
      active_round_id = round_record.round_id,
      countdown_ends_at = round_record.phase_ends_at,
      last_activity_at = now(),
      updated_at = now()
  where table_id = p_table_id;

  return round_record;
end;
$$;

create or replace function public.poker_take_action(
  p_session_token text,
  p_table_id uuid,
  p_action text,
  p_raise_to integer default null
)
returns public.poker_players
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  action_name text := lower(trim(coalesce(p_action, '')));
  round_record public.poker_rounds%rowtype;
  player_record public.poker_players%rowtype;
  target_table public.poker_tables%rowtype;
  locked_user public.users%rowtype;
  participant_exists boolean := false;
  to_call integer := 0;
  available integer := 0;
  lock_amount integer := 0;
  previous_bet integer := 0;
  new_round_bet integer := 0;
begin
  if action_name = 'allin' then
    action_name := 'all-in';
  end if;

  if action_name not in ('fold', 'check', 'call', 'raise', 'all-in') then
    raise exception 'Invalid action' using errcode = '22023';
  end if;

  select *
  into target_table
  from public.poker_tables t
  where t.table_id = p_table_id
  for update;

  if not found then
    raise exception 'Poker table not found' using errcode = 'P0002';
  end if;

  if target_table.status <> 'playing' or target_table.active_round_id is null then
    raise exception 'Table is not in playing state' using errcode = '22023';
  end if;

  select *
  into round_record
  from public.poker_rounds r
  where r.round_id = target_table.active_round_id
  for update;

  if not found or round_record.status <> 'playing' then
    raise exception 'Round is not available for actions' using errcode = '22023';
  end if;

  if round_record.round_phase not in ('round1', 'round2', 'round3') then
    raise exception 'Round phase does not accept actions' using errcode = '22023';
  end if;

  select *
  into player_record
  from public.poker_players p
  where p.table_id = p_table_id
    and p.user_id = current_uid
    and p.left_at is null
    and p.is_spectator = false
  for update;

  if not found then
    raise exception 'Player seat not found' using errcode = 'P0002';
  end if;

  select exists(
    select 1
    from public.poker_hands h
    where h.round_id = round_record.round_id
      and h.user_id = current_uid
  ) into participant_exists;

  if not participant_exists then
    raise exception 'Player is not part of active round' using errcode = '22023';
  end if;

  if player_record.has_folded then
    raise exception 'Player already folded' using errcode = '22023';
  end if;

  if player_record.is_all_in then
    raise exception 'Player already all-in' using errcode = '22023';
  end if;

  if player_record.acted_in_phase then
    raise exception 'Player already acted in this phase' using errcode = '22023';
  end if;

  select * into locked_user from public.users u where u.uid = current_uid for update;
  if locked_user.is_banned then
    raise exception 'Account is banned from poker' using errcode = '42501';
  end if;

  available := greatest(0, locked_user.points - locked_user.locked_points);
  previous_bet := coalesce(player_record.round_bet, 0);
  to_call := greatest(0, coalesce(round_record.current_bet, 0) - previous_bet);

  if action_name = 'fold' then
    update public.poker_players
    set has_folded = true,
        acted_in_phase = true,
        last_action = 'folded',
        action_at = now(),
        player_status = 'folded',
        updated_at = now()
    where table_id = p_table_id and user_id = current_uid
    returning * into player_record;

    update public.poker_rounds
    set action_count = action_count + 1,
        last_action_at = now()
    where round_id = round_record.round_id;

  elsif action_name = 'check' then
    if to_call > 0 then
      raise exception 'Check is not valid' using errcode = '22023';
    end if;

    update public.poker_players
    set acted_in_phase = true,
        last_action = 'check',
        action_at = now(),
        player_status = 'ready',
        updated_at = now()
    where table_id = p_table_id and user_id = current_uid
    returning * into player_record;

    update public.poker_rounds
    set action_count = action_count + 1,
        last_action_at = now()
    where round_id = round_record.round_id;

  elsif action_name = 'call' then
    if to_call <= 0 then
      raise exception 'Call is not valid' using errcode = '22023';
    end if;

    lock_amount := least(available, to_call);
    if lock_amount <= 0 then
      raise exception 'Not enough points to call' using errcode = '22023';
    end if;

    update public.users
    set locked_points = public.users.locked_points + lock_amount,
        points_updated_at = now()
    where uid = current_uid
    returning * into locked_user;

    new_round_bet := previous_bet + lock_amount;

    update public.poker_players
    set round_bet = new_round_bet,
        total_bet = total_bet + lock_amount,
        acted_in_phase = true,
        is_all_in = (lock_amount < to_call),
        last_action = case when lock_amount < to_call then 'all-in' else 'call' end,
        action_at = now(),
        player_status = case when lock_amount < to_call then 'all-in' else 'ready' end,
        updated_at = now()
    where table_id = p_table_id and user_id = current_uid
    returning * into player_record;

    update public.poker_bets
    set bet_amount = bet_amount + lock_amount
    where round_id = round_record.round_id and user_id = current_uid;

    if not found then
      insert into public.poker_bets (round_id, table_id, user_id, bet_amount, status)
      values (round_record.round_id, p_table_id, current_uid, lock_amount, 'locked');
    end if;

    update public.poker_rounds
    set pot_amount = pot_amount + lock_amount,
        action_count = action_count + 1,
        last_action_at = now()
    where round_id = round_record.round_id;

  elsif action_name = 'all-in' then
    lock_amount := available;
    if lock_amount <= 0 then
      raise exception 'Not enough points to all-in' using errcode = '22023';
    end if;

    update public.users
    set locked_points = public.users.locked_points + lock_amount,
        points_updated_at = now()
    where uid = current_uid
    returning * into locked_user;

    new_round_bet := previous_bet + lock_amount;

    update public.poker_players
    set round_bet = new_round_bet,
        total_bet = total_bet + lock_amount,
        acted_in_phase = true,
        is_all_in = true,
        last_action = 'all-in',
        action_at = now(),
        player_status = 'all-in',
        updated_at = now()
    where table_id = p_table_id and user_id = current_uid
    returning * into player_record;

    update public.poker_bets
    set bet_amount = bet_amount + lock_amount
    where round_id = round_record.round_id and user_id = current_uid;

    if not found then
      insert into public.poker_bets (round_id, table_id, user_id, bet_amount, status)
      values (round_record.round_id, p_table_id, current_uid, lock_amount, 'locked');
    end if;

    if new_round_bet > round_record.current_bet then
      update public.poker_rounds
      set current_bet = new_round_bet,
          min_raise = greatest(1, new_round_bet - round_record.current_bet),
          pot_amount = pot_amount + lock_amount,
          action_count = action_count + 1,
          last_action_at = now()
      where round_id = round_record.round_id;

      update public.poker_players
      set acted_in_phase = false,
          player_status = case when has_folded then 'folded' when is_all_in then 'all-in' else 'thinking' end
      where table_id = p_table_id
        and left_at is null
        and is_spectator = false
        and has_folded = false
        and is_all_in = false
        and user_id <> current_uid;

      update public.poker_players
      set acted_in_phase = true
      where table_id = p_table_id and user_id = current_uid;
    else
      update public.poker_rounds
      set pot_amount = pot_amount + lock_amount,
          action_count = action_count + 1,
          last_action_at = now()
      where round_id = round_record.round_id;
    end if;

  else
    if p_raise_to is null or p_raise_to <= round_record.current_bet then
      raise exception 'Raise target must be greater than current bet' using errcode = '22023';
    end if;

    lock_amount := p_raise_to - previous_bet;
    if lock_amount <= to_call then
      raise exception 'Raise must be above call amount' using errcode = '22023';
    end if;

    if available < lock_amount then
      raise exception 'Not enough points to raise' using errcode = '22023';
    end if;

    update public.users
    set locked_points = public.users.locked_points + lock_amount,
        points_updated_at = now()
    where uid = current_uid
    returning * into locked_user;

    update public.poker_players
    set round_bet = p_raise_to,
        total_bet = total_bet + lock_amount,
        acted_in_phase = true,
        last_action = 'raise',
        action_at = now(),
        player_status = 'ready',
        updated_at = now()
    where table_id = p_table_id and user_id = current_uid
    returning * into player_record;

    update public.poker_bets
    set bet_amount = bet_amount + lock_amount
    where round_id = round_record.round_id and user_id = current_uid;

    if not found then
      insert into public.poker_bets (round_id, table_id, user_id, bet_amount, status)
      values (round_record.round_id, p_table_id, current_uid, lock_amount, 'locked');
    end if;

    update public.poker_rounds
    set current_bet = p_raise_to,
        min_raise = greatest(1, p_raise_to - round_record.current_bet),
        pot_amount = pot_amount + lock_amount,
        action_count = action_count + 1,
        last_action_at = now()
    where round_id = round_record.round_id;

    update public.poker_players
    set acted_in_phase = false,
        player_status = case when has_folded then 'folded' when is_all_in then 'all-in' else 'thinking' end
    where table_id = p_table_id
      and left_at is null
      and is_spectator = false
      and has_folded = false
      and is_all_in = false
      and user_id <> current_uid;

    update public.poker_players
    set acted_in_phase = true
    where table_id = p_table_id and user_id = current_uid;
  end if;

  update public.poker_tables
  set last_activity_at = now(),
      updated_at = now()
  where table_id = p_table_id;

  return player_record;
end;
$$;

create or replace function public.poker_settle_round_points(p_round_id uuid)
returns public.poker_rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  round_record public.poker_rounds%rowtype;
  bet_record record;
  winner_record record;
  locked_user public.users%rowtype;
  winning_ids uuid[] := '{}'::uuid[];
  contribution_levels integer[] := '{}'::integer[];
  current_level integer;
  previous_level integer := 0;
  contributor_count integer := 0;
  pot_amount integer := 0;
  pot_index integer := 0;
  winner_count integer := 0;
  winner_rank integer := 0;
  base_payout integer := 0;
  remainder integer := 0;
  payout_share integer := 0;
  top_score bigint := null;
  eligible_ids uuid[] := '{}'::uuid[];
  winner_ids uuid[] := '{}'::uuid[];
  payout_map jsonb := '{}'::jsonb;
  contribution integer := 0;
  total_payout integer := 0;
  user_delta integer := 0;
begin
  select * into round_record
  from public.poker_rounds r
  where r.round_id = p_round_id
  for update;

  if not found then
    raise exception 'Round not found' using errcode = 'P0002';
  end if;

  if round_record.status = 'completed' then
    return round_record;
  end if;

  create temporary table if not exists tmp_poker_payouts (
    user_id uuid primary key,
    contribution integer not null default 0,
    payout integer not null default 0
  ) on commit drop;

  truncate tmp_poker_payouts;

  insert into tmp_poker_payouts (user_id, contribution, payout)
  select
    b.user_id,
    greatest(0, b.bet_amount),
    0
  from public.poker_bets b
  where b.round_id = p_round_id;

  contribution_levels := array(
    select distinct greatest(0, b.bet_amount)
    from public.poker_bets b
    where b.round_id = p_round_id
      and b.bet_amount > 0
    order by 1 asc
  );

  delete from public.poker_side_pots where round_id = p_round_id;

  foreach current_level in array contribution_levels loop
    contributor_count := (
      select count(*)
      from public.poker_bets b
      where b.round_id = p_round_id
        and b.bet_amount >= current_level
    );

    pot_amount := greatest(0, (current_level - previous_level) * contributor_count);
    previous_level := current_level;

    if pot_amount <= 0 then
      continue;
    end if;

    pot_index := pot_index + 1;

    eligible_ids := array(
      select h.user_id
      from public.poker_hands h
      join public.poker_players p
        on p.table_id = h.table_id
       and p.user_id = h.user_id
      join public.poker_bets b
        on b.round_id = h.round_id
       and b.user_id = h.user_id
      where h.round_id = p_round_id
        and p.has_folded = false
        and b.bet_amount >= current_level
      order by p.seat_order asc
    );

    if coalesce(array_length(eligible_ids, 1), 0) = 0 then
      insert into public.poker_side_pots (round_id, table_id, pot_index, pot_amount, eligible_user_ids, winner_ids, payout_map)
      values (p_round_id, round_record.table_id, pot_index, pot_amount, '{}'::uuid[], '{}'::uuid[], '{}'::jsonb);
      continue;
    end if;

    select max(h.hand_score)
    into top_score
    from public.poker_hands h
    where h.round_id = p_round_id
      and h.user_id = any(eligible_ids);

    winner_ids := array(
      select h.user_id
      from public.poker_hands h
      join public.poker_players p
        on p.table_id = h.table_id
       and p.user_id = h.user_id
      where h.round_id = p_round_id
        and h.user_id = any(eligible_ids)
        and h.hand_score = top_score
      order by p.seat_order asc
    );

    winner_count := coalesce(array_length(winner_ids, 1), 0);
    base_payout := case when winner_count > 0 then pot_amount / winner_count else 0 end;
    remainder := case when winner_count > 0 then pot_amount % winner_count else 0 end;
    winner_rank := 0;
    payout_map := '{}'::jsonb;

    for winner_record in
      select w.user_id
      from unnest(winner_ids) as w(user_id)
    loop
      winner_rank := winner_rank + 1;
      payout_share := base_payout + case when winner_rank <= remainder then 1 else 0 end;

      update tmp_poker_payouts
      set payout = tmp_poker_payouts.payout + payout_share
      where user_id = winner_record.user_id;

      payout_map := jsonb_set(
        payout_map,
        array[winner_record.user_id::text],
        to_jsonb(payout_share),
        true
      );
    end loop;

    insert into public.poker_side_pots (
      round_id,
      table_id,
      pot_index,
      pot_amount,
      eligible_user_ids,
      winner_ids,
      payout_map
    )
    values (
      p_round_id,
      round_record.table_id,
      pot_index,
      pot_amount,
      coalesce(eligible_ids, '{}'::uuid[]),
      coalesce(winner_ids, '{}'::uuid[]),
      payout_map
    );
  end loop;

  delete from public.poker_results where round_id = p_round_id;

  insert into public.poker_results (
    round_id, table_id, user_id, is_winner, rank_position, payout_amount, hand_name, hand_rank, hand_score
  )
  select
    h.round_id,
    h.table_id,
    h.user_id,
    h.is_winner,
    dense_rank() over (order by coalesce(h.hand_score, 0) desc),
    0,
    h.hand_name,
    h.hand_rank,
    h.hand_score
  from public.poker_hands h
  join public.poker_players p
    on p.table_id = h.table_id
   and p.user_id = h.user_id
  where h.round_id = p_round_id
    and p.has_folded = false;

  update public.poker_results pr
  set payout_amount = coalesce(tp.payout, 0)
  from tmp_poker_payouts tp
  where pr.round_id = p_round_id
    and pr.user_id = tp.user_id;

  winning_ids := array(
    select tp.user_id
    from tmp_poker_payouts tp
    where tp.payout = (select max(tp2.payout) from tmp_poker_payouts tp2)
      and tp.payout > 0
    order by tp.user_id
  );

  for bet_record in
    select
      tp.user_id,
      tp.contribution,
      tp.payout
    from tmp_poker_payouts tp
    for update
  loop
    contribution := greatest(0, bet_record.contribution);
    total_payout := greatest(0, bet_record.payout);
    user_delta := total_payout - contribution;

    select * into locked_user
    from public.users u
    where u.uid = bet_record.user_id
    for update;

    update public.users
    set points = public.users.points + user_delta,
        locked_points = greatest(0, public.users.locked_points - contribution),
        total_bets = total_bets + case when contribution > 0 then 1 else 0 end,
        total_wins = total_wins + case when user_delta > 0 then 1 else 0 end,
        total_losses = total_losses + case when user_delta < 0 then 1 else 0 end,
        total_points_won = total_points_won + greatest(user_delta, 0),
        total_points_lost = total_points_lost + greatest(-user_delta, 0),
        points_updated_at = now()
    where uid = bet_record.user_id
    returning * into locked_user;

    insert into public.points_transactions (
      user_id, type, amount, points_before, points_after, locked_before, locked_after, note
    )
    values (
      bet_record.user_id,
      case when user_delta >= 0 then 'poker_bet_win' else 'poker_bet_loss' end,
      user_delta,
      locked_user.points - user_delta,
      locked_user.points,
      locked_user.locked_points + contribution,
      locked_user.locked_points,
      'poker side-pot settle round: ' || p_round_id::text
    );

    insert into public.poker_player_stats (user_id, rounds_played, rounds_won, points_won, points_lost, updated_at)
    values (
      bet_record.user_id,
      1,
      case when user_delta > 0 then 1 else 0 end,
      greatest(user_delta, 0),
      greatest(-user_delta, 0),
      now()
    )
    on conflict (user_id) do update
      set rounds_played = public.poker_player_stats.rounds_played + excluded.rounds_played,
          rounds_won = public.poker_player_stats.rounds_won + excluded.rounds_won,
          points_won = public.poker_player_stats.points_won + excluded.points_won,
          points_lost = public.poker_player_stats.points_lost + excluded.points_lost,
          updated_at = now();

    update public.poker_bets
    set status = 'settled',
        settled_at = now()
    where round_id = p_round_id
      and user_id = bet_record.user_id;
  end loop;

  update public.poker_rounds r
  set status = 'completed',
      round_phase = 'completed',
      winner_ids = coalesce(winning_ids, '{}'::uuid[]),
      completed_at = now(),
      phase_ends_at = now(),
      pot_amount = coalesce((select sum(b.bet_amount) from public.poker_bets b where b.round_id = p_round_id), r.pot_amount)
  where round_id = p_round_id
  returning * into round_record;

  update public.poker_tables
  set status = 'completed',
      countdown_ends_at = now() + interval '4 seconds',
      last_activity_at = now(),
      updated_at = now()
  where table_id = round_record.table_id;

  update public.poker_players
  set player_status = case when has_folded then 'folded' when is_all_in then 'all-in' else 'ready' end,
      is_ready = case when is_bot then true else false end,
      updated_at = now()
  where table_id = round_record.table_id
    and left_at is null
    and is_spectator = false;

  return round_record;
end;
$$;

create or replace function public.poker_bot_decide_action(
  p_round_id uuid,
  p_table_id uuid,
  p_user_id uuid
)
returns table (
  action text,
  raise_to integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  round_record public.poker_rounds%rowtype;
  table_record public.poker_tables%rowtype;
  player_record public.poker_players%rowtype;
  user_record public.users%rowtype;
  hand_cards text[];
  eval_record record;
  hand_rank smallint := 9;
  personality text := 'smart';
  to_call integer := 0;
  available integer := 0;
  step_raise integer := 0;
  target_raise integer := 0;
  max_total_bet integer := 0;
  raise_room integer := 0;
  risk_mult numeric := 1.0;
  bluff_chance numeric := 0.0;
begin
  select * into round_record from public.poker_rounds r where r.round_id = p_round_id;
  select * into table_record from public.poker_tables t where t.table_id = p_table_id;
  select * into player_record
  from public.poker_players p
  where p.table_id = p_table_id
    and p.user_id = p_user_id
    and p.left_at is null
    and p.is_spectator = false;
  select * into user_record from public.users u where u.uid = p_user_id;
  select h.cards into hand_cards from public.poker_hands h where h.round_id = p_round_id and h.user_id = p_user_id;

  if not found then
    return;
  end if;

  if round_record.status <> 'playing'
    or round_record.round_phase not in ('round1', 'round2', 'round3')
    or player_record.has_folded
    or player_record.is_all_in
    or player_record.acted_in_phase then
    return;
  end if;

  personality := coalesce(player_record.npc_personality, 'smart');
  if personality not in ('conservative', 'aggressive', 'random', 'smart') then
    personality := 'smart';
  end if;

  case personality
    when 'conservative' then
      risk_mult := 0.7;
      bluff_chance := 0.08;
    when 'aggressive' then
      risk_mult := 1.35;
      bluff_chance := 0.30;
    when 'random' then
      risk_mult := 1.0 + (random() * 0.9 - 0.45);
      bluff_chance := 0.22;
    else
      risk_mult := 1.0;
      bluff_chance := 0.16;
  end case;

  to_call := greatest(0, coalesce(round_record.current_bet, 0) - coalesce(player_record.round_bet, 0));
  available := greatest(0, user_record.points - user_record.locked_points);
  step_raise := greatest(1, coalesce(round_record.min_raise, 1), coalesce(table_record.min_bet, 1));
  max_total_bet := least(coalesce(player_record.round_bet, 0) + available, table_record.max_bet);
  raise_room := greatest(0, max_total_bet - coalesce(round_record.current_bet, 0));

  if hand_cards is not null and array_length(hand_cards, 1) = 3 and array_length(round_record.community_cards, 1) = 2 then
    select * into eval_record
    from public.poker_evaluate_hand(hand_cards || round_record.community_cards)
    limit 1;

    hand_rank := coalesce(eval_record.hand_rank, 9);
  end if;

  if available <= 0 then
    action := 'fold';
    raise_to := null;
    return next;
    return;
  end if;

  if hand_rank <= 2 and random() < least(0.96, 0.72 * risk_mult + 0.18) then
    action := 'all-in';
    raise_to := null;
    return next;
    return;
  end if;

  if hand_rank = 3 and to_call >= greatest(1, floor(available * (0.42 / greatest(0.65, risk_mult)))::integer) and random() < 0.64 then
    action := 'all-in';
    raise_to := null;
    return next;
    return;
  end if;

  if raise_room >= step_raise and (
    hand_rank <= 3
    or (hand_rank <= 5 and random() < (0.38 * risk_mult))
    or random() < bluff_chance
  ) then
    target_raise := coalesce(round_record.current_bet, 0) + greatest(step_raise, floor(available * (0.20 * risk_mult))::integer);
    target_raise := least(target_raise, max_total_bet);
    if target_raise > coalesce(round_record.current_bet, 0) then
      action := 'raise';
      raise_to := target_raise;
      return next;
      return;
    end if;
  end if;

  if to_call = 0 then
    action := 'check';
    raise_to := null;
    return next;
    return;
  end if;

  if to_call >= available then
    action := 'all-in';
    raise_to := null;
    return next;
    return;
  end if;

  if hand_rank <= 6 then
    if to_call <= greatest(1, floor(available * (0.68 * risk_mult))::integer) or random() < bluff_chance then
      action := 'call';
    else
      action := case when random() < (0.18 * risk_mult) then 'all-in' else 'fold' end;
    end if;
  elsif hand_rank = 7 then
    if to_call <= greatest(1, floor(available * (0.35 * risk_mult))::integer) or random() < (bluff_chance * 0.8) then
      action := 'call';
    else
      action := 'fold';
    end if;
  elsif hand_rank = 8 then
    if to_call <= greatest(1, floor(available * (0.16 * risk_mult))::integer) and random() < (0.28 + bluff_chance * 0.5) then
      action := 'call';
    else
      action := 'fold';
    end if;
  else
    if to_call <= greatest(1, floor(available * (0.10 * risk_mult))::integer) and random() < (0.12 + bluff_chance * 0.6) then
      action := 'call';
    else
      action := 'fold';
    end if;
  end if;

  raise_to := null;
  return next;
end;
$$;

create or replace function public.poker_tick_tables(p_session_token text)
returns table (
  table_id uuid,
  status text,
  active_round_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
  table_record public.poker_tables%rowtype;
  round_record public.poker_rounds%rowtype;
  npc_table_id uuid;
  ready_count integer;
  human_seated_count integer;
  active_seated_count integer;
  seated_count integer;
  bots_needed integer;
  alive_count integer;
  pending_action_count integer;
  unresolved_bet_count integer;
  bot_record record;
  bot_action text;
  bot_raise_to integer;
begin
  select * into profile from public.users u where u.uid = current_uid;
  if not found or profile.is_banned then
    raise exception 'Account cannot manage poker tick' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext('poker_tick_tables_v4'));

  update public.poker_players p
  set left_at = now(),
      is_ready = false,
      has_folded = true,
      player_status = 'folded',
      updated_at = now()
  where p.left_at is null
    and p.is_spectator = false
    and p.is_bot = false
    and p.last_heartbeat_at < now() - interval '10 seconds';

  update public.poker_players p
  set left_at = now(),
      is_ready = false,
      has_folded = true,
      is_all_in = false,
      player_status = 'folded',
      updated_at = now()
  from public.users u
  where p.user_id = u.uid
    and p.left_at is null
    and p.is_spectator = false
    and p.is_bot = true
    and greatest(0, u.points - u.locked_points) <= 0;

  select t.table_id
  into npc_table_id
  from public.poker_tables t
  where t.status <> 'closed'
    and t.is_private = false
    and t.name = 'NPC Arena'
  order by t.updated_at desc
  limit 1;

  if npc_table_id is null then
    insert into public.poker_tables as t (
      name, is_private, max_players, min_bet, max_bet, status, created_by, last_activity_at
    )
    values (
      'NPC Arena', false, 6, 10, 1000, 'waiting', current_uid, now()
    )
    returning t.table_id into npc_table_id;
  end if;

  for table_record in
    select *
    from public.poker_tables t
    where t.status <> 'closed'
    for update
  loop
    if table_record.status in ('waiting', 'countdown') then
      update public.poker_players p
      set is_ready = true,
          current_bet = greatest(1, table_record.min_bet),
          has_folded = false,
          is_all_in = false,
          total_bet = 0,
          round_bet = 0,
          last_action = null,
          acted_in_phase = false,
          player_status = 'ready',
          updated_at = now()
      where p.table_id = table_record.table_id
        and p.left_at is null
        and p.is_spectator = false
        and p.is_bot = true;

      select count(*) into human_seated_count
      from public.poker_players p
      where p.table_id = table_record.table_id
        and p.left_at is null
        and p.is_spectator = false
        and p.is_bot = false;

      select count(*) into active_seated_count
      from public.poker_players p
      join public.users u on u.uid = p.user_id
      where p.table_id = table_record.table_id
        and p.left_at is null
        and p.is_spectator = false
        and greatest(0, u.points - u.locked_points) > 0;

      select count(*) into seated_count
      from public.poker_players p
      where p.table_id = table_record.table_id
        and p.left_at is null
        and p.is_spectator = false;

      if active_seated_count < 2 then
        bots_needed := greatest(0, least(table_record.max_players - seated_count, 2 - active_seated_count));
        if bots_needed > 0 then
          perform public.poker_add_npcs(
            p_session_token => p_session_token,
            p_table_id => table_record.table_id,
            p_count => bots_needed
          );
        end if;
      end if;

      if human_seated_count = 0 and table_record.table_id <> npc_table_id then
        update public.poker_players p
        set left_at = now(),
            is_ready = false,
            has_folded = true,
            player_status = 'folded',
            updated_at = now()
        where p.table_id = table_record.table_id
          and p.left_at is null
          and p.is_bot = true;
      end if;
    end if;

    select count(*)
    into ready_count
    from public.poker_players p
    where p.table_id = table_record.table_id
      and p.left_at is null
      and p.is_spectator = false
      and p.is_ready = true;

    if table_record.status = 'waiting' then
      if ready_count >= 2 then
        update public.poker_tables t
        set status = 'countdown',
            countdown_ends_at = now() + interval '10 seconds',
            updated_at = now(),
            last_activity_at = now()
        where t.table_id = table_record.table_id
        returning * into table_record;
      end if;
    elsif table_record.status = 'countdown' then
      if ready_count < 2 then
        update public.poker_tables t
        set status = 'waiting',
            countdown_ends_at = null,
            updated_at = now(),
            last_activity_at = now()
        where t.table_id = table_record.table_id
        returning * into table_record;
      elsif table_record.countdown_ends_at is not null and table_record.countdown_ends_at <= now() then
        round_record := public.poker_start_round(table_record.table_id);
        select * into table_record from public.poker_tables t where t.table_id = table_record.table_id;
      end if;
    elsif table_record.status = 'playing' and table_record.active_round_id is not null then
      select * into round_record from public.poker_rounds r where r.round_id = table_record.active_round_id for update;

      if found and round_record.status = 'playing' then
        if round_record.phase_ends_at is not null and round_record.phase_ends_at <= now() then
          update public.poker_players p
          set acted_in_phase = true,
              has_folded = case when p.round_bet <> round_record.current_bet then true else p.has_folded end,
              player_status = case
                when p.round_bet <> round_record.current_bet then 'folded'
                when p.is_all_in then 'all-in'
                else 'ready'
              end,
              last_action = case when p.round_bet <> round_record.current_bet then 'auto-fold' else 'auto-check' end,
              action_at = now(),
              updated_at = now()
          where p.table_id = table_record.table_id
            and p.left_at is null
            and p.is_spectator = false
            and p.has_folded = false
            and p.is_all_in = false
            and p.acted_in_phase = false;
        end if;

        for bot_record in
          select p.user_id, p.bot_session_token
          from public.poker_players p
          join public.users u on u.uid = p.user_id
          where p.table_id = table_record.table_id
            and p.left_at is null
            and p.is_spectator = false
            and p.is_bot = true
            and p.has_folded = false
            and p.is_all_in = false
            and p.acted_in_phase = false
            and greatest(0, u.points - u.locked_points) > 0
        loop
          select d.action, d.raise_to
          into bot_action, bot_raise_to
          from public.poker_bot_decide_action(round_record.round_id, table_record.table_id, bot_record.user_id) d
          limit 1;

          if bot_action is null then
            continue;
          end if;

          begin
            if bot_record.bot_session_token is null or length(trim(bot_record.bot_session_token)) < 32 then
              update public.poker_players p
              set bot_session_token = public.create_account_session(bot_record.user_id),
                  updated_at = now()
              where p.table_id = table_record.table_id and p.user_id = bot_record.user_id
              returning p.bot_session_token into bot_record.bot_session_token;
            end if;

            perform public.poker_take_action(
              bot_record.bot_session_token,
              table_record.table_id,
              bot_action,
              bot_raise_to
            );
          exception when others then
            null;
          end;
        end loop;

        select * into round_record from public.poker_rounds r where r.round_id = table_record.active_round_id for update;

        select count(*) into alive_count
        from public.poker_players p
        where p.table_id = table_record.table_id
          and p.left_at is null
          and p.is_spectator = false
          and p.has_folded = false;

        select count(*) into pending_action_count
        from public.poker_players p
        where p.table_id = table_record.table_id
          and p.left_at is null
          and p.is_spectator = false
          and p.has_folded = false
          and p.is_all_in = false
          and p.acted_in_phase = false;

        select count(*) into unresolved_bet_count
        from public.poker_players p
        where p.table_id = table_record.table_id
          and p.left_at is null
          and p.is_spectator = false
          and p.has_folded = false
          and p.is_all_in = false
          and p.round_bet <> round_record.current_bet;

        if alive_count <= 1 then
          round_record := public.poker_showdown_round(round_record.round_id);
        elsif pending_action_count = 0 and unresolved_bet_count = 0 then
          if round_record.round_phase in ('round1', 'round2') then
            round_record := public.poker_prepare_next_phase(round_record.round_id);
          elsif round_record.round_phase = 'round3' then
            round_record := public.poker_showdown_round(round_record.round_id);
          end if;
        end if;

        select * into table_record from public.poker_tables t where t.table_id = table_record.table_id;
      end if;
    elsif table_record.status = 'completed' then
      if table_record.countdown_ends_at is not null and table_record.countdown_ends_at <= now() then
        update public.poker_tables t
        set status = 'waiting',
            active_round_id = null,
            countdown_ends_at = null,
            updated_at = now(),
            last_activity_at = now()
        where t.table_id = table_record.table_id
        returning * into table_record;

        update public.poker_players p
        set has_folded = false,
            is_all_in = false,
            total_bet = 0,
            round_bet = 0,
            last_action = null,
            acted_in_phase = false,
            player_status = 'ready',
            is_ready = case when p.is_bot then true else p.is_ready end,
            updated_at = now()
        where p.table_id = table_record.table_id
          and p.left_at is null
          and p.is_spectator = false;
      end if;
    end if;

    table_id := table_record.table_id;
    status := table_record.status;
    active_round_id := table_record.active_round_id;
    return next;
  end loop;
end;
$$;

create or replace function public.poker_get_table_state(p_session_token text, p_table_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  target_table public.poker_tables%rowtype;
  active_round public.poker_rounds%rowtype;
  reveal_count integer := 0;
begin
  select * into target_table from public.poker_tables t where t.table_id = p_table_id;
  if not found then
    raise exception 'Poker table not found' using errcode = 'P0002';
  end if;

  select * into active_round from public.poker_rounds r where r.round_id = target_table.active_round_id;
  reveal_count := greatest(0, least(2, coalesce(active_round.community_revealed, 0)));

  return jsonb_build_object(
    'table', to_jsonb(target_table),
    'round', (
      case
        when active_round.round_id is null then null
        else (
          (to_jsonb(active_round) - 'community_cards')
          || jsonb_build_object(
            'community_cards',
            array[
              case when reveal_count >= 1 then active_round.community_cards[1] else 'XX' end,
              case when reveal_count >= 2 then active_round.community_cards[2] else 'XX' end
            ],
            'community_revealed',
            reveal_count
          )
        )
      end
    ),
    'players', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'user_id', p.user_id,
        'seat_order', p.seat_order,
        'is_bot', p.is_bot,
        'npc_personality', p.npc_personality,
        'is_ready', p.is_ready,
        'is_spectator', p.is_spectator,
        'current_bet', p.current_bet,
        'left_at', p.left_at,
        'last_heartbeat_at', p.last_heartbeat_at,
        'display_name', u.display_name,
        'avatar_url', u.avatar_url,
        'points', u.points,
        'locked_points', u.locked_points,
        'available_points', greatest(0, u.points - u.locked_points),
        'in_round', exists (
          select 1
          from public.poker_hands h2
          where h2.round_id = active_round.round_id
            and h2.user_id = p.user_id
        ),
        'is_me', p.user_id = current_uid,
        'has_folded', p.has_folded,
        'is_all_in', p.is_all_in,
        'total_bet', p.total_bet,
        'round_bet', p.round_bet,
        'last_action', p.last_action,
        'acted_in_phase', p.acted_in_phase,
        'player_status', p.player_status
      ) order by p.is_spectator asc, p.seat_order asc nulls last), '[]'::jsonb)
      from public.poker_players p
      join public.users u on u.uid = p.user_id
      where p.table_id = p_table_id and p.left_at is null
    ),
    'hands', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'user_id', h.user_id,
        'cards', case
          when coalesce(active_round.round_phase, '') in ('showdown', 'completed') then h.cards
          when h.user_id = current_uid then h.cards
          else array['XX','XX','XX']::text[]
        end,
        'hand_rank', h.hand_rank,
        'hand_name', h.hand_name,
        'hand_score', h.hand_score,
        'is_winner', h.is_winner,
        'revealed_at', h.revealed_at
      ) order by p.seat_order asc nulls last), '[]'::jsonb)
      from public.poker_hands h
      left join public.poker_players p on p.table_id = h.table_id and p.user_id = h.user_id
      where h.table_id = p_table_id
        and active_round.round_id is not null
        and h.round_id = active_round.round_id
    ),
    'recent_results', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb)
      from (
        select pr.* from public.poker_results pr where pr.table_id = p_table_id order by pr.created_at desc limit 30
      ) r
    ),
    'chat', (
      select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at asc), '[]'::jsonb)
      from (
        select * from public.poker_chat_messages where table_id = p_table_id order by created_at desc limit 80
      ) m
    )
  );
end;
$$;

revoke all on public.poker_side_pots from anon, authenticated;
grant select on public.poker_side_pots to anon, authenticated;

revoke all on function public.poker_start_round(uuid) from public, anon, authenticated;
revoke all on function public.poker_take_action(text, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.poker_settle_round_points(uuid) from public, anon, authenticated;
revoke all on function public.poker_bot_decide_action(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.poker_tick_tables(text) from public, anon, authenticated;
revoke all on function public.poker_get_table_state(text, uuid) from public, anon, authenticated;
revoke all on function public.poker_add_npcs(text, uuid, integer) from public, anon, authenticated;

grant execute on function public.poker_take_action(text, uuid, text, integer) to anon, authenticated;
grant execute on function public.poker_tick_tables(text) to anon, authenticated;
grant execute on function public.poker_get_table_state(text, uuid) to anon, authenticated;
grant execute on function public.poker_add_npcs(text, uuid, integer) to anon, authenticated;

notify pgrst, 'reload schema';

create or replace function public.poker_set_bet(p_session_token text, p_table_id uuid, p_bet_amount integer)
returns public.poker_players
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
  target_table public.poker_tables%rowtype;
  player_record public.poker_players%rowtype;
begin
  select * into profile from public.users u where u.uid = current_uid;
  if not found or profile.is_banned then
    raise exception 'Account cannot play poker' using errcode = '42501';
  end if;

  select * into target_table from public.poker_tables t where t.table_id = p_table_id for update;
  if not found then
    raise exception 'Poker table not found' using errcode = 'P0002';
  end if;

  if target_table.status not in ('waiting', 'countdown', 'completed') then
    raise exception 'Round already in progress' using errcode = '22023';
  end if;

  if p_bet_amount < target_table.min_bet or p_bet_amount > target_table.max_bet then
    raise exception 'Bet out of range' using errcode = '22023';
  end if;

  if profile.points - profile.locked_points < p_bet_amount then
    raise exception 'Not enough available points' using errcode = '22023';
  end if;

  update public.poker_players
  set current_bet = p_bet_amount,
      is_ready = false,
      updated_at = now()
  where table_id = p_table_id
    and user_id = current_uid
    and left_at is null
    and is_spectator = false
  returning * into player_record;

  if not found then
    raise exception 'Player seat not found' using errcode = 'P0002';
  end if;

  update public.poker_tables
  set last_activity_at = now(),
      updated_at = now()
  where table_id = p_table_id;

  return player_record;
end;
$$;

create or replace function public.poker_set_ready(
  p_session_token text,
  p_table_id uuid,
  p_is_ready boolean default true
)
returns public.poker_players
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
  target_table public.poker_tables%rowtype;
  player_record public.poker_players%rowtype;
begin
  select * into profile from public.users where uid = current_uid;
  if not found or profile.is_banned then
    raise exception 'Account cannot play poker' using errcode = '42501';
  end if;

  select * into target_table from public.poker_tables where table_id = p_table_id for update;
  if not found then
    raise exception 'Poker table not found' using errcode = 'P0002';
  end if;

  if target_table.status not in ('waiting', 'countdown', 'completed') then
    raise exception 'Cannot change ready state while hand is running' using errcode = '22023';
  end if;

  update public.poker_players
  set is_ready = coalesce(p_is_ready, true),
      updated_at = now(),
      last_heartbeat_at = now()
  where table_id = p_table_id
    and user_id = current_uid
    and left_at is null
    and is_spectator = false
  returning * into player_record;

  if not found then
    raise exception 'Player seat not found' using errcode = 'P0002';
  end if;

  if player_record.current_bet < target_table.min_bet or player_record.current_bet > target_table.max_bet then
    raise exception 'Bet must be set before ready' using errcode = '22023';
  end if;

  if coalesce(p_is_ready, true) and profile.points - profile.locked_points < player_record.current_bet then
    raise exception 'Not enough available points for ready bet' using errcode = '22023';
  end if;

  update public.poker_tables
  set last_activity_at = now(),
      updated_at = now()
  where table_id = p_table_id;

  return player_record;
end;
$$;

notify pgrst, 'reload schema';






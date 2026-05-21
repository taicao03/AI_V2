set search_path = public, extensions;

create table if not exists public.npc_profiles (
  user_id uuid primary key references public.users(uid) on delete cascade,
  npc_name text not null,
  npc_tier text not null check (npc_tier in ('casual', 'happy', 'complainer', 'whale')),
  persona text not null default 'balanced',
  is_enabled boolean not null default true,
  bot_session_token text,
  last_dice_round_id uuid references public.rounds(round_id) on delete set null,
  last_global_chat_at timestamptz,
  last_poker_chat_at timestamptz,
  last_rr_chat_at timestamptz,
  last_global_chat_text text,
  last_poker_chat_text text,
  last_rr_chat_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.npc_wheel_rounds (
  cycle_id bigint primary key,
  spun_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.npc_profiles add column if not exists last_global_chat_text text;
alter table public.npc_profiles add column if not exists last_poker_chat_text text;
alter table public.npc_profiles add column if not exists last_rr_chat_text text;

create index if not exists npc_profiles_enabled_idx on public.npc_profiles (is_enabled, npc_tier);
create index if not exists npc_wheel_rounds_created_idx on public.npc_wheel_rounds (created_at desc);

create or replace function public.npc_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_npc_profiles_updated_at on public.npc_profiles;
create trigger set_npc_profiles_updated_at
  before update on public.npc_profiles
  for each row
  execute function public.npc_set_updated_at();

create or replace function public.npc_pick_line(p_lines text[])
returns text
language plpgsql
volatile
as $$
declare
  line_count integer;
  idx integer;
begin
  line_count := coalesce(array_length(p_lines, 1), 0);
  if line_count = 0 then
    return 'Good luck everyone!';
  end if;

  idx := 1 + floor(random() * line_count)::integer;
  return p_lines[idx];
end;
$$;

create or replace function public.npc_pick_line_no_repeat(
  p_lines text[],
  p_previous text default null
)
returns text
language plpgsql
volatile
as $$
declare
  candidates text[];
  candidate_count integer;
  idx integer;
begin
  if coalesce(array_length(p_lines, 1), 0) = 0 then
    return 'Good luck everyone!';
  end if;

  if p_previous is null or trim(p_previous) = '' then
    return public.npc_pick_line(p_lines);
  end if;

  select array_agg(line_text)
  into candidates
  from unnest(p_lines) as line_text
  where line_text <> p_previous;

  candidate_count := coalesce(array_length(candidates, 1), 0);
  if candidate_count = 0 then
    return p_previous;
  end if;

  idx := 1 + floor(random() * candidate_count)::integer;
  return candidates[idx];
end;
$$;

create or replace function public.npc_ensure_accounts()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  seed record;
  profile public.users%rowtype;
  created_count integer := 0;
  token_value text;
begin
  for seed in
    select *
    from (
      values
        ('poker_bot_alpha', 'Alpha', 'casual', 'balanced', 350000, 2),
        ('poker_bot_bree', 'Bree', 'happy', 'hype', 420000, 3),
        ('poker_bot_neo', 'Neo', 'complainer', 'tilt', 280000, 1),
        ('poker_bot_whale_odin', 'Whale Odin', 'whale', 'aggressive', 5000000, 10),
        ('poker_bot_whale_aurora', 'Whale Aurora', 'whale', 'showman', 8000000, 10),
        ('poker_bot_whale_titan', 'Whale Titan', 'whale', 'stoic', 12000000, 10)
    ) as t(account_name, display_name, npc_tier, persona, base_points, vip_level)
  loop
    select * into profile
    from public.users
    where account_name = seed.account_name
    for update;

    if not found then
      insert into public.users (
        account_name,
        display_name,
        email,
        points,
        locked_points,
        vip_level,
        role,
        is_banned,
        created_at,
        updated_at,
        points_updated_at
      )
      values (
        seed.account_name,
        seed.display_name,
        seed.account_name || '@npc.local',
        seed.base_points,
        0,
        seed.vip_level,
        'user',
        false,
        now(),
        now(),
        now()
      )
      returning * into profile;

      created_count := created_count + 1;
    else
      update public.users
      set display_name = seed.display_name,
          points = greatest(public.users.points, seed.base_points),
          vip_level = greatest(public.users.vip_level, seed.vip_level),
          is_banned = false,
          points_updated_at = now(),
          updated_at = now()
      where uid = profile.uid
      returning * into profile;
    end if;

    if not exists (select 1 from public.user_credentials where uid = profile.uid) then
      insert into public.user_credentials (uid, password_hash)
      values (profile.uid, crypt('npc-system-secret', gen_salt('bf')));
    end if;

    select bot_session_token
    into token_value
    from public.npc_profiles
    where user_id = profile.uid;

    if token_value is null or length(trim(token_value)) < 32 then
      token_value := public.create_account_session(profile.uid);
    else
      begin
        perform public.get_session_user_id(token_value);
      exception when others then
        token_value := public.create_account_session(profile.uid);
      end;
    end if;

    insert into public.npc_profiles (
      user_id,
      npc_name,
      npc_tier,
      persona,
      is_enabled,
      bot_session_token
    )
    values (
      profile.uid,
      seed.display_name,
      seed.npc_tier,
      seed.persona,
      true,
      token_value
    )
    on conflict (user_id) do update
      set npc_name = excluded.npc_name,
          npc_tier = excluded.npc_tier,
          persona = excluded.persona,
          is_enabled = true,
          bot_session_token = coalesce(public.npc_profiles.bot_session_token, excluded.bot_session_token),
          updated_at = now();
  end loop;

  return created_count;
end;
$$;

create or replace function public.npc_tick_dice()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  active_round public.rounds%rowtype;
  npc record;
  prediction_type text;
  prediction_value text;
  bet_amount integer;
  placed_count integer := 0;
  latest_settled_round public.rounds%rowtype;
  npc_outcome record;
  chat_line text;
begin
  perform public.npc_ensure_accounts();
  perform public.settle_due_rounds();
  active_round := public.ensure_active_round();

  if active_round.status = 'betting' and active_round.ends_at > now() then
    for npc in
      select np.*, u.points, u.locked_points
      from public.npc_profiles np
      join public.users u on u.uid = np.user_id
      where np.is_enabled = true
        and u.is_banned = false
    loop
      if exists (
        select 1
        from public.bets b
        where b.round_id = active_round.round_id
          and b.user_id = npc.user_id
      ) then
        continue;
      end if;

      if random() > (case when npc.npc_tier = 'whale' then 0.9 else 0.58 end) then
        continue;
      end if;

      if (npc.points - npc.locked_points) < 20 then
        continue;
      end if;

      prediction_type := 'tai_xiu';
      prediction_value := case when random() < 0.5 then 'tai' else 'xiu' end;

      if npc.npc_tier = 'whale' then
        bet_amount := least(greatest(500, floor((npc.points - npc.locked_points) * 0.08)::integer), 25000);
      else
        bet_amount := least(greatest(10, floor((npc.points - npc.locked_points) * 0.01)::integer), 2000);
      end if;

      begin
        perform *
        from public.place_bet(
          npc.bot_session_token,
          prediction_type,
          prediction_value,
          bet_amount
        );
        placed_count := placed_count + 1;
      exception when others then
        null;
      end;
    end loop;
  end if;

  select *
  into latest_settled_round
  from public.rounds r
  where r.status = 'completed'
  order by r.completed_at desc nulls last, r.settled_at desc nulls last, r.created_at desc
  limit 1;

  if latest_settled_round.round_id is not null then
    for npc_outcome in
      select np.user_id, np.npc_tier, np.last_dice_round_id, np.last_global_chat_at, np.last_global_chat_text, u.display_name, b.result, b.points_change
      from public.npc_profiles np
      join public.users u on u.uid = np.user_id
      join public.bets b on b.user_id = np.user_id and b.round_id = latest_settled_round.round_id and b.status = 'settled'
      where np.is_enabled = true
      order by random()
      limit 3
    loop
      if npc_outcome.last_dice_round_id = latest_settled_round.round_id then
        continue;
      end if;

      if npc_outcome.last_global_chat_at is not null and npc_outcome.last_global_chat_at > now() - interval '75 seconds' then
        continue;
      end if;

      if random() > (case
        when npc_outcome.npc_tier = 'whale' then 0.28
        when npc_outcome.npc_tier = 'complainer' then 0.22
        else 0.16
      end) then
        continue;
      end if;

      if npc_outcome.result = 'win' then
        if npc_outcome.points_change >= 3000 or npc_outcome.npc_tier = 'whale' then
          chat_line := public.npc_pick_line_no_repeat(array[
            'Pha nay rat dep, loi nhuan qua tot.',
            'Pot nay gia tri cao, toi rat hai long.',
            'Trend dang dep, giu nhip nhu the nay.',
            'Len diem manh, tiep tuc ky luat.',
            'Van nay toi an kha day, qua on.'
          ], npc_outcome.last_global_chat_text);
        else
          chat_line := public.npc_pick_line_no_repeat(array[
            'Round nay may man den roi.',
            'Qua on, tiep tuc giu nhip.',
            'Len diem roi, cam giac rat tot.',
            'Van vua roi dep, minh choi tiep.',
            'Co loi nhe, van sau nao.'
          ], npc_outcome.last_global_chat_text);
        end if;
      else
        if npc_outcome.points_change <= -3000 or npc_outcome.npc_tier = 'complainer' then
          chat_line := public.npc_pick_line_no_repeat(array[
            'Round nay khong dung y do, hoi tiec.',
            'Nhac nhe mot chut, van nay den that.',
            'Dang hoi kho chiu, can reset nhip.',
            'Thua kha sau, de toi dieu chinh lai.',
            'Khong dep, toi se quay lai o van sau.'
          ], npc_outcome.last_global_chat_text);
        else
          chat_line := public.npc_pick_line_no_repeat(array[
            'Van nay chua on, de round sau.',
            'Thua nhe mot chut, van binh tinh.',
            'Khong sao, minh con co ke hoach.',
            'Round nay den, tiep tuc nao.',
            'Chua dep, nhung chua het co hoi.'
          ], npc_outcome.last_global_chat_text);
        end if;
      end if;

      insert into public.chat_messages (user_id, display_name, avatar, role, vip_level, text)
      select u.uid, u.display_name, u.avatar_url, 'user', u.vip_level, chat_line
      from public.users u
      where u.uid = npc_outcome.user_id
      limit 1;

      update public.npc_profiles
      set last_dice_round_id = latest_settled_round.round_id,
          last_global_chat_at = now(),
          last_global_chat_text = chat_line,
          updated_at = now()
      where user_id = npc_outcome.user_id;
    end loop;
  end if;

  return placed_count;
end;
$$;

create or replace function public.npc_tick_poker()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  posted_count integer := 0;
  row_pick record;
  line_text text;
begin
  if to_regclass('public.poker_tables') is null or to_regclass('public.poker_players') is null then
    return 0;
  end if;

  for row_pick in
    select np.user_id, np.npc_tier, np.last_poker_chat_at, np.last_poker_chat_text, p.table_id, t.status, u.display_name, u.avatar_url, u.vip_level
    from public.npc_profiles np
    join public.poker_players p on p.user_id = np.user_id and p.left_at is null and p.is_spectator = false
    join public.poker_tables t on t.table_id = p.table_id and t.status in ('waiting', 'countdown', 'playing', 'showdown', 'completed')
    join public.users u on u.uid = np.user_id
    where np.is_enabled = true
      and (np.last_poker_chat_at is null or np.last_poker_chat_at < now() - interval '70 seconds')
    order by random()
    limit 1
  loop
    if random() > 0.18 then
      continue;
    end if;

    if row_pick.status in ('waiting', 'countdown') then
      line_text := public.npc_pick_line_no_repeat(array[
        'Ban moi sap bat dau chua, toi san sang roi.',
        'Nhanh nhip len, toi muon vao van moi.',
        'Lobby nay on, cho them nguoi la dep.',
        'Toi da warm-up xong, bat dau nao.',
        'Setup ban nay rat dep, vao van thoi.'
      ], row_pick.last_poker_chat_text);
    elsif row_pick.status = 'playing' then
      if row_pick.npc_tier = 'whale' then
        line_text := public.npc_pick_line_no_repeat(array[
          'Van nay cuoc lon moi vui.',
          'Ai theo duoc thi theo, toi len tiep day.',
          'Nhip nay dep, toi se tang ap luc.',
          'Stack dang sau, toi se danh nhanh.',
          'Pha nay toi uu tien value cao.'
        ], row_pick.last_poker_chat_text);
      else
        line_text := public.npc_pick_line_no_repeat(array[
          'Bai nay kho qua, can binh tinh.',
          'Pha nay dang hoi cang, cho them thong tin.',
          'Nhip nay kho doc, toi danh an toan.',
          'Van nay can ky luat, khong duoc nong.',
          'Toi se cho timing dep hon.'
        ], row_pick.last_poker_chat_text);
      end if;
    else
      line_text := public.npc_pick_line_no_repeat(array[
        'Van vua roi rat hay, nghi 1 nhip nao.',
        'Toi reset lai mot chut, vao van tiep.',
        'GG, nhung van sau moi quan trong.',
        'Tong ket nhanh: van vua roi nhieu ap luc.',
        'On, toi tiep tuc giu nhip.'
      ], row_pick.last_poker_chat_text);
    end if;

    insert into public.poker_chat_messages (
      table_id, user_id, display_name, avatar, role, vip_level, text
    )
    values (
      row_pick.table_id,
      row_pick.user_id,
      row_pick.display_name,
      row_pick.avatar_url,
      'user',
      row_pick.vip_level,
      line_text
    );

    update public.npc_profiles
    set last_poker_chat_at = now(),
        last_poker_chat_text = line_text,
        updated_at = now()
    where user_id = row_pick.user_id;

    posted_count := posted_count + 1;
  end loop;

  return posted_count;
end;
$$;

create or replace function public.npc_tick_rr()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  posted_count integer := 0;
  created_or_joined_count integer := 0;
  action_count integer := 0;
  settings_record public.rr_game_settings%rowtype;
  room_record public.rr_rooms%rowtype;
  playing_round public.rr_rounds%rowtype;
  actor record;
  available_npc record;
  target_room_id uuid;
  required_buy_in integer;
  required_min_buy_in integer;
  required_max_buy_in integer;
  rr_tick_token text;
  max_npc_players integer;
  ready_count integer;
  seat_count integer;
  row_pick record;
  line_text text;
begin
  if to_regclass('public.rr_rooms') is null or to_regclass('public.rr_players') is null then
    return 0;
  end if;

  if to_regprocedure('public.rr_create_room(text,text,boolean,integer,integer,integer,smallint,boolean,boolean)') is null
    or to_regprocedure('public.rr_join_room(text,uuid,text,boolean)') is null
    or to_regprocedure('public.rr_set_ready(text,uuid,boolean)') is null
    or to_regprocedure('public.rr_perform_action(text,uuid,text)') is null
    or to_regprocedure('public.rr_tick_rooms(text)') is null then
    return 0;
  end if;

  select *
  into settings_record
  from public.rr_game_settings
  where settings_id = 1;

  if not found or not settings_record.is_enabled then
    return 0;
  end if;

  required_min_buy_in := greatest(10, settings_record.min_buy_in);
  required_max_buy_in := greatest(required_min_buy_in, settings_record.max_buy_in);
  required_buy_in := least(greatest(required_min_buy_in, 500), required_max_buy_in);
  max_npc_players := least(6, greatest(2, settings_record.max_players));

  select np.bot_session_token
  into rr_tick_token
  from public.npc_profiles np
  where np.is_enabled = true
    and np.bot_session_token is not null
  order by case when np.npc_tier = 'whale' then 0 else 1 end, random()
  limit 1;

  if rr_tick_token is null then
    return 0;
  end if;

  -- Ensure one dedicated NPC RR room exists and stays alive.
  select r.*
  into room_record
  from public.rr_rooms r
  where r.name = 'NPC Mystery Chamber'
    and r.is_private = false
    and r.status in ('waiting', 'countdown', 'playing', 'completed')
  order by r.updated_at desc
  limit 1;

  if room_record.room_id is null then
    begin
      room_record := public.rr_create_room(
        rr_tick_token,
        'NPC Mystery Chamber',
        false,
        required_buy_in,
        required_min_buy_in,
        required_max_buy_in,
        max_npc_players::smallint,
        true,
        true
      );
      created_or_joined_count := created_or_joined_count + 1;
    exception when others then
      null;
    end;
  end if;

  if room_record.room_id is not null then
    target_room_id := room_record.room_id;

    select count(*)::integer
    into seat_count
    from public.rr_players p
    where p.room_id = target_room_id
      and p.left_at is null
      and p.status <> 'spectator';

    for available_npc in
      select np.user_id, np.bot_session_token, np.npc_tier
      from public.npc_profiles np
      join public.users u on u.uid = np.user_id
      where np.is_enabled = true
        and np.bot_session_token is not null
        and u.is_banned = false
        and (u.points - u.locked_points) >= required_buy_in
        and not exists (
          select 1
          from public.rr_players p
          where p.room_id = target_room_id
            and p.user_id = np.user_id
            and p.left_at is null
        )
      order by case when np.npc_tier = 'whale' then 0 else 1 end, random()
      limit greatest(0, max_npc_players - seat_count)
    loop
      begin
        perform public.rr_join_room(
          available_npc.bot_session_token,
          target_room_id,
          null,
          false
        );
        created_or_joined_count := created_or_joined_count + 1;
      exception when others then
        null;
      end;
    end loop;

    -- Auto-ready all active NPC players in NPC room.
    for available_npc in
      select np.user_id, np.bot_session_token
      from public.npc_profiles np
      join public.rr_players p on p.user_id = np.user_id
      where p.room_id = target_room_id
        and p.left_at is null
        and p.status <> 'spectator'
        and p.is_ready = false
        and np.is_enabled = true
        and np.bot_session_token is not null
    loop
      begin
        perform public.rr_set_ready(available_npc.bot_session_token, target_room_id, true);
      exception when others then
        null;
      end;
    end loop;

    -- Progress room lifecycle (countdown, timeout auto-action, settle...)
    begin
      perform * from public.rr_tick_rooms(rr_tick_token);
    exception when others then
      null;
    end;

    -- If currently playing and current turn belongs to an NPC, perform action.
    select rr.*
    into playing_round
    from public.rr_rounds rr
    join public.rr_rooms r on r.current_round_id = rr.round_id
    where r.room_id = target_room_id
      and r.status = 'playing'
      and rr.status = 'playing'
    limit 1;

    if playing_round.round_id is not null and playing_round.current_player_id is not null then
      select np.user_id, np.bot_session_token, np.npc_tier, p.has_shield, p.has_skip
      into actor
      from public.npc_profiles np
      join public.rr_players p
        on p.user_id = np.user_id
       and p.room_id = target_room_id
       and p.left_at is null
      where np.user_id = playing_round.current_player_id
        and np.is_enabled = true
        and np.bot_session_token is not null
      limit 1;

      if actor.user_id is not null then
        begin
          if actor.has_shield and random() < (case when actor.npc_tier = 'whale' then 0.2 else 0.1 end) then
            perform public.rr_perform_action(actor.bot_session_token, target_room_id, 'use_shield');
          elsif actor.has_skip and random() < (case when actor.npc_tier = 'complainer' then 0.35 else 0.12 end) then
            perform public.rr_perform_action(actor.bot_session_token, target_room_id, 'skip_turn');
          else
            perform public.rr_perform_action(actor.bot_session_token, target_room_id, 'pull_trigger');
          end if;
          action_count := action_count + 1;
        exception when others then
          null;
        end;
      end if;

      -- One more tick after action for smoother progression.
      begin
        perform * from public.rr_tick_rooms(rr_tick_token);
      exception when others then
        null;
      end;
    end if;
  end if;

  for row_pick in
    select np.user_id, np.npc_tier, np.last_rr_chat_at, np.last_rr_chat_text, p.room_id, p.status as player_status, r.status as room_status, u.display_name, u.avatar_url
    from public.npc_profiles np
    join public.rr_players p on p.user_id = np.user_id and p.left_at is null
    join public.rr_rooms r on r.room_id = p.room_id and r.status in ('waiting', 'countdown', 'playing', 'completed')
    join public.users u on u.uid = np.user_id
    where np.is_enabled = true
      and p.status <> 'spectator'
      and (np.last_rr_chat_at is null or np.last_rr_chat_at < now() - interval '80 seconds')
    order by random()
    limit 1
  loop
    if random() > 0.18 then
      continue;
    end if;

    if row_pick.player_status = 'winner' then
      line_text := public.npc_pick_line_no_repeat(array[
        'Qua dep, toi vua an pot nay.',
        'Timing qua hop ly, round nay rat tot.',
        'Round nay toi giu nhip kha on.',
        'Pha nay dep that, ket qua nhu y.',
        'Chi so pot vua roi rat ngon.'
      ], row_pick.last_rr_chat_text);
    elsif row_pick.player_status = 'eliminated' then
      line_text := public.npc_pick_line_no_repeat(array[
        'Round nay toi bi loai roi, hoi tiec.',
        'Pha nay chua on, de toi quay lai.',
        'Khong dung nhip, round sau lam lai.',
        'Den nhe mot chut, chua may man.',
        'Toi reset lai va vao round sau.'
      ], row_pick.last_rr_chat_text);
    else
      if row_pick.room_status in ('waiting', 'countdown') then
        line_text := public.npc_pick_line_no_repeat(array[
          'Room nay sap vao round moi.',
          'Count down roi, giu tap trung nao.',
          'Setup da dep, vao tran thoi.',
          'Cho doi hinh on dinh de bat dau.',
          'Round moi sap mo, cang nhe.'
        ], row_pick.last_rr_chat_text);
      else
        line_text := public.npc_pick_line_no_repeat(array[
          'Ap luc cao day, ai se tru lai cuoi cung?',
          'Nhip nay cang, toi se choi ky luat.',
          'Mystery Chamber dang nong len roi.',
          'Round nay can than tung luot.',
          'Toi dang cho timing hop ly.'
        ], row_pick.last_rr_chat_text);
      end if;
    end if;

    insert into public.rr_chat_messages (room_id, user_id, display_name, avatar, text)
    values (row_pick.room_id, row_pick.user_id, row_pick.display_name, row_pick.avatar_url, line_text);

    update public.npc_profiles
    set last_rr_chat_at = now(),
        last_rr_chat_text = line_text,
        updated_at = now()
    where user_id = row_pick.user_id;

    posted_count := posted_count + 1;
  end loop;

  return posted_count + created_or_joined_count + action_count;
end;
$$;

create or replace function public.npc_tick_wheel()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  settings_record public.wheel_settings%rowtype;
  npc record;
  current_cycle bigint;
  target_cycle bigint;
  cycle_elapsed integer;
  round_seconds integer := 70;
  betting_seconds integer := 60;
  target_count integer;
  bet_amount integer;
  available_points integer;
  ratio numeric;
  created_spin public.wheel_spins%rowtype;
  placed_count integer := 0;
begin
  if to_regclass('public.wheel_settings') is null
    or to_regclass('public.wheel_segments') is null
    or to_regclass('public.wheel_spins') is null
    or to_regclass('public.npc_wheel_rounds') is null
    or to_regprocedure('public.wheel_create_spin_bot(text,integer,text)') is null then
    return 0;
  end if;

  select *
  into settings_record
  from public.wheel_settings
  where settings_id = 1;

  if not found or not settings_record.enabled then
    return 0;
  end if;

  current_cycle := floor(extract(epoch from now()) / round_seconds)::bigint;
  cycle_elapsed := floor(extract(epoch from now()))::integer % round_seconds;
  target_cycle := case when cycle_elapsed < betting_seconds then current_cycle - 1 else current_cycle end;
  if target_cycle < 0 then
    return 0;
  end if;

  perform pg_advisory_xact_lock(hashtext('npc_tick_wheel_v1'));

  insert into public.npc_wheel_rounds (cycle_id)
  values (target_cycle)
  on conflict (cycle_id) do nothing;

  if not found then
    return 0;
  end if;

  target_count := 8 + floor(random() * 17)::integer;

  for npc in
    select np.user_id, np.bot_session_token, np.npc_tier, u.points, u.locked_points
    from public.npc_profiles np
    join public.users u on u.uid = np.user_id
    where np.is_enabled = true
      and np.bot_session_token is not null
      and u.is_banned = false
    order by case when np.npc_tier = 'whale' then 0 else 1 end, random()
    limit target_count
  loop
    available_points := greatest(0, npc.points - npc.locked_points);
    if available_points < settings_record.min_bet then
      continue;
    end if;

    if npc.npc_tier = 'whale' then
      ratio := 0.03 + (random() * 0.06);
    else
      ratio := 0.008 + (random() * 0.02);
    end if;

    bet_amount := floor(available_points * ratio)::integer;
    bet_amount := greatest(settings_record.min_bet, bet_amount);
    bet_amount := least(settings_record.max_bet, bet_amount);

    if bet_amount > available_points then
      bet_amount := available_points;
    end if;

    if bet_amount < settings_record.min_bet then
      continue;
    end if;

    begin
      created_spin := public.wheel_create_spin_bot(
        npc.bot_session_token,
        bet_amount,
        format('npc-wheel-%s-%s', target_cycle::text, npc.user_id::text)
      );

      if created_spin.spin_id is not null then
        placed_count := placed_count + 1;
      end if;
    exception when others then
      null;
    end;
  end loop;

  update public.npc_wheel_rounds
  set spun_count = placed_count
  where cycle_id = target_cycle;

  return placed_count;
end;
$$;

create or replace function public.npc_tick_system(p_session_token text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_uid uuid := null;
  caller_profile public.users%rowtype;
  created_npcs integer;
  dice_bets integer := 0;
  wheel_spins integer := 0;
  poker_chats integer := 0;
  rr_chats integer := 0;
  wheel_ready boolean := false;
  rr_ready boolean := false;
  rr_error text := null;
begin
  if p_session_token is not null then
    begin
      caller_uid := public.get_session_user_id(p_session_token);
      select * into caller_profile from public.users where uid = caller_uid;
      if found and caller_profile.is_banned then
        raise exception 'Account is banned' using errcode = '42501';
      end if;
    exception when others then
      caller_uid := null;
    end;
  end if;

  perform pg_advisory_xact_lock(hashtext('npc_tick_system_v1'));

  created_npcs := public.npc_ensure_accounts();
  begin
    dice_bets := public.npc_tick_dice();
  exception when others then
    rr_error := coalesce(rr_error || ' | ', '') || 'dice:' || sqlerrm;
  end;

  wheel_ready := to_regclass('public.wheel_settings') is not null
    and to_regclass('public.wheel_segments') is not null
    and to_regclass('public.wheel_spins') is not null
    and to_regprocedure('public.wheel_create_spin_bot(text,integer,text)') is not null;

  if wheel_ready then
    begin
      wheel_spins := public.npc_tick_wheel();
    exception when others then
      rr_error := coalesce(rr_error || ' | ', '') || 'wheel:' || sqlerrm;
    end;
  else
    rr_error := coalesce(rr_error || ' | ', '') || 'wheel:not_ready';
  end if;

  begin
    poker_chats := public.npc_tick_poker();
  exception when others then
    rr_error := coalesce(rr_error || ' | ', '') || 'poker:' || sqlerrm;
  end;

  rr_ready := to_regclass('public.rr_rooms') is not null
    and to_regclass('public.rr_players') is not null
    and to_regprocedure('public.rr_create_room(text,text,boolean,integer,integer,integer,smallint,boolean,boolean)') is not null
    and to_regprocedure('public.rr_join_room(text,uuid,text,boolean)') is not null
    and to_regprocedure('public.rr_set_ready(text,uuid,boolean)') is not null
    and to_regprocedure('public.rr_perform_action(text,uuid,text)') is not null
    and to_regprocedure('public.rr_tick_rooms(text)') is not null;

  if rr_ready then
    begin
      rr_chats := public.npc_tick_rr();
    exception when others then
      rr_error := coalesce(rr_error || ' | ', '') || 'rr:' || sqlerrm;
    end;
  else
    rr_error := coalesce(rr_error || ' | ', '') || 'rr:not_ready';
  end if;

  return jsonb_build_object(
    'created_npcs', created_npcs,
    'dice_bets', dice_bets,
    'wheel_spins', wheel_spins,
    'poker_chats', poker_chats,
    'rr_chats', rr_chats,
    'wheel_ready', wheel_ready,
    'rr_ready', rr_ready,
    'error', rr_error,
    'tick_at', now()
  );
end;
$$;

revoke all on public.npc_profiles from anon, authenticated;
revoke all on public.npc_wheel_rounds from anon, authenticated;
revoke all on function public.npc_ensure_accounts() from public, anon, authenticated;
revoke all on function public.npc_tick_dice() from public, anon, authenticated;
revoke all on function public.npc_tick_wheel() from public, anon, authenticated;
revoke all on function public.npc_tick_poker() from public, anon, authenticated;
revoke all on function public.npc_tick_rr() from public, anon, authenticated;
revoke all on function public.npc_tick_system(text) from public, anon, authenticated;

grant execute on function public.npc_tick_system(text) to anon, authenticated;

notify pgrst, 'reload schema';

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

revoke all on function public.poker_take_action(text, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.poker_take_action(text, uuid, text, integer) to anon, authenticated;

notify pgrst, 'reload schema';

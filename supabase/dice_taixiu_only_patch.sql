-- Dice patch: disable "total number" bets and keep only Tai/Xiu bets.

create or replace function public.place_bet(
  p_session_token text,
  p_prediction_type text,
  p_prediction_value text,
  p_bet_amount integer
)
returns table (
  bet_id uuid,
  round_id uuid,
  prediction_type text,
  prediction_value text,
  bet_amount integer,
  status text,
  result text,
  points_change integer,
  created_at timestamptz,
  round_starts_at timestamptz,
  round_ends_at timestamptz,
  available_points integer
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  locked_user public.users%rowtype;
  active_round public.rounds%rowtype;
  new_bet public.bets%rowtype;
  normalized_value text := lower(trim(coalesce(p_prediction_value, '')));
  multiplier numeric(10,2) := 1;
  locked_before integer;
begin
  perform public.settle_due_rounds();
  active_round := public.ensure_active_round();

  if active_round.status <> 'betting' or active_round.ends_at <= now() then
    raise exception 'Round is closed' using errcode = '22023';
  end if;

  if p_bet_amount is null or p_bet_amount < 1 then
    raise exception 'Bet amount must be at least 1' using errcode = '22023';
  end if;

  if p_prediction_type is distinct from 'tai_xiu' then
    raise exception 'Only Tai/Xiu bets are supported' using errcode = '22023';
  end if;

  if normalized_value not in ('tai', 'xiu') then
    raise exception 'Invalid Tai/Xiu prediction' using errcode = '22023';
  end if;

  select *
  into locked_user
  from public.users u
  where u.uid = current_uid
  for update;

  if not found then
    raise exception 'User profile not found' using errcode = 'P0002';
  end if;

  if locked_user.is_banned then
    raise exception 'Account is banned' using errcode = '42501';
  end if;

  if locked_user.points - locked_user.locked_points < p_bet_amount then
    raise exception 'Not enough available points' using errcode = '22023';
  end if;

  locked_before := locked_user.locked_points;

  insert into public.bets (
    user_id,
    round_id,
    prediction_type,
    prediction_value,
    bet_amount,
    payout_multiplier,
    status,
    result,
    points_change
  )
  values (
    current_uid,
    active_round.round_id,
    'tai_xiu',
    normalized_value,
    p_bet_amount,
    multiplier,
    'pending',
    null,
    0
  )
  returning * into new_bet;

  update public.users
  set locked_points = public.users.locked_points + p_bet_amount,
      points_updated_at = now()
  where uid = current_uid
  returning * into locked_user;

  insert into public.points_transactions (
    user_id, type, amount, points_before, points_after, locked_before, locked_after, bet_id, round_id
  )
  values (
    current_uid,
    'bet_lock',
    p_bet_amount,
    locked_user.points,
    locked_user.points,
    locked_before,
    locked_user.locked_points,
    new_bet.bet_id,
    active_round.round_id
  );

  return query
  select
    new_bet.bet_id,
    new_bet.round_id,
    new_bet.prediction_type,
    new_bet.prediction_value,
    new_bet.bet_amount,
    new_bet.status,
    new_bet.result,
    new_bet.points_change,
    new_bet.created_at,
    active_round.starts_at,
    active_round.ends_at,
    greatest(0, locked_user.points - locked_user.locked_points) as available_points;
end;
$$;

notify pgrst, 'reload schema';

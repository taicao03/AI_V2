set search_path = public, extensions;

alter table public.points_transactions add column if not exists game_type text;

alter table public.points_transactions drop constraint if exists points_transactions_type_check;
alter table public.points_transactions add constraint points_transactions_type_check check (
  type in (
    'bet_lock', 'bet_win', 'bet_loss', 'admin_adjust', 'daily_claim', 'round_cancel',
    'poker_bet_lock', 'poker_bet_win', 'poker_bet_loss', 'poker_round_refund',
    'buy_in_lock', 'win_pot', 'refund',
    'spin_bet', 'spin_win'
  )
);

create table if not exists public.wheel_settings (
  settings_id smallint primary key default 1 check (settings_id = 1),
  enabled boolean not null default true,
  min_bet integer not null default 10 check (min_bet >= 1),
  max_bet integer not null default 100000 check (max_bet >= min_bet),
  cooldown_seconds integer not null default 3 check (cooldown_seconds >= 0),
  default_jackpot bigint not null default 100000 check (default_jackpot >= 0),
  updated_by uuid references public.users(uid) on delete set null,
  updated_at timestamptz not null default now(),
  version integer not null default 1
);

alter table public.wheel_settings
  add column if not exists default_jackpot bigint not null default 100000 check (default_jackpot >= 0);

alter table public.wheel_settings
  alter column default_jackpot type bigint using default_jackpot::bigint;

create table if not exists public.wheel_segments (
  segment_id uuid primary key default gen_random_uuid(),
  label text not null,
  multiplier numeric(10,4) not null check (multiplier >= 0),
  probability numeric(10,4) not null check (probability >= 0),
  color text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wheel_spins (
  spin_id uuid primary key default gen_random_uuid(),
  client_spin_id text,
  user_id uuid not null references public.users(uid) on delete cascade,
  display_name text not null,
  avatar text,
  bet_amount integer not null check (bet_amount >= 1),
  selected_segment_id uuid references public.wheel_segments(segment_id) on delete set null,
  label text not null,
  multiplier numeric(10,4) not null,
  result_amount integer not null,
  settings_version integer not null,
  settings_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.wheel_pending_bets (
  pending_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(uid) on delete cascade,
  round_cycle bigint not null,
  bet_amount integer not null check (bet_amount >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, round_cycle)
);

create table if not exists public.wheel_chat_messages (
  message_id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(uid) on delete set null,
  display_name text not null,
  avatar text,
  role text not null default 'user' check (role in ('user', 'admin', 'system')),
  vip_level smallint not null default 0 check (vip_level between 0 and 10),
  text text not null check (char_length(text) between 1 and 300),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references public.users(uid) on delete set null,
  is_deleted boolean not null default false
);

create table if not exists public.wheel_player_stats (
  user_id uuid primary key references public.users(uid) on delete cascade,
  account_name text not null,
  display_name text not null,
  avatar_url text,
  total_winnings bigint not null default 0,
  biggest_win integer not null default 0,
  total_spins integer not null default 0,
  jackpot_hits integer not null default 0,
  win_count integer not null default 0,
  win_rate numeric(7,2) not null default 0,
  updated_at timestamptz not null default now()
);

create unique index if not exists wheel_spins_user_client_spin_id_key
  on public.wheel_spins (user_id, client_spin_id)
  where client_spin_id is not null;

create index if not exists wheel_segments_sort_idx on public.wheel_segments (sort_order asc, created_at asc);
create index if not exists wheel_spins_created_idx on public.wheel_spins (created_at desc);
create index if not exists wheel_spins_user_created_idx on public.wheel_spins (user_id, created_at desc);
create index if not exists wheel_pending_bets_cycle_idx on public.wheel_pending_bets (round_cycle desc, created_at desc);
create index if not exists wheel_chat_created_idx on public.wheel_chat_messages (created_at desc);
create index if not exists wheel_stats_winnings_idx on public.wheel_player_stats (total_winnings desc, updated_at asc);
create index if not exists points_transactions_game_created_idx on public.points_transactions (game_type, created_at desc);

insert into public.wheel_settings (settings_id)
values (1)
on conflict (settings_id) do nothing;

create or replace function public.wheel_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_wheel_segments_updated_at on public.wheel_segments;
create trigger set_wheel_segments_updated_at
  before update on public.wheel_segments
  for each row
  execute function public.wheel_set_updated_at();

drop trigger if exists set_wheel_chat_messages_updated_at on public.wheel_chat_messages;
create trigger set_wheel_chat_messages_updated_at
  before update on public.wheel_chat_messages
  for each row
  execute function public.wheel_set_updated_at();

drop trigger if exists set_wheel_pending_bets_updated_at on public.wheel_pending_bets;
create trigger set_wheel_pending_bets_updated_at
  before update on public.wheel_pending_bets
  for each row
  execute function public.wheel_set_updated_at();

insert into public.wheel_segments (label, multiplier, probability, color, enabled, sort_order)
select *
from (
  values
    ('Mat Trang', 0::numeric, 40::numeric, '#ef4444', true, 1),
    ('An Ui', 0.5::numeric, 20::numeric, '#f59e0b', true, 2),
    ('Hoa Von', 1::numeric, 20::numeric, '#38bdf8', true, 3),
    ('Gap Doi', 2::numeric, 10::numeric, '#22c55e', true, 4),
    ('Sieu Loi', 3::numeric, 6::numeric, '#8b5cf6', true, 5),
    ('Mega Win', 5::numeric, 3::numeric, '#ec4899', true, 6),
    ('JACKPOT', 10::numeric, 1::numeric, '#facc15', true, 7)
) as defaults(label, multiplier, probability, color, enabled, sort_order)
where not exists (select 1 from public.wheel_segments);

create or replace function public.wheel_get_settings_snapshot()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'settings', (
      select to_jsonb(s)
      from public.wheel_settings s
      where s.settings_id = 1
    ),
    'segments', (
      select coalesce(jsonb_agg(to_jsonb(seg) order by seg.sort_order asc, seg.created_at asc), '[]'::jsonb)
      from public.wheel_segments seg
    )
  )
$$;

create or replace function public.wheel_get_current_cycle()
returns bigint
language sql
stable
set search_path = public
as $$
  select floor(extract(epoch from now()) / 70)::bigint
$$;

create or replace function public.wheel_submit_bet(
  p_session_token text,
  p_bet_amount integer,
  p_round_cycle bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
  settings_record public.wheel_settings%rowtype;
  cycle_value bigint := coalesce(p_round_cycle, public.wheel_get_current_cycle());
  cycle_elapsed integer := floor(extract(epoch from now()))::integer % 70;
begin
  select * into profile
  from public.users
  where uid = current_uid
  for update;

  if not found or profile.is_banned then
    raise exception 'Account is not allowed to submit wheel bet' using errcode = '42501';
  end if;

  select * into settings_record
  from public.wheel_settings
  where settings_id = 1;

  if not found or not settings_record.enabled then
    raise exception 'Wheel Spin is currently disabled' using errcode = '42501';
  end if;

  if cycle_elapsed >= 60 then
    raise exception 'Betting phase is closed for this round' using errcode = '22023';
  end if;

  if p_bet_amount is null or p_bet_amount < settings_record.min_bet or p_bet_amount > settings_record.max_bet then
    raise exception 'Bet must be within configured range' using errcode = '22023';
  end if;

  if profile.points - profile.locked_points < p_bet_amount then
    raise exception 'Not enough points for this bet' using errcode = '22023';
  end if;

  delete from public.wheel_pending_bets
  where user_id = current_uid
    and round_cycle < cycle_value;

  insert into public.wheel_pending_bets (user_id, round_cycle, bet_amount)
  values (current_uid, cycle_value, p_bet_amount)
  on conflict (user_id, round_cycle) do update
    set bet_amount = excluded.bet_amount,
        updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'round_cycle', cycle_value,
    'bet_amount', p_bet_amount
  );
end;
$$;

create or replace function public.wheel_get_my_pending_bet(
  p_session_token text,
  p_round_cycle bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  cycle_value bigint := coalesce(p_round_cycle, public.wheel_get_current_cycle());
  pending_record public.wheel_pending_bets%rowtype;
begin
  select *
  into pending_record
  from public.wheel_pending_bets
  where user_id = current_uid
    and round_cycle = cycle_value
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'round_cycle', pending_record.round_cycle,
    'bet_amount', pending_record.bet_amount,
    'created_at', pending_record.created_at
  );
end;
$$;

create or replace function public.wheel_validate_bet(
  p_session_token text,
  p_bet_amount integer,
  p_ignore_global_cooldown boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
  settings_record public.wheel_settings%rowtype;
  last_spin_at timestamptz;
  cooldown_remaining integer := 0;
begin
  select *
  into settings_record
  from public.wheel_settings
  where settings_id = 1;

  if not found then
    insert into public.wheel_settings (settings_id)
    values (1)
    returning * into settings_record;
  end if;

  if not settings_record.enabled then
    raise exception 'Wheel Spin is currently disabled' using errcode = '42501';
  end if;

  if p_bet_amount is null or p_bet_amount < settings_record.min_bet or p_bet_amount > settings_record.max_bet then
    raise exception 'Bet must be within configured range' using errcode = '22023';
  end if;

  select * into profile
  from public.users
  where uid = current_uid;

  if not found or profile.is_banned then
    raise exception 'Account is not allowed to spin' using errcode = '42501';
  end if;

  if profile.points - profile.locked_points < p_bet_amount then
    raise exception 'Not enough points for this bet' using errcode = '22023';
  end if;

  if not coalesce(p_ignore_global_cooldown, false) and settings_record.cooldown_seconds > 0 then
    select ws.created_at
    into last_spin_at
    from public.wheel_spins ws
    order by ws.created_at desc
    limit 1;

    if last_spin_at is not null then
      cooldown_remaining := greatest(0, ceil(extract(epoch from (last_spin_at + make_interval(secs => settings_record.cooldown_seconds) - now())))::integer);
      if cooldown_remaining > 0 then
        raise exception 'Global cooldown active. Try again in % second(s).', cooldown_remaining using errcode = '22023';
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'settings_version', settings_record.version,
    'min_bet', settings_record.min_bet,
    'max_bet', settings_record.max_bet,
    'cooldown_seconds', settings_record.cooldown_seconds,
    'available_points', greatest(0, profile.points - profile.locked_points)
  );
end;
$$;

create or replace function public.wheel_calculate_weighted_result()
returns public.wheel_segments
language plpgsql
security definer
set search_path = public
as $$
declare
  total_probability numeric;
  roll numeric;
  running numeric := 0;
  picked public.wheel_segments%rowtype;
  segment_record public.wheel_segments%rowtype;
begin
  select coalesce(sum(probability), 0)
  into total_probability
  from public.wheel_segments
  where enabled = true
    and probability > 0;

  if total_probability <= 0 then
    raise exception 'No enabled segment with positive probability' using errcode = '22023';
  end if;

  if abs(total_probability - 100) > 0.0001 then
    raise exception 'Enabled segment probability must total 100%%' using errcode = '22023';
  end if;

  roll := random() * total_probability;

  for segment_record in
    select *
    from public.wheel_segments
    where enabled = true
      and probability > 0
    order by sort_order asc, created_at asc
  loop
    running := running + segment_record.probability;
    if roll <= running then
      picked := segment_record;
      exit;
    end if;
  end loop;

  if picked.segment_id is null then
    select *
    into picked
    from public.wheel_segments
    where enabled = true
      and probability > 0
    order by sort_order desc, created_at desc
    limit 1;
  end if;

  return picked;
end;
$$;

create or replace function public.wheel_refresh_player_stats(p_user_id uuid)
returns public.wheel_player_stats
language plpgsql
security definer
set search_path = public
as $$
declare
  profile public.users%rowtype;
  stats_record public.wheel_player_stats%rowtype;
begin
  select *
  into profile
  from public.users
  where uid = p_user_id;

  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  insert into public.wheel_player_stats (
    user_id,
    account_name,
    display_name,
    avatar_url,
    total_winnings,
    biggest_win,
    total_spins,
    jackpot_hits,
    win_count,
    win_rate,
    updated_at
  )
  select
    profile.uid,
    profile.account_name,
    profile.display_name,
    profile.avatar_url,
    coalesce(sum(greatest(ws.result_amount - ws.bet_amount, 0)), 0)::bigint,
    coalesce(max(greatest(ws.result_amount - ws.bet_amount, 0)), 0)::integer,
    count(*)::integer,
    count(*) filter (where ws.multiplier >= 10)::integer,
    count(*) filter (where ws.result_amount > ws.bet_amount)::integer,
    coalesce(round((count(*) filter (where ws.result_amount > ws.bet_amount)::numeric / nullif(count(*)::numeric, 0)) * 100, 2), 0)
      ::numeric(7,2),
    now()
  from public.wheel_spins ws
  where ws.user_id = p_user_id
  on conflict (user_id) do update
    set account_name = excluded.account_name,
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        total_winnings = excluded.total_winnings,
        biggest_win = excluded.biggest_win,
        total_spins = excluded.total_spins,
        jackpot_hits = excluded.jackpot_hits,
        win_count = excluded.win_count,
        win_rate = excluded.win_rate,
        updated_at = now()
  returning * into stats_record;

  return stats_record;
end;
$$;

drop function if exists public.wheel_settle_spin(text, integer, uuid, text);

create or replace function public.wheel_settle_spin(
  p_session_token text,
  p_bet_amount integer,
  p_segment_id uuid,
  p_client_spin_id text default null,
  p_ignore_global_cooldown boolean default false
)
returns public.wheel_spins
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
  settings_record public.wheel_settings%rowtype;
  segment_record public.wheel_segments%rowtype;
  existing_spin public.wheel_spins%rowtype;
  created_spin public.wheel_spins%rowtype;
  snapshot jsonb;
  points_before integer;
  points_after_bet integer;
  points_after_settle integer;
  payout_amount integer;
  jackpot_base bigint := 0;
  jackpot_contribution bigint := 0;
  last_jackpot_at timestamptz;
  last_spin_at timestamptz;
  cooldown_remaining integer := 0;
  clean_client_spin_id text := nullif(trim(coalesce(p_client_spin_id, '')), '');
  message_text text;
begin
  if clean_client_spin_id is not null then
    select *
    into existing_spin
    from public.wheel_spins
    where user_id = current_uid
      and client_spin_id = clean_client_spin_id
    limit 1;

    if found then
      return existing_spin;
    end if;
  end if;

  select *
  into profile
  from public.users
  where uid = current_uid
  for update;

  select *
  into settings_record
  from public.wheel_settings
  where settings_id = 1
  for update;

  if not settings_record.enabled then
    raise exception 'Wheel Spin is currently disabled' using errcode = '42501';
  end if;

  if p_bet_amount is null or p_bet_amount < settings_record.min_bet or p_bet_amount > settings_record.max_bet then
    raise exception 'Bet must be within configured range' using errcode = '22023';
  end if;

  if not coalesce(p_ignore_global_cooldown, false) and settings_record.cooldown_seconds > 0 then
    select ws.created_at
    into last_spin_at
    from public.wheel_spins ws
    order by ws.created_at desc
    limit 1;

    if last_spin_at is not null then
      cooldown_remaining := greatest(0, ceil(extract(epoch from (last_spin_at + make_interval(secs => settings_record.cooldown_seconds) - now())))::integer);
      if cooldown_remaining > 0 then
        raise exception 'Global cooldown active. Try again in % second(s).', cooldown_remaining using errcode = '22023';
      end if;
    end if;
  end if;

  if profile.points - profile.locked_points < p_bet_amount then
    raise exception 'Not enough points for this bet' using errcode = '22023';
  end if;

  select *
  into segment_record
  from public.wheel_segments
  where segment_id = p_segment_id
    and enabled = true
  for update;

  if not found then
    raise exception 'Selected wheel segment is invalid' using errcode = '22023';
  end if;

  points_before := profile.points;
  points_after_bet := profile.points - p_bet_amount;

  if segment_record.multiplier >= 10 then
    perform pg_advisory_xact_lock(hashtext('wheel_jackpot_settle_v1'));

    select ws.created_at
    into last_jackpot_at
    from public.wheel_spins ws
    where ws.multiplier >= 10
    order by ws.created_at desc
    limit 1;

    select coalesce(s.default_jackpot, 100000)::bigint
    into jackpot_base
    from public.wheel_settings s
    where s.settings_id = 1;

    select coalesce(sum(abs(pt.amount)), 0)::bigint
    into jackpot_contribution
    from public.points_transactions pt
    where pt.game_type = 'wheel_spin'
      and pt.type = 'spin_bet'
      and (last_jackpot_at is null or pt.created_at > last_jackpot_at);

    payout_amount := greatest(0, jackpot_base + floor((jackpot_contribution + p_bet_amount) * 0.5)::bigint)::integer;
  else
    payout_amount := floor(p_bet_amount::numeric * segment_record.multiplier)::integer;
  end if;

  points_after_settle := points_after_bet + payout_amount;

  if points_after_bet < profile.locked_points then
    raise exception 'Insufficient unlocked points' using errcode = '22023';
  end if;

  snapshot := public.wheel_get_settings_snapshot();

  update public.users
  set points = points_after_settle,
      points_updated_at = now()
  where uid = current_uid
  returning * into profile;

  insert into public.wheel_spins (
    client_spin_id,
    user_id,
    display_name,
    avatar,
    bet_amount,
    selected_segment_id,
    label,
    multiplier,
    result_amount,
    settings_version,
    settings_snapshot,
    created_at
  )
  values (
    clean_client_spin_id,
    current_uid,
    profile.display_name,
    profile.avatar_url,
    p_bet_amount,
    segment_record.segment_id,
    segment_record.label,
    segment_record.multiplier,
    payout_amount,
    settings_record.version,
    snapshot,
    now()
  )
  on conflict (user_id, client_spin_id) where client_spin_id is not null do nothing
  returning * into created_spin;

  if created_spin.spin_id is null and clean_client_spin_id is not null then
    select *
    into created_spin
    from public.wheel_spins
    where user_id = current_uid
      and client_spin_id = clean_client_spin_id
    limit 1;
  end if;

  insert into public.points_transactions (
    user_id,
    game_type,
    type,
    amount,
    points_before,
    points_after,
    locked_before,
    locked_after,
    note,
    created_at
  )
  values (
    current_uid,
    'wheel_spin',
    'spin_bet',
    -p_bet_amount,
    points_before,
    points_after_bet,
    profile.locked_points,
    profile.locked_points,
    'Wheel Spin bet locked and charged',
    now()
  );

  insert into public.points_transactions (
    user_id,
    game_type,
    type,
    amount,
    points_before,
    points_after,
    locked_before,
    locked_after,
    note,
    created_at
  )
  values (
    current_uid,
    'wheel_spin',
    'spin_win',
    payout_amount,
    points_after_bet,
    points_after_settle,
    profile.locked_points,
    profile.locked_points,
    'Wheel Spin payout settled',
    now()
  );

  perform public.wheel_refresh_player_stats(current_uid);

  if segment_record.multiplier >= 2 then
    message_text := profile.display_name || ' just hit ' || segment_record.label;
    insert into public.wheel_chat_messages (
      user_id,
      display_name,
      avatar,
      role,
      vip_level,
      text,
      is_system,
      created_at
    )
    values (
      current_uid,
      'System',
      null,
      'system',
      0,
      message_text,
      true,
      now()
    );
  end if;

  delete from public.wheel_spins stale
  where stale.spin_id in (
    select old_spin.spin_id
    from public.wheel_spins old_spin
    order by old_spin.created_at desc, old_spin.spin_id desc
    offset 50
  );

  return created_spin;
end;
$$;

create or replace function public.wheel_create_spin(
  p_session_token text,
  p_bet_amount integer,
  p_client_spin_id text default null
)
returns public.wheel_spins
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_segment public.wheel_segments%rowtype;
begin
  selected_segment := public.wheel_calculate_weighted_result();
  return public.wheel_settle_spin(p_session_token, p_bet_amount, selected_segment.segment_id, p_client_spin_id, false);
end;
$$;

create or replace function public.wheel_create_spin_bot(
  p_session_token text,
  p_bet_amount integer,
  p_client_spin_id text default null
)
returns public.wheel_spins
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_segment public.wheel_segments%rowtype;
begin
  selected_segment := public.wheel_calculate_weighted_result();
  return public.wheel_settle_spin(p_session_token, p_bet_amount, selected_segment.segment_id, p_client_spin_id, true);
end;
$$;

create or replace function public.wheel_create_spin_from_pending(
  p_session_token text,
  p_round_cycle bigint default null
)
returns public.wheel_spins
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  cycle_value bigint := coalesce(p_round_cycle, public.wheel_get_current_cycle());
  pending_record public.wheel_pending_bets%rowtype;
  spin_record public.wheel_spins%rowtype;
  client_spin_id text;
begin
  select *
  into pending_record
  from public.wheel_pending_bets
  where user_id = current_uid
    and round_cycle = cycle_value
  for update;

  if not found then
    raise exception 'No submitted wheel bet found for this round' using errcode = '22023';
  end if;

  client_spin_id := format('wheel-round-%s-%s', cycle_value::text, current_uid::text);
  spin_record := public.wheel_create_spin(p_session_token, pending_record.bet_amount, client_spin_id);

  delete from public.wheel_pending_bets
  where pending_id = pending_record.pending_id;

  return spin_record;
end;
$$;

create or replace function public.wheel_get_public_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  settings_record public.wheel_settings%rowtype;
  last_spin_at timestamptz;
  cooldown_remaining integer := 0;
begin
  select *
  into settings_record
  from public.wheel_settings
  where settings_id = 1;

  if not found then
    insert into public.wheel_settings (settings_id)
    values (1)
    returning * into settings_record;
  end if;

  select ws.created_at
  into last_spin_at
  from public.wheel_spins ws
  order by ws.created_at desc
  limit 1;

  if last_spin_at is not null and settings_record.cooldown_seconds > 0 then
    cooldown_remaining := greatest(0, ceil(extract(epoch from (last_spin_at + make_interval(secs => settings_record.cooldown_seconds) - now())))::integer);
  end if;

  return jsonb_build_object(
    'settings', to_jsonb(settings_record),
    'segments', (
      select coalesce(jsonb_agg(to_jsonb(seg) order by seg.sort_order asc, seg.created_at asc), '[]'::jsonb)
      from public.wheel_segments seg
      where seg.enabled = true
    ),
    'last_spin_at', last_spin_at,
    'cooldown_remaining_seconds', cooldown_remaining
  );
end;
$$;

create or replace function public.wheel_get_recent_spins(p_limit integer default 30)
returns setof public.wheel_spins
language sql
security definer
set search_path = public
as $$
  select *
  from public.wheel_spins
  order by created_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 50)
$$;

create or replace function public.wheel_get_jackpot_info()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with settings as (
    select coalesce(s.default_jackpot, 100000)::bigint as base_jackpot
    from public.wheel_settings s
    where s.settings_id = 1
  ),
  last_jackpot as (
    select max(ws.created_at) as last_jackpot_at
    from public.wheel_spins ws
    where ws.multiplier >= 10
  ),
  contribution as (
    select
      coalesce(sum(abs(pt.amount)), 0)::bigint as total_contribution
    from public.points_transactions pt
    cross join last_jackpot lj
    where pt.game_type = 'wheel_spin'
      and pt.type = 'spin_bet'
      and (lj.last_jackpot_at is null or pt.created_at > lj.last_jackpot_at)
  )
  select jsonb_build_object(
    'base_jackpot', settings.base_jackpot,
    'total_contribution', contribution.total_contribution,
    'jackpot_amount', settings.base_jackpot + floor(contribution.total_contribution * 0.5)
  )
  from contribution
  cross join settings
$$;

create or replace function public.wheel_get_recent_winners(p_limit integer default 20)
returns setof public.wheel_spins
language sql
security definer
set search_path = public
as $$
  select *
  from public.wheel_spins
  where result_amount > bet_amount
  order by created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
$$;

create or replace function public.wheel_get_leaderboard(p_limit integer default 20)
returns setof public.wheel_player_stats
language sql
security definer
set search_path = public
as $$
  select *
  from public.wheel_player_stats
  order by total_winnings desc, updated_at asc
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
$$;

create or replace function public.wheel_get_recent_chat(p_limit integer default 100)
returns setof public.wheel_chat_messages
language sql
security definer
set search_path = public
as $$
  select *
  from public.wheel_chat_messages
  where is_deleted = false
  order by created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 200)
$$;

create or replace function public.wheel_send_chat_message(
  p_session_token text,
  p_text text
)
returns public.wheel_chat_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
  clean_text text := trim(coalesce(p_text, ''));
  recent_message public.wheel_chat_messages%rowtype;
  created_message public.wheel_chat_messages%rowtype;
begin
  if clean_text = '' or char_length(clean_text) > 300 then
    raise exception 'Message must be 1-300 characters' using errcode = '22023';
  end if;

  select *
  into profile
  from public.users
  where uid = current_uid;

  if not found or profile.is_banned then
    raise exception 'Account cannot send wheel chat messages' using errcode = '42501';
  end if;

  select *
  into recent_message
  from public.wheel_chat_messages
  where user_id = current_uid
    and is_deleted = false
    and is_system = false
  order by created_at desc
  limit 1;

  if found and recent_message.created_at > now() - interval '2 seconds' then
    raise exception 'Please wait 2 seconds before sending another message' using errcode = '22023';
  end if;

  insert into public.wheel_chat_messages (
    user_id,
    display_name,
    avatar,
    role,
    vip_level,
    text,
    is_system,
    created_at
  )
  values (
    current_uid,
    profile.display_name,
    profile.avatar_url,
    case when profile.role = 'admin' then 'admin' else 'user' end,
    profile.vip_level,
    clean_text,
    false,
    now()
  )
  returning * into created_message;

  return created_message;
end;
$$;

drop function if exists public.admin_wheel_update_settings(text, boolean, integer, integer, integer, jsonb, integer);
drop function if exists public.admin_wheel_update_settings(text, boolean, integer, integer, integer, integer, jsonb, integer);
drop function if exists public.admin_wheel_update_settings(text, boolean, integer, integer, integer, bigint, jsonb, integer);

create or replace function public.admin_wheel_update_settings(
  p_session_token text,
  p_enabled boolean,
  p_min_bet integer,
  p_max_bet integer,
  p_cooldown_seconds integer,
  p_default_jackpot bigint,
  p_segments jsonb,
  p_expected_version integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_uid uuid := public.assert_admin(p_session_token);
  settings_record public.wheel_settings%rowtype;
  before_snapshot jsonb;
  after_snapshot jsonb;
  enabled_probability_total numeric;
begin
  if p_min_bet < 1 or p_max_bet < p_min_bet then
    raise exception 'Invalid min/max bet range' using errcode = '22023';
  end if;

  if p_cooldown_seconds < 0 or p_cooldown_seconds > 3600 then
    raise exception 'Cooldown must be 0-3600 seconds' using errcode = '22023';
  end if;

  if p_default_jackpot < 0 then
    raise exception 'Default jackpot must be >= 0' using errcode = '22023';
  end if;

  if jsonb_typeof(p_segments) <> 'array' then
    raise exception 'Segments payload must be an array' using errcode = '22023';
  end if;

  if jsonb_array_length(p_segments) = 0 then
    raise exception 'At least one segment is required' using errcode = '22023';
  end if;

  select *
  into settings_record
  from public.wheel_settings
  where settings_id = 1
  for update;

  if not found then
    insert into public.wheel_settings (settings_id)
    values (1)
    returning * into settings_record;
  end if;

  if p_expected_version is not null and settings_record.version <> p_expected_version then
    raise exception 'Settings version conflict. Expected %, current %', p_expected_version, settings_record.version using errcode = '40001';
  end if;

  with parsed as (
    select
      trim(coalesce(item ->> 'label', '')) as label,
      coalesce((item ->> 'multiplier')::numeric, -1) as multiplier,
      coalesce((item ->> 'probability')::numeric, -1) as probability,
      trim(coalesce(item ->> 'color', '')) as color,
      coalesce((item ->> 'enabled')::boolean, true) as enabled,
      coalesce((item ->> 'sort_order')::integer, ordinality::integer) as sort_order
    from jsonb_array_elements(p_segments) with ordinality as src(item, ordinality)
  )
  select coalesce(sum(probability), 0)
  into enabled_probability_total
  from parsed
  where enabled = true;

  if exists (
    select 1
    from jsonb_array_elements(p_segments) as src(item)
    where trim(coalesce(item ->> 'label', '')) = ''
      or coalesce((item ->> 'multiplier')::numeric, -1) < 0
      or coalesce((item ->> 'probability')::numeric, -1) < 0
      or trim(coalesce(item ->> 'color', '')) = ''
  ) then
    raise exception 'Invalid segment payload values' using errcode = '22023';
  end if;

  if abs(enabled_probability_total - 100) > 0.0001 then
    raise exception 'Enabled probability must total exactly 100%%' using errcode = '22023';
  end if;

  before_snapshot := public.wheel_get_settings_snapshot();

  update public.wheel_settings
  set enabled = coalesce(p_enabled, enabled),
      min_bet = p_min_bet,
      max_bet = p_max_bet,
      cooldown_seconds = p_cooldown_seconds,
      default_jackpot = p_default_jackpot,
      updated_by = admin_uid,
      updated_at = now(),
      version = version + 1
  where settings_id = 1;

  delete from public.wheel_segments
  where segment_id is not null;

  insert into public.wheel_segments (label, multiplier, probability, color, enabled, sort_order)
  select
    trim(coalesce(item ->> 'label', '')),
    coalesce((item ->> 'multiplier')::numeric, 0),
    coalesce((item ->> 'probability')::numeric, 0),
    trim(coalesce(item ->> 'color', '')),
    coalesce((item ->> 'enabled')::boolean, true),
    coalesce((item ->> 'sort_order')::integer, ordinality::integer)
  from jsonb_array_elements(p_segments) with ordinality as src(item, ordinality)
  order by coalesce((item ->> 'sort_order')::integer, ordinality::integer) asc;

  after_snapshot := public.wheel_get_settings_snapshot();

  insert into public.admin_logs (admin_id, action, details)
  values (
    admin_uid,
    'update_wheel_settings',
    jsonb_build_object(
      'before_settings', before_snapshot,
      'after_settings', after_snapshot
    )
  );

  return after_snapshot;
end;
$$;

create or replace function public.admin_wheel_reset_default_settings(
  p_session_token text,
  p_expected_version integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_uid uuid := public.assert_admin(p_session_token);
  settings_record public.wheel_settings%rowtype;
  before_snapshot jsonb;
  after_snapshot jsonb;
begin
  select *
  into settings_record
  from public.wheel_settings
  where settings_id = 1
  for update;

  if not found then
    insert into public.wheel_settings (settings_id)
    values (1)
    returning * into settings_record;
  end if;

  if p_expected_version is not null and settings_record.version <> p_expected_version then
    raise exception 'Settings version conflict. Expected %, current %', p_expected_version, settings_record.version using errcode = '40001';
  end if;

  before_snapshot := public.wheel_get_settings_snapshot();

  update public.wheel_settings
  set enabled = true,
      min_bet = 10,
      max_bet = 100000,
      cooldown_seconds = 3,
      default_jackpot = 100000,
      updated_by = admin_uid,
      updated_at = now(),
      version = version + 1
  where settings_id = 1;

  delete from public.wheel_segments
  where segment_id is not null;

  insert into public.wheel_segments (label, multiplier, probability, color, enabled, sort_order)
  values
    ('Mat Trang', 0, 40, '#ef4444', true, 1),
    ('An Ui', 0.5, 20, '#f59e0b', true, 2),
    ('Hoa Von', 1, 20, '#38bdf8', true, 3),
    ('Gap Doi', 2, 10, '#22c55e', true, 4),
    ('Sieu Loi', 3, 6, '#8b5cf6', true, 5),
    ('Mega Win', 5, 3, '#ec4899', true, 6),
    ('JACKPOT', 10, 1, '#facc15', true, 7);

  after_snapshot := public.wheel_get_settings_snapshot();

  insert into public.admin_logs (admin_id, action, details)
  values (
    admin_uid,
    'update_wheel_settings',
    jsonb_build_object(
      'before_settings', before_snapshot,
      'after_settings', after_snapshot,
      'reset_default', true
    )
  );

  return after_snapshot;
end;
$$;

create or replace function public.admin_get_stats(p_session_token text)
returns table (
  total_users bigint,
  online_users bigint,
  total_bets bigint,
  total_rounds bigint,
  total_points bigint,
  total_locked_points bigint,
  total_wins bigint,
  total_losses bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  wheel_pending_locked bigint := 0;
begin
  perform public.assert_admin(p_session_token);

  if to_regclass('public.wheel_pending_bets') is not null then
    select coalesce(sum(wpb.bet_amount), 0)::bigint
    into wheel_pending_locked
    from public.wheel_pending_bets wpb
    where wpb.round_cycle = public.wheel_get_current_cycle();
  end if;

  return query
  select
    (select count(*) from public.users),
    0::bigint,
    (select count(*) from public.bets),
    (select count(*) from public.rounds),
    (select coalesce(sum(u.points), 0)::bigint from public.users u),
    (select coalesce(sum(u.locked_points), 0)::bigint from public.users u) + wheel_pending_locked,
    (select coalesce(sum(u.total_wins), 0)::bigint from public.users u),
    (select coalesce(sum(u.total_losses), 0)::bigint from public.users u);
end;
$$;

create or replace function public.admin_wheel_get_house_pnl(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  total_bet bigint := 0;
  total_payout bigint := 0;
  total_spins bigint := 0;
begin
  perform public.assert_admin(p_session_token);

  select
    coalesce(sum(case when pt.type = 'spin_bet' then abs(pt.amount) else 0 end), 0)::bigint,
    coalesce(sum(case when pt.type = 'spin_win' then pt.amount else 0 end), 0)::bigint
  into total_bet, total_payout
  from public.points_transactions pt
  where pt.game_type = 'wheel_spin';

  select coalesce(count(*), 0)::bigint
  into total_spins
  from public.points_transactions pt
  where pt.game_type = 'wheel_spin'
    and pt.type = 'spin_bet';

  return jsonb_build_object(
    'total_bet', total_bet,
    'total_payout', total_payout,
    'total_spins', total_spins,
    'house_pnl', total_bet - total_payout
  );
end;
$$;

revoke all on public.wheel_settings from anon, authenticated;
revoke all on public.wheel_segments from anon, authenticated;
revoke all on public.wheel_spins from anon, authenticated;
revoke all on public.wheel_pending_bets from anon, authenticated;
revoke all on public.wheel_chat_messages from anon, authenticated;
revoke all on public.wheel_player_stats from anon, authenticated;

revoke all on function public.wheel_validate_bet(text, integer, boolean) from public, anon, authenticated;
revoke all on function public.wheel_submit_bet(text, integer, bigint) from public, anon, authenticated;
revoke all on function public.wheel_get_my_pending_bet(text, bigint) from public, anon, authenticated;
revoke all on function public.wheel_calculate_weighted_result() from public, anon, authenticated;
revoke all on function public.wheel_settle_spin(text, integer, uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.wheel_create_spin(text, integer, text) from public, anon, authenticated;
revoke all on function public.wheel_create_spin_bot(text, integer, text) from public, anon, authenticated;
revoke all on function public.wheel_create_spin_from_pending(text, bigint) from public, anon, authenticated;
revoke all on function public.wheel_get_public_state() from public, anon, authenticated;
revoke all on function public.wheel_get_recent_spins(integer) from public, anon, authenticated;
revoke all on function public.wheel_get_recent_winners(integer) from public, anon, authenticated;
revoke all on function public.wheel_get_leaderboard(integer) from public, anon, authenticated;
revoke all on function public.wheel_get_jackpot_info() from public, anon, authenticated;
revoke all on function public.wheel_get_recent_chat(integer) from public, anon, authenticated;
revoke all on function public.wheel_send_chat_message(text, text) from public, anon, authenticated;
revoke all on function public.admin_wheel_update_settings(text, boolean, integer, integer, integer, bigint, jsonb, integer) from public, anon, authenticated;
revoke all on function public.admin_wheel_reset_default_settings(text, integer) from public, anon, authenticated;
revoke all on function public.admin_wheel_get_house_pnl(text) from public, anon, authenticated;

grant execute on function public.wheel_validate_bet(text, integer, boolean) to anon, authenticated;
grant execute on function public.wheel_submit_bet(text, integer, bigint) to anon, authenticated;
grant execute on function public.wheel_get_my_pending_bet(text, bigint) to anon, authenticated;
grant execute on function public.wheel_create_spin(text, integer, text) to anon, authenticated;
grant execute on function public.wheel_create_spin_from_pending(text, bigint) to anon, authenticated;
grant execute on function public.wheel_get_public_state() to anon, authenticated;
grant execute on function public.wheel_get_recent_spins(integer) to anon, authenticated;
grant execute on function public.wheel_get_recent_winners(integer) to anon, authenticated;
grant execute on function public.wheel_get_leaderboard(integer) to anon, authenticated;
grant execute on function public.wheel_get_jackpot_info() to anon, authenticated;
grant execute on function public.wheel_get_recent_chat(integer) to anon, authenticated;
grant execute on function public.wheel_send_chat_message(text, text) to anon, authenticated;
grant execute on function public.admin_wheel_update_settings(text, boolean, integer, integer, integer, bigint, jsonb, integer) to anon, authenticated;
grant execute on function public.admin_wheel_reset_default_settings(text, integer) to anon, authenticated;
grant execute on function public.admin_wheel_get_house_pnl(text) to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wheel_settings'
  ) then
    alter publication supabase_realtime add table public.wheel_settings;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wheel_segments'
  ) then
    alter publication supabase_realtime add table public.wheel_segments;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wheel_spins'
  ) then
    alter publication supabase_realtime add table public.wheel_spins;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wheel_pending_bets'
  ) then
    alter publication supabase_realtime add table public.wheel_pending_bets;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wheel_chat_messages'
  ) then
    alter publication supabase_realtime add table public.wheel_chat_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wheel_player_stats'
  ) then
    alter publication supabase_realtime add table public.wheel_player_stats;
  end if;
end $$;

notify pgrst, 'reload schema';


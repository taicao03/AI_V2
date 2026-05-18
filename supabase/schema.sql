create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
set search_path = public, extensions;

drop view if exists public.bet_history;

drop function if exists public.get_current_round();
drop function if exists public.settle_due_rounds();
drop function if exists public.ensure_active_round();
drop function if exists public.prune_old_round_history(integer);
drop function if exists public.random_die();
drop function if exists public.place_bet(text, text, integer);
drop function if exists public.place_bet(text, text, text, integer);
drop function if exists public.claim_demo_points();
drop function if exists public.claim_demo_points(text);
drop function if exists public.ensure_user_profile(text);
drop function if exists public.ensure_user_profile(text, text);
drop function if exists public.touch_last_login();
drop function if exists public.get_account_profile(text);
drop function if exists public.update_account_profile(text, text, text);
drop function if exists public.logout_account(text);
drop function if exists public.login_account(text, text);
drop function if exists public.register_account(text, text, text);
drop function if exists public.get_session_user_id(text);
drop function if exists public.create_account_session(uuid);
drop function if exists public.hash_session_token(text);

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create table if not exists public.users (
  uid uuid primary key default gen_random_uuid(),
  account_name text not null,
  display_name text not null default 'Demo player',
  email text not null default '',
  avatar_url text,
  vip_level smallint not null default 0 check (vip_level between 0 and 10),
  points integer not null default 1000 check (points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz,
  last_demo_refill_at timestamptz
);

alter table public.users drop constraint if exists users_uid_fkey;
alter table public.users alter column uid set default gen_random_uuid();
alter table public.users alter column email set default '';
update public.users set email = '' where email is null;

create table if not exists public.user_credentials (
  uid uuid primary key references public.users(uid) on delete cascade,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.account_sessions (
  session_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(uid) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create table if not exists public.leaderboard (
  uid uuid primary key references public.users(uid) on delete cascade,
  account_name text not null,
  display_name text not null,
  avatar_url text,
  vip_level smallint not null default 0 check (vip_level between 0 and 10),
  points integer not null check (points >= 0),
  updated_at timestamptz not null
);

create table if not exists public.rounds (
  round_id uuid primary key default gen_random_uuid(),
  status text not null default 'open' check (status in ('open', 'settled')),
  dice smallint[],
  total smallint generated always as (
    case
      when array_length(dice, 1) = 3 then (dice[1] + dice[2] + dice[3])::smallint
      else null
    end
  ) stored,
  result_type text generated always as (
    case
      when array_length(dice, 1) <> 3 or dice is null then null
      when (dice[1] + dice[2] + dice[3]) between 3 and 10 then 'xiu'
      else 'tai'
    end
  ) stored,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null default (now() + interval '30 seconds'),
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.users(uid) on delete set null,
  constraint rounds_dice_shape check (dice is null or array_length(dice, 1) = 3),
  constraint rounds_values check (
    dice is null
    or (
      dice[1] between 1 and 6
      and dice[2] between 1 and 6
      and dice[3] between 1 and 6
    )
  ),
  constraint rounds_settled_state check (
    (status = 'open' and dice is null and settled_at is null)
    or
    (status = 'settled' and dice is not null and settled_at is not null)
  )
);

create table if not exists public.bets (
  bet_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(uid) on delete cascade,
  round_id uuid not null references public.rounds(round_id) on delete cascade,
  prediction_type text not null check (prediction_type in ('tai_xiu', 'total')),
  prediction_value text not null,
  bet_amount integer not null check (bet_amount >= 1),
  result text not null default 'pending' check (result in ('pending', 'win', 'lose')),
  points_change integer not null default 0,
  created_at timestamptz not null default now(),
  constraint bets_prediction_value check (
    (
      prediction_type = 'tai_xiu'
      and prediction_value in ('tai', 'xiu')
    )
    or (
      prediction_type = 'total'
      and case
        when prediction_value ~ '^[0-9]+$' then prediction_value::integer between 3 and 18
        else false
      end
    )
  )
);

alter table public.users add column if not exists account_name text;
update public.users
set account_name = left(lower(regexp_replace(coalesce(nullif(account_name, ''), nullif(split_part(email, '@', 1), ''), uid::text), '[^a-z0-9_]+', '_', 'g')), 24)
where account_name is null
  or account_name = '';
update public.users
set account_name = 'user_' || substring(uid::text from 1 for 8)
where length(account_name) < 3;
with ranked_accounts as (
  select uid, account_name, row_number() over (partition by account_name order by created_at, uid) as row_number
  from public.users
)
update public.users u
set account_name = left(r.account_name, 15) || '_' || substring(u.uid::text from 1 for 8)
from ranked_accounts r
where u.uid = r.uid
  and r.row_number > 1;
alter table public.users alter column account_name set not null;
alter table public.users drop constraint if exists users_account_name_format;
alter table public.users add constraint users_account_name_format check (account_name ~ '^[a-z0-9_]{3,24}$');
create unique index if not exists users_account_name_key on public.users (account_name);

alter table public.leaderboard add column if not exists account_name text;
update public.leaderboard l
set account_name = u.account_name
from public.users u
where l.uid = u.uid
  and (l.account_name is null or l.account_name = '');
update public.leaderboard
set account_name = 'user_' || substring(uid::text from 1 for 8)
where account_name is null
  or account_name = '';
alter table public.leaderboard alter column account_name set not null;

alter table public.users add column if not exists vip_level smallint not null default 0;
alter table public.users drop constraint if exists users_vip_level_check;
alter table public.users add constraint users_vip_level_check check (vip_level between 0 and 10);
alter table public.leaderboard add column if not exists vip_level smallint not null default 0;
alter table public.leaderboard drop constraint if exists leaderboard_vip_level_check;
alter table public.leaderboard add constraint leaderboard_vip_level_check check (vip_level between 0 and 10);

alter table public.rounds drop constraint if exists rounds_three_dice;
alter table public.rounds drop constraint if exists rounds_values;
alter table public.rounds drop constraint if exists rounds_total_range;
alter table public.rounds drop constraint if exists rounds_result_type;
alter table public.rounds drop constraint if exists rounds_status_check;
alter table public.rounds drop constraint if exists rounds_dice_shape;
alter table public.rounds drop constraint if exists rounds_settled_state;
alter table public.rounds alter column dice drop not null;
alter table public.rounds alter column created_by drop not null;
alter table public.rounds drop column if exists total;
alter table public.rounds drop column if exists result_type;
alter table public.rounds add column if not exists status text;
alter table public.rounds add column if not exists starts_at timestamptz;
alter table public.rounds add column if not exists ends_at timestamptz;
alter table public.rounds add column if not exists settled_at timestamptz;

update public.rounds
set status = case when dice is null then 'open' else 'settled' end
where status is null;

update public.rounds
set starts_at = coalesce(starts_at, created_at, now())
where starts_at is null;

update public.rounds
set ends_at = coalesce(ends_at, starts_at + interval '30 seconds', created_at + interval '30 seconds', now() + interval '30 seconds')
where ends_at is null;

update public.rounds
set settled_at = coalesce(settled_at, created_at, now())
where status = 'settled'
  and settled_at is null;

alter table public.rounds alter column status set default 'open';
alter table public.rounds alter column status set not null;
alter table public.rounds alter column starts_at set default now();
alter table public.rounds alter column starts_at set not null;
alter table public.rounds alter column ends_at set default (now() + interval '30 seconds');
alter table public.rounds alter column ends_at set not null;
alter table public.rounds
  add column total smallint generated always as (
    case
      when array_length(dice, 1) = 3 then (dice[1] + dice[2] + dice[3])::smallint
      else null
    end
  ) stored;
alter table public.rounds
  add column result_type text generated always as (
    case
      when array_length(dice, 1) <> 3 or dice is null then null
      when (dice[1] + dice[2] + dice[3]) between 3 and 10 then 'xiu'
      else 'tai'
    end
  ) stored;
alter table public.rounds add constraint rounds_status_check check (
  status in ('open', 'settled', 'betting', 'locked', 'rolling', 'completed', 'cancelled')
);
alter table public.rounds add constraint rounds_dice_shape check (dice is null or array_length(dice, 1) = 3);
alter table public.rounds add constraint rounds_values check (
  dice is null
  or (
    dice[1] between 1 and 6
    and dice[2] between 1 and 6
    and dice[3] between 1 and 6
  )
);
alter table public.rounds add constraint rounds_settled_state check (
  (status in ('open', 'betting', 'locked') and dice is null)
  or
  (status in ('settled', 'rolling', 'completed', 'cancelled'))
);

alter table public.bets drop constraint if exists bets_result_check;
alter table public.bets drop constraint if exists bets_prediction_value;
alter table public.bets alter column result set default 'pending';
alter table public.bets alter column points_change set default 0;
update public.bets set result = 'pending' where result is null;
update public.bets set points_change = 0 where points_change is null;
alter table public.bets alter column result set not null;
alter table public.bets alter column points_change set not null;
alter table public.bets add constraint bets_result_check check (result in ('pending', 'win', 'lose'));
alter table public.bets add constraint bets_prediction_value check (
  (
    prediction_type = 'tai_xiu'
    and prediction_value in ('tai', 'xiu')
  )
  or (
    prediction_type = 'total'
    and case
      when prediction_value ~ '^[0-9]+$' then prediction_value::integer between 3 and 18
      else false
    end
  )
);

create index if not exists account_sessions_user_idx on public.account_sessions (user_id);
create index if not exists account_sessions_expires_at_idx on public.account_sessions (expires_at);
create index if not exists rounds_status_ends_at_idx on public.rounds (status, ends_at);
create index if not exists rounds_created_at_idx on public.rounds (created_at desc);
create index if not exists bets_created_at_idx on public.bets (created_at desc);
create index if not exists bets_round_idx on public.bets (round_id);
create index if not exists bets_user_created_at_idx on public.bets (user_id, created_at desc);
create index if not exists leaderboard_points_idx on public.leaderboard (points desc, updated_at asc);

drop view if exists public.bet_history;
create view public.bet_history
with (security_invoker = true)
as
select
  b.bet_id,
  b.user_id,
  b.round_id,
  b.prediction_type,
  b.prediction_value,
  b.bet_amount,
  b.result,
  b.points_change,
  b.created_at,
  r.status as round_status,
  r.dice,
  r.total,
  r.result_type,
  r.starts_at,
  r.ends_at,
  r.settled_at,
  r.created_at as round_created_at,
  l.display_name,
  l.avatar_url
from public.bets b
join public.rounds r on r.round_id = b.round_id
left join public.leaderboard l on l.uid = b.user_id;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
  before update on public.users
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_user_credentials_updated_at on public.user_credentials;
create trigger set_user_credentials_updated_at
  before update on public.user_credentials
  for each row
  execute function public.set_updated_at();

create or replace function public.sync_leaderboard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.leaderboard (uid, account_name, display_name, avatar_url, vip_level, points, updated_at)
  values (new.uid, new.account_name, new.display_name, new.avatar_url, new.vip_level, new.points, new.updated_at)
  on conflict (uid) do update
    set account_name = excluded.account_name,
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        vip_level = excluded.vip_level,
        points = excluded.points,
        updated_at = excluded.updated_at;

  return new;
end;
$$;

drop trigger if exists sync_users_leaderboard on public.users;
create trigger sync_users_leaderboard
  after insert or update of account_name, display_name, avatar_url, vip_level, points, updated_at on public.users
  for each row
  execute function public.sync_leaderboard();

insert into public.leaderboard (uid, account_name, display_name, avatar_url, vip_level, points, updated_at)
select uid, account_name, display_name, avatar_url, vip_level, points, updated_at
from public.users
on conflict (uid) do update
  set account_name = excluded.account_name,
      display_name = excluded.display_name,
      avatar_url = excluded.avatar_url,
      vip_level = excluded.vip_level,
      points = excluded.points,
      updated_at = excluded.updated_at;

create or replace function public.hash_session_token(p_session_token text)
returns text
language sql
stable
security definer
set search_path = public, extensions
as $$
  select encode(digest(coalesce($1, ''), 'sha256'), 'hex')
$$;

create or replace function public.create_account_session(p_user_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  raw_token text;
begin
  raw_token := encode(gen_random_bytes(32), 'hex');

  insert into public.account_sessions (user_id, token_hash, expires_at)
  values (p_user_id, public.hash_session_token(raw_token), now() + interval '30 days');

  return raw_token;
end;
$$;

create or replace function public.get_session_user_id(p_session_token text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  session_uid uuid;
begin
  if p_session_token is null or length(trim(p_session_token)) < 32 then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  delete from public.account_sessions
  where expires_at <= now();

  select s.user_id
  into session_uid
  from public.account_sessions s
  where s.token_hash = public.hash_session_token(p_session_token)
    and s.expires_at > now()
  limit 1;

  if session_uid is null then
    raise exception 'Session expired. Please sign in again.' using errcode = '28000';
  end if;

  return session_uid;
end;
$$;

create or replace function public.register_account(
  p_account_name text,
  p_display_name text,
  p_password text
)
returns table (
  session_token text,
  uid uuid,
  account_name text,
  display_name text,
  email text,
  avatar_url text,
  vip_level smallint,
  points integer,
  created_at timestamptz,
  updated_at timestamptz,
  last_login_at timestamptz,
  last_demo_refill_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  safe_account text := lower(trim(coalesce(p_account_name, '')));
  safe_name text := nullif(trim(coalesce(p_display_name, '')), '');
  profile public.users%rowtype;
  new_session_token text;
begin
  if safe_account !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'Invalid account name' using errcode = '22023';
  end if;

  if p_password is null or length(p_password) < 6 then
    raise exception 'Password must be at least 6 characters' using errcode = '22023';
  end if;

  select *
  into profile
  from public.users u
  where u.account_name = safe_account
  for update;

  if found then
    if exists (select 1 from public.user_credentials c where c.uid = profile.uid) then
      raise exception 'Account name already exists' using errcode = '23505';
    end if;

    update public.users
    set display_name = coalesce(safe_name, public.users.display_name),
        email = '',
        last_login_at = now()
    where public.users.uid = profile.uid
    returning * into profile;
  else
    insert into public.users (account_name, display_name, email, points, created_at, updated_at, last_login_at)
    values (safe_account, coalesce(safe_name, safe_account), '', 1000, now(), now(), now())
    returning * into profile;
  end if;

  insert into public.user_credentials (uid, password_hash)
  values (profile.uid, crypt(p_password, gen_salt('bf')));

  new_session_token := public.create_account_session(profile.uid);

  return query select
    new_session_token,
    profile.uid,
    profile.account_name,
    profile.display_name,
    profile.email,
    profile.avatar_url,
    profile.vip_level,
    profile.points,
    profile.created_at,
    profile.updated_at,
    profile.last_login_at,
    profile.last_demo_refill_at;
end;
$$;

create or replace function public.login_account(
  p_account_name text,
  p_password text
)
returns table (
  session_token text,
  uid uuid,
  account_name text,
  display_name text,
  email text,
  avatar_url text,
  vip_level smallint,
  points integer,
  created_at timestamptz,
  updated_at timestamptz,
  last_login_at timestamptz,
  last_demo_refill_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  safe_account text := lower(trim(coalesce(p_account_name, '')));
  profile public.users%rowtype;
  stored_hash text;
  new_session_token text;
begin
  if safe_account !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'Invalid account name or password' using errcode = '28000';
  end if;

  select *
  into profile
  from public.users u
  where u.account_name = safe_account;

  if not found then
    raise exception 'Invalid account name or password' using errcode = '28000';
  end if;

  select c.password_hash
  into stored_hash
  from public.user_credentials c
  where c.uid = profile.uid;

  if stored_hash is null or crypt(p_password, stored_hash) <> stored_hash then
    raise exception 'Invalid account name or password' using errcode = '28000';
  end if;

  update public.users
  set last_login_at = now()
  where public.users.uid = profile.uid
  returning * into profile;

  new_session_token := public.create_account_session(profile.uid);

  return query select
    new_session_token,
    profile.uid,
    profile.account_name,
    profile.display_name,
    profile.email,
    profile.avatar_url,
    profile.vip_level,
    profile.points,
    profile.created_at,
    profile.updated_at,
    profile.last_login_at,
    profile.last_demo_refill_at;
end;
$$;

create or replace function public.logout_account(p_session_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.account_sessions
  where token_hash = public.hash_session_token(p_session_token);
end;
$$;

create or replace function public.get_account_profile(p_session_token text)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  session_uid uuid;
  profile public.users%rowtype;
begin
  session_uid := public.get_session_user_id(p_session_token);

  select *
  into profile
  from public.users u
  where u.uid = session_uid;

  if not found then
    raise exception 'User profile not found' using errcode = 'P0002';
  end if;

  return profile;
end;
$$;

create or replace function public.update_account_profile(
  p_session_token text,
  p_display_name text,
  p_avatar_url text default null
)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  session_uid uuid;
  profile public.users%rowtype;
begin
  session_uid := public.get_session_user_id(p_session_token);

  update public.users
  set display_name = coalesce(nullif(trim(p_display_name), ''), display_name),
      avatar_url = nullif(trim(coalesce(p_avatar_url, '')), '')
  where public.users.uid = session_uid
  returning * into profile;

  return profile;
end;
$$;

create or replace function public.random_die()
returns smallint
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  value integer;
begin
  loop
    value := get_byte(gen_random_bytes(1), 0);

    if value < 252 then
      return ((value % 6) + 1)::smallint;
    end if;
  end loop;
end;
$$;

create or replace function public.ensure_active_round()
returns public.rounds
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  active_round public.rounds;
begin
  perform pg_advisory_xact_lock(hashtext('dice_predictor_active_round'));

  select *
  into active_round
  from public.rounds
  where status = 'open'
    and ends_at > now()
  order by starts_at desc
  limit 1;

  if found then
    return active_round;
  end if;

  insert into public.rounds (status, starts_at, ends_at, created_at)
  values ('open', now(), now() + interval '30 seconds', now())
  returning * into active_round;

  return active_round;
end;
$$;

create or replace function public.settle_due_rounds()
returns table (
  settled_round_id uuid,
  active_round_id uuid
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  due_round public.rounds%rowtype;
  bet_record public.bets%rowtype;
  rolled_dice smallint[];
  rolled_total smallint;
  rolled_result_type text;
  is_win boolean;
  delta integer;
  active_round public.rounds;
begin
  for due_round in
    select *
    from public.rounds
    where status = 'open'
      and ends_at <= now()
    order by ends_at asc
    for update skip locked
  loop
    rolled_dice := array[public.random_die(), public.random_die(), public.random_die()]::smallint[];
    rolled_total := (rolled_dice[1] + rolled_dice[2] + rolled_dice[3])::smallint;
    rolled_result_type := case when rolled_total between 3 and 10 then 'xiu' else 'tai' end;

    update public.rounds
    set status = 'settled',
        dice = rolled_dice,
        settled_at = now()
    where round_id = due_round.round_id;

    for bet_record in
      select *
      from public.bets b
      where b.round_id = due_round.round_id
        and b.result = 'pending'
      for update
    loop
      if bet_record.prediction_type = 'tai_xiu' then
        is_win := bet_record.prediction_value = rolled_result_type;
        delta := case when is_win then bet_record.bet_amount else -bet_record.bet_amount end;
      else
        is_win := bet_record.prediction_value::integer = rolled_total;
        delta := case when is_win then bet_record.bet_amount * 5 else -bet_record.bet_amount end;
      end if;

      update public.bets
      set result = case when is_win then 'win' else 'lose' end,
          points_change = delta
      where bet_id = bet_record.bet_id;

      update public.users
      set points = greatest(0, public.users.points + delta)
      where uid = bet_record.user_id;
    end loop;

    active_round := public.ensure_active_round();
    settled_round_id := due_round.round_id;
    active_round_id := active_round.round_id;
    return next;
  end loop;

  active_round := public.ensure_active_round();
  settled_round_id := null;
  active_round_id := active_round.round_id;
  return next;
end;
$$;

create or replace function public.get_current_round()
returns public.rounds
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  active_round public.rounds;
begin
  perform public.settle_due_rounds();
  active_round := public.ensure_active_round();
  return active_round;
end;
$$;

drop function if exists public.place_bet(text, text, text, integer);
drop function if exists public.place_bet(text, text, text, integer);
create function public.place_bet(
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
  pending_stake integer;
  new_bet public.bets%rowtype;
  normalized_value text := lower(trim(coalesce(p_prediction_value, '')));
begin
  perform public.settle_due_rounds();
  active_round := public.ensure_active_round();

  if active_round.ends_at <= now() then
    raise exception 'Round is closed' using errcode = '22023';
  end if;

  if p_bet_amount is null or p_bet_amount < 1 then
    raise exception 'Bet amount must be at least 1' using errcode = '22023';
  end if;

  if p_prediction_type is null or p_prediction_type not in ('tai_xiu', 'total') then
    raise exception 'Invalid prediction type' using errcode = '22023';
  end if;

  if p_prediction_type = 'tai_xiu' and normalized_value not in ('tai', 'xiu') then
    raise exception 'Invalid Tai/Xiu prediction' using errcode = '22023';
  end if;

  if p_prediction_type = 'total' then
    if normalized_value !~ '^[0-9]+$' then
      raise exception 'Invalid total prediction' using errcode = '22023';
    end if;

    if normalized_value::integer not between 3 and 18 then
      raise exception 'Invalid total prediction' using errcode = '22023';
    end if;
  end if;

  select *
  into locked_user
  from public.users u
  where u.uid = current_uid
  for update;

  if not found then
    raise exception 'User profile not found' using errcode = 'P0002';
  end if;

  select coalesce(sum(b.bet_amount), 0)
  into pending_stake
  from public.bets b
  where b.user_id = current_uid
    and b.result = 'pending';

  if locked_user.points - pending_stake < p_bet_amount then
    raise exception 'Not enough demo points after pending bets' using errcode = '22023';
  end if;

  insert into public.bets (
    user_id,
    round_id,
    prediction_type,
    prediction_value,
    bet_amount
  )
  values (
    current_uid,
    active_round.round_id,
    p_prediction_type,
    normalized_value,
    p_bet_amount
  )
  returning * into new_bet;

  bet_id := new_bet.bet_id;
  round_id := new_bet.round_id;
  prediction_type := new_bet.prediction_type;
  prediction_value := new_bet.prediction_value;
  bet_amount := new_bet.bet_amount;
  result := new_bet.result;
  points_change := new_bet.points_change;
  created_at := new_bet.created_at;
  round_starts_at := active_round.starts_at;
  round_ends_at := active_round.ends_at;
  available_points := locked_user.points - pending_stake - p_bet_amount;

  return next;
end;
$$;

drop function if exists public.claim_demo_points(text);
create or replace function public.claim_demo_points(p_session_token text)
returns table (
  points integer,
  last_demo_refill_at timestamptz,
  next_available_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  locked_user public.users%rowtype;
  next_refill_at timestamptz;
begin
  select *
  into locked_user
  from public.users u
  where u.uid = current_uid
  for update;

  if not found then
    raise exception 'User profile not found' using errcode = 'P0002';
  end if;

  if locked_user.points > 0 then
    raise exception 'Demo refill is only available at 0 points' using errcode = '22023';
  end if;

  next_refill_at := locked_user.last_demo_refill_at + interval '24 hours';

  if locked_user.last_demo_refill_at is not null and next_refill_at > now() then
    raise exception 'Demo refill is available once every 24 hours' using errcode = '22023';
  end if;

  update public.users
  set points = 1000,
      last_demo_refill_at = now()
  where uid = current_uid
  returning public.users.points, public.users.last_demo_refill_at, public.users.last_demo_refill_at + interval '24 hours'
  into points, last_demo_refill_at, next_available_at;

  return next;
end;
$$;

alter table public.users enable row level security;
alter table public.user_credentials enable row level security;
alter table public.account_sessions enable row level security;
alter table public.leaderboard enable row level security;
alter table public.rounds enable row level security;
alter table public.bets enable row level security;

drop policy if exists "Users can read own profile" on public.users;
drop policy if exists "Users can update own basic profile" on public.users;
drop policy if exists "Anyone can read users" on public.users;
create policy "Anyone can read users"
  on public.users
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can read leaderboard" on public.leaderboard;
create policy "Anyone can read leaderboard"
  on public.leaderboard
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can read rounds" on public.rounds;
create policy "Anyone can read rounds"
  on public.rounds
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can read bets" on public.bets;
create policy "Anyone can read bets"
  on public.bets
  for select
  to anon, authenticated
  using (true);

revoke all on public.users from anon, authenticated;
revoke update (display_name, avatar_url) on public.users from anon, authenticated;
revoke all on public.user_credentials from anon, authenticated;
revoke all on public.account_sessions from anon, authenticated;
revoke all on public.leaderboard from anon, authenticated;
revoke all on public.rounds from anon, authenticated;
revoke all on public.bets from anon, authenticated;
revoke all on public.bet_history from anon, authenticated;
revoke all on function public.random_die() from public, anon, authenticated;
revoke all on function public.ensure_active_round() from public, anon, authenticated;
revoke all on function public.hash_session_token(text) from public, anon, authenticated;
revoke all on function public.create_account_session(uuid) from public, anon, authenticated;
revoke all on function public.get_session_user_id(text) from public, anon, authenticated;
revoke all on function public.register_account(text, text, text) from public, anon, authenticated;
revoke all on function public.login_account(text, text) from public, anon, authenticated;
revoke all on function public.logout_account(text) from public, anon, authenticated;
revoke all on function public.get_account_profile(text) from public, anon, authenticated;
revoke all on function public.update_account_profile(text, text, text) from public, anon, authenticated;
revoke all on function public.settle_due_rounds() from public, anon, authenticated;
revoke all on function public.get_current_round() from public, anon, authenticated;
revoke all on function public.place_bet(text, text, text, integer) from public, anon, authenticated;
revoke all on function public.claim_demo_points(text) from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.leaderboard to anon, authenticated;
grant select on public.rounds to anon, authenticated;
grant select on public.bets to anon, authenticated;
grant select on public.bet_history to anon, authenticated;
grant execute on function public.register_account(text, text, text) to anon, authenticated;
grant execute on function public.login_account(text, text) to anon, authenticated;
grant execute on function public.logout_account(text) to anon, authenticated;
grant execute on function public.get_account_profile(text) to anon, authenticated;
grant execute on function public.update_account_profile(text, text, text) to anon, authenticated;
grant execute on function public.get_current_round() to anon, authenticated;
grant execute on function public.settle_due_rounds() to anon, authenticated;
grant execute on function public.place_bet(text, text, text, integer) to anon, authenticated;
grant execute on function public.claim_demo_points(text) to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'users'
  ) then
    alter publication supabase_realtime add table public.users;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'leaderboard'
  ) then
    alter publication supabase_realtime add table public.leaderboard;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rounds'
  ) then
    alter publication supabase_realtime add table public.rounds;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bets'
  ) then
    alter publication supabase_realtime add table public.bets;
  end if;
end $$;

notify pgrst, 'reload schema';

-- Production upgrade: server-owned points ledger, realtime chat, and admin RPCs.
-- `points` is the durable balance. `locked_points` is reserved stake that still
-- belongs to the user until a round is settled or cancelled. Frontend must show
-- available_points = points - locked_points and must never write either column.

alter table public.users add column if not exists role text not null default 'user';
alter table public.users add column if not exists locked_points integer not null default 0;
alter table public.users add column if not exists total_bets integer not null default 0;
alter table public.users add column if not exists total_wins integer not null default 0;
alter table public.users add column if not exists total_losses integer not null default 0;
alter table public.users add column if not exists total_points_won integer not null default 0;
alter table public.users add column if not exists total_points_lost integer not null default 0;
alter table public.users add column if not exists is_banned boolean not null default false;
alter table public.users add column if not exists ban_reason text;
alter table public.users add column if not exists banned_at timestamptz;
alter table public.users add column if not exists banned_by uuid references public.users(uid) on delete set null;
alter table public.users add column if not exists points_updated_at timestamptz;
update public.users set points_updated_at = coalesce(points_updated_at, updated_at, now());
alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check check (role in ('user', 'admin'));
alter table public.users drop constraint if exists users_points_non_negative;
alter table public.users add constraint users_points_non_negative check (points >= 0 and locked_points >= 0 and locked_points <= points);

alter table public.leaderboard add column if not exists locked_points integer not null default 0;

alter table public.rounds drop constraint if exists rounds_status_check;
alter table public.rounds drop constraint if exists rounds_settled_state;
alter table public.rounds add column if not exists round_number bigint generated by default as identity;
alter table public.rounds add column if not exists lock_at timestamptz;
alter table public.rounds add column if not exists completed_at timestamptz;
alter table public.rounds add column if not exists settled_by uuid references public.users(uid) on delete set null;
alter table public.rounds add column if not exists is_cancelled boolean not null default false;
update public.rounds
set status = case
    when status = 'open' then 'betting'
    when status = 'settled' then 'completed'
    else status
  end,
  completed_at = coalesce(completed_at, settled_at)
where status in ('open', 'settled') or completed_at is null;
update public.rounds
set is_cancelled = true,
    completed_at = coalesce(completed_at, settled_at, now()),
    settled_at = coalesce(settled_at, completed_at, now())
where status = 'cancelled';
update public.rounds set lock_at = coalesce(lock_at, ends_at) where lock_at is null;
alter table public.rounds alter column status set default 'betting';
alter table public.rounds add constraint rounds_status_check check (status in ('betting', 'locked', 'rolling', 'completed', 'cancelled'));
alter table public.rounds add constraint rounds_settled_state check (
  (status in ('betting', 'locked') and dice is null and completed_at is null and is_cancelled = false)
  or
  (status in ('rolling', 'completed') and is_cancelled = false)
  or
  (status = 'cancelled' and is_cancelled = true)
);

alter table public.bets drop constraint if exists bets_result_check;
alter table public.bets add column if not exists status text not null default 'pending';
alter table public.bets add column if not exists payout_multiplier numeric(10,2) not null default 1;
alter table public.bets add column if not exists points_before integer;
alter table public.bets add column if not exists points_after integer;
alter table public.bets add column if not exists settled_at timestamptz;
update public.bets
set status = case
    when result = 'pending' then 'pending'
    when result in ('win', 'lose') then 'settled'
    else status
  end,
  payout_multiplier = case when prediction_type = 'total' then 5 else 1 end,
  settled_at = case when result in ('win', 'lose') then coalesce(settled_at, created_at) else settled_at end;
alter table public.bets alter column result drop not null;
update public.bets set result = null where status = 'pending' and result = 'pending';
alter table public.bets add constraint bets_result_check check (
  (status = 'pending' and result is null)
  or (status = 'settled' and result in ('win', 'lose'))
  or (status = 'cancelled' and result is null)
);
alter table public.bets drop constraint if exists bets_status_check;
alter table public.bets add constraint bets_status_check check (status in ('pending', 'settled', 'cancelled'));

create table if not exists public.points_transactions (
  transaction_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(uid) on delete cascade,
  type text not null check (type in ('bet_lock', 'bet_win', 'bet_loss', 'admin_adjust', 'daily_claim', 'round_cancel')),
  amount integer not null,
  points_before integer not null,
  points_after integer not null,
  locked_before integer not null,
  locked_after integer not null,
  bet_id uuid references public.bets(bet_id) on delete set null,
  round_id uuid references public.rounds(round_id) on delete set null,
  admin_id uuid references public.users(uid) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  message_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(uid) on delete cascade,
  display_name text not null,
  avatar text,
  role text not null default 'user' check (role in ('user', 'admin')),
  vip_level smallint not null default 0 check (vip_level between 0 and 10),
  text text not null check (char_length(text) between 1 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references public.users(uid) on delete set null,
  is_deleted boolean not null default false
);

alter table public.chat_messages add column if not exists role text not null default 'user';
alter table public.chat_messages add column if not exists vip_level smallint not null default 0;
alter table public.chat_messages drop constraint if exists chat_messages_role_check;
alter table public.chat_messages add constraint chat_messages_role_check check (role in ('user', 'admin'));
alter table public.chat_messages drop constraint if exists chat_messages_vip_level_check;
alter table public.chat_messages add constraint chat_messages_vip_level_check check (vip_level between 0 and 10);

create table if not exists public.admin_logs (
  log_id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.users(uid) on delete set null,
  action text not null,
  target_user_id uuid references public.users(uid) on delete set null,
  target_round_id uuid references public.rounds(round_id) on delete set null,
  target_message_id uuid references public.chat_messages(message_id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_notifications (
  notification_id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.users(uid) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 100),
  message text not null check (char_length(trim(message)) between 1 and 500),
  kind text not null default 'info' check (kind in ('info', 'success', 'warning', 'error')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null default (now() + interval '15 seconds'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint admin_notifications_time_check check (ends_at > starts_at)
);

create index if not exists users_points_idx on public.users (points desc, points_updated_at asc);
create index if not exists users_role_idx on public.users (role);
create index if not exists bets_status_round_idx on public.bets (round_id, status);
create index if not exists points_transactions_user_created_idx on public.points_transactions (user_id, created_at desc);
create index if not exists chat_messages_created_idx on public.chat_messages (created_at desc);
create index if not exists admin_notifications_schedule_idx on public.admin_notifications (is_active, starts_at, ends_at);

drop view if exists public.bet_history;
create view public.bet_history
with (security_invoker = true)
as
select
  b.bet_id,
  b.user_id,
  b.round_id,
  b.prediction_type,
  b.prediction_value,
  b.bet_amount,
  b.payout_multiplier,
  b.status,
  b.result,
  b.points_before,
  b.points_after,
  b.points_change,
  b.created_at,
  b.settled_at,
  r.status as round_status,
  r.dice,
  r.total,
  r.result_type,
  r.starts_at,
  r.ends_at,
  coalesce(r.completed_at, r.settled_at) as round_settled_at,
  r.created_at as round_created_at,
  u.display_name,
  u.avatar_url
from public.bets b
join public.rounds r on r.round_id = b.round_id
left join public.users u on u.uid = b.user_id;

grant select on public.bet_history to anon, authenticated;

create or replace function public.sync_leaderboard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.leaderboard (uid, account_name, display_name, avatar_url, vip_level, points, locked_points, updated_at)
  values (new.uid, new.account_name, new.display_name, new.avatar_url, new.vip_level, new.points, new.locked_points, coalesce(new.points_updated_at, new.updated_at))
  on conflict (uid) do update
    set account_name = excluded.account_name,
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        vip_level = excluded.vip_level,
        points = excluded.points,
        locked_points = excluded.locked_points,
        updated_at = excluded.updated_at;

  return new;
end;
$$;

drop trigger if exists sync_users_leaderboard on public.users;
create trigger sync_users_leaderboard
  after insert or update of account_name, display_name, avatar_url, vip_level, points, locked_points, points_updated_at, updated_at on public.users
  for each row
  execute function public.sync_leaderboard();

insert into public.leaderboard (uid, account_name, display_name, avatar_url, vip_level, points, locked_points, updated_at)
select uid, account_name, display_name, avatar_url, vip_level, points, locked_points, coalesce(points_updated_at, updated_at)
from public.users
on conflict (uid) do update
  set account_name = excluded.account_name,
      display_name = excluded.display_name,
      avatar_url = excluded.avatar_url,
      vip_level = excluded.vip_level,
      points = excluded.points,
      locked_points = excluded.locked_points,
      updated_at = excluded.updated_at;

create or replace function public.assert_admin(p_session_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  resolved_app_role text;
begin
  select lower(trim(coalesce(u.role, 'user')))
  into resolved_app_role
  from public.users u
  where u.uid = current_uid;

  if resolved_app_role is distinct from 'admin' then
    raise exception 'Admin permission required for uid %, resolved role %', current_uid, coalesce(resolved_app_role, '<missing>')
      using errcode = '42501';
  end if;

  return current_uid;
end;
$$;

create or replace function public.get_admin_session_debug(p_session_token text)
returns table (
  uid uuid,
  account_name text,
  display_name text,
  role text,
  is_banned boolean,
  session_exists boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid;
begin
  current_uid := public.get_session_user_id(p_session_token);

  return query
  select
    u.uid,
    u.account_name,
    u.display_name,
    lower(trim(coalesce(u.role, 'user'))) as role,
    u.is_banned,
    true as session_exists
  from public.users u
  where u.uid = current_uid;
end;
$$;

create or replace function public.prune_old_round_history(p_keep_count integer default 500)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_keep_count integer := greatest(1, coalesce(p_keep_count, 500));
  deleted_count integer := 0;
begin
  -- Keep the newest completed/cancelled rounds only. Active rounds are never
  -- pruned, and dependent old bets are removed by the rounds -> bets cascade.
  with ranked_rounds as (
    select
      r.round_id,
      row_number() over (
        order by coalesce(r.completed_at, r.settled_at, r.ends_at, r.created_at) desc, r.created_at desc, r.round_id desc
      ) as round_rank
    from public.rounds r
    where r.status in ('completed', 'cancelled')
  ),
  deleted_rounds as (
    delete from public.rounds r
    using ranked_rounds rr
    where r.round_id = rr.round_id
      and rr.round_rank > safe_keep_count
    returning 1
  )
  select count(*)::integer
  into deleted_count
  from deleted_rounds;

  return deleted_count;
end;
$$;

create or replace function public.ensure_active_round()
returns public.rounds
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  active_round public.rounds;
begin
  perform pg_advisory_xact_lock(hashtext('dice_predictor_active_round'));

  select *
  into active_round
  from public.rounds
  where status = 'betting'
    and ends_at > now()
  order by starts_at desc
  limit 1;

  if found then
    return active_round;
  end if;

  insert into public.rounds (status, starts_at, ends_at, lock_at, created_at)
  values ('betting', now(), now() + interval '30 seconds', now() + interval '30 seconds', now())
  returning * into active_round;

  perform public.prune_old_round_history(500);

  return active_round;
end;
$$;

create or replace function public.settle_single_round(p_round_id uuid, p_admin_id uuid default null)
returns public.rounds
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  due_round public.rounds%rowtype;
  bet_record public.bets%rowtype;
  locked_user public.users%rowtype;
  rolled_dice smallint[];
  rolled_total smallint;
  rolled_result_type text;
  is_win boolean;
  delta integer;
  next_points integer;
  next_locked integer;
begin
  select *
  into due_round
  from public.rounds
  where round_id = p_round_id
  for update;

  if not found then
    raise exception 'Round not found' using errcode = 'P0002';
  end if;

  if due_round.status = 'completed' then
    return due_round;
  end if;

  if due_round.status = 'cancelled' then
    raise exception 'Round is cancelled' using errcode = '22023';
  end if;

  update public.rounds
  set status = 'rolling'
  where round_id = due_round.round_id;

  rolled_dice := coalesce(due_round.dice, array[public.random_die(), public.random_die(), public.random_die()]::smallint[]);
  rolled_total := (rolled_dice[1] + rolled_dice[2] + rolled_dice[3])::smallint;
  rolled_result_type := case when rolled_total between 3 and 10 then 'xiu' else 'tai' end;

  for bet_record in
    select *
    from public.bets b
    where b.round_id = due_round.round_id
      and b.status = 'pending'
    order by b.created_at asc
    for update
  loop
    select *
    into locked_user
    from public.users u
    where u.uid = bet_record.user_id
    for update;

    if bet_record.prediction_type = 'tai_xiu' then
      is_win := bet_record.prediction_value = rolled_result_type;
    else
      is_win := bet_record.prediction_value::integer = rolled_total;
    end if;

    delta := case
      when is_win then round(bet_record.bet_amount * bet_record.payout_multiplier)::integer
      else -bet_record.bet_amount
    end;
    next_points := locked_user.points + delta;
    next_locked := greatest(0, locked_user.locked_points - bet_record.bet_amount);

    update public.users
    set points = next_points,
        locked_points = next_locked,
        total_bets = total_bets + 1,
        total_wins = total_wins + case when is_win then 1 else 0 end,
        total_losses = total_losses + case when is_win then 0 else 1 end,
        total_points_won = total_points_won + case when is_win then delta else 0 end,
        total_points_lost = total_points_lost + case when is_win then 0 else bet_record.bet_amount end,
        points_updated_at = now()
    where uid = locked_user.uid;

    update public.bets
    set status = 'settled',
        result = case when is_win then 'win' else 'lose' end,
        points_before = locked_user.points,
        points_after = next_points,
        points_change = delta,
        settled_at = now()
    where bet_id = bet_record.bet_id;

    insert into public.points_transactions (
      user_id, type, amount, points_before, points_after, locked_before, locked_after, bet_id, round_id, admin_id
    )
    values (
      locked_user.uid,
      case when is_win then 'bet_win' else 'bet_loss' end,
      delta,
      locked_user.points,
      next_points,
      locked_user.locked_points,
      next_locked,
      bet_record.bet_id,
      due_round.round_id,
      p_admin_id
    );
  end loop;

  update public.rounds
  set status = 'completed',
      dice = rolled_dice,
      settled_at = now(),
      completed_at = now(),
      settled_by = p_admin_id
  where round_id = due_round.round_id
  returning * into due_round;

  return due_round;
end;
$$;

create or replace function public.settle_due_rounds()
returns table (
  settled_round_id uuid,
  active_round_id uuid
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  due_round public.rounds%rowtype;
  active_round public.rounds;
begin
  for due_round in
    select *
    from public.rounds
    where status = 'betting'
      and ends_at <= now()
    order by ends_at asc
    for update skip locked
  loop
    perform public.settle_single_round(due_round.round_id, null);
    active_round := public.ensure_active_round();
    settled_round_id := due_round.round_id;
    active_round_id := active_round.round_id;
    return next;
  end loop;

  active_round := public.ensure_active_round();
  settled_round_id := null;
  active_round_id := active_round.round_id;
  return next;
end;
$$;

create or replace function public.get_current_round()
returns public.rounds
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  active_round public.rounds;
begin
  perform public.settle_due_rounds();
  active_round := public.ensure_active_round();
  return active_round;
end;
$$;

drop function if exists public.place_bet(text, text, text, integer);
create function public.place_bet(
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
  multiplier numeric(10,2);
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

  if p_prediction_type is null or p_prediction_type not in ('tai_xiu', 'total') then
    raise exception 'Invalid prediction type' using errcode = '22023';
  end if;

  if p_prediction_type = 'tai_xiu' and normalized_value not in ('tai', 'xiu') then
    raise exception 'Invalid Tai/Xiu prediction' using errcode = '22023';
  end if;

  if p_prediction_type = 'total' and (normalized_value !~ '^[0-9]+$' or normalized_value::integer not between 3 and 18) then
    raise exception 'Invalid total prediction' using errcode = '22023';
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

  multiplier := case when p_prediction_type = 'total' then 5 else 1 end;
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
    p_prediction_type,
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

  bet_id := new_bet.bet_id;
  round_id := new_bet.round_id;
  prediction_type := new_bet.prediction_type;
  prediction_value := new_bet.prediction_value;
  bet_amount := new_bet.bet_amount;
  status := new_bet.status;
  result := new_bet.result;
  points_change := new_bet.points_change;
  created_at := new_bet.created_at;
  round_starts_at := active_round.starts_at;
  round_ends_at := active_round.ends_at;
  available_points := locked_user.points - locked_user.locked_points;

  return next;
end;
$$;

drop function if exists public.claim_demo_points(text);
create function public.claim_demo_points(p_session_token text)
returns table (
  points integer,
  locked_points integer,
  last_demo_refill_at timestamptz,
  next_available_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  locked_user public.users%rowtype;
  next_refill_at timestamptz;
  added_points integer := 1000;
begin
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

  if locked_user.points - locked_user.locked_points > 0 then
    raise exception 'Demo refill is only available at 0 available points' using errcode = '22023';
  end if;

  next_refill_at := locked_user.last_demo_refill_at + interval '24 hours';

  if locked_user.last_demo_refill_at is not null and next_refill_at > now() then
    raise exception 'Demo refill is available once every 24 hours' using errcode = '22023';
  end if;

  update public.users
  set points = public.users.points + added_points,
      last_demo_refill_at = now(),
      points_updated_at = now()
  where uid = current_uid
  returning public.users.points, public.users.locked_points, public.users.last_demo_refill_at, public.users.last_demo_refill_at + interval '24 hours'
  into points, locked_points, last_demo_refill_at, next_available_at;

  insert into public.points_transactions (
    user_id, type, amount, points_before, points_after, locked_before, locked_after
  )
  values (
    current_uid,
    'daily_claim',
    added_points,
    locked_user.points,
    locked_user.points + added_points,
    locked_user.locked_points,
    locked_user.locked_points
  );

  return next;
end;
$$;

create or replace function public.send_chat_message(p_session_token text, p_text text)
returns public.chat_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
  clean_text text := trim(coalesce(p_text, ''));
  last_message_at timestamptz;
  message public.chat_messages%rowtype;
begin
  select *
  into profile
  from public.users
  where uid = current_uid
  for update;

  if not found or profile.is_banned then
    raise exception 'Account cannot chat' using errcode = '42501';
  end if;

  if clean_text = '' then
    raise exception 'Message cannot be empty' using errcode = '22023';
  end if;

  if char_length(clean_text) > 300 then
    raise exception 'Message is too long' using errcode = '22023';
  end if;

  if clean_text ~* '(http://|https://|www\.|casino|telegram|discord\.gg)' then
    raise exception 'Message looks like spam' using errcode = '22023';
  end if;

  select created_at
  into last_message_at
  from public.chat_messages
  where user_id = current_uid
  order by created_at desc
  limit 1;

  if last_message_at is not null and last_message_at > now() - interval '2 seconds' then
    raise exception 'Please wait before sending another message' using errcode = '22023';
  end if;

  insert into public.chat_messages (user_id, display_name, avatar, role, vip_level, text)
  values (current_uid, profile.display_name, profile.avatar_url, profile.role, profile.vip_level, clean_text)
  returning * into message;

  return message;
end;
$$;

create or replace function public.delete_chat_message(p_session_token text, p_message_id uuid)
returns public.chat_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  resolved_app_role text;
  message public.chat_messages%rowtype;
begin
  select lower(trim(coalesce(u.role, 'user')))
  into resolved_app_role
  from public.users u
  where u.uid = current_uid;

  select *
  into message
  from public.chat_messages
  where message_id = p_message_id
  for update;

  if not found then
    raise exception 'Message not found' using errcode = 'P0002';
  end if;

  if message.user_id <> current_uid and resolved_app_role <> 'admin' then
    raise exception 'Cannot delete this message' using errcode = '42501';
  end if;

  update public.chat_messages
  set is_deleted = true,
      deleted_at = now(),
      deleted_by = current_uid,
      updated_at = now()
  where message_id = p_message_id
  returning * into message;

  return message;
end;
$$;

create or replace function public.admin_get_users(p_session_token text, p_search text default '')
returns setof public.users
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin(p_session_token);

  return query
  select *
  from public.users u
  where trim(coalesce(p_search, '')) = ''
    or u.email ilike '%' || trim(p_search) || '%'
    or u.display_name ilike '%' || trim(p_search) || '%'
    or u.account_name ilike '%' || trim(p_search) || '%'
  order by u.created_at desc
  limit 100;
end;
$$;

create or replace function public.admin_adjust_points(p_session_token text, p_user_id uuid, p_amount integer, p_note text default null)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_uid uuid := public.assert_admin(p_session_token);
  target public.users%rowtype;
  updated_profile public.users%rowtype;
begin
  if p_amount is null or p_amount = 0 then
    raise exception 'Amount must not be zero' using errcode = '22023';
  end if;

  select *
  into target
  from public.users
  where uid = p_user_id
  for update;

  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  if target.points + p_amount < target.locked_points then
    raise exception 'Adjustment would put points below locked points' using errcode = '22023';
  end if;

  update public.users
  set points = public.users.points + p_amount,
      points_updated_at = now()
  where uid = p_user_id
  returning * into updated_profile;

  insert into public.points_transactions (
    user_id, type, amount, points_before, points_after, locked_before, locked_after, admin_id, note
  )
  values (
    p_user_id,
    'admin_adjust',
    p_amount,
    target.points,
    updated_profile.points,
    target.locked_points,
    updated_profile.locked_points,
    admin_uid,
    p_note
  );

  insert into public.admin_logs (admin_id, action, target_user_id, details)
  values (admin_uid, 'admin_adjust_points', p_user_id, jsonb_build_object('amount', p_amount, 'note', p_note));

  return updated_profile;
end;
$$;

create or replace function public.admin_adjust_points_all(p_session_token text, p_amount integer, p_note text default null)
returns table (affected_users bigint, total_amount bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_uid uuid := public.assert_admin(p_session_token);
  target public.users%rowtype;
  updated_points integer;
  updated_count bigint := 0;
begin
  if p_amount is null or p_amount = 0 then
    raise exception 'Amount must not be zero' using errcode = '22023';
  end if;

  -- Point changes must stay server-side: every user row is locked before
  -- applying the adjustment so concurrent bets/admin actions cannot drift.
  for target in
    select *
    from public.users u
    order by u.created_at asc
    for update
  loop
    if target.points + p_amount < target.locked_points then
      raise exception 'Adjustment would put points below locked points for user %', target.uid using errcode = '22023';
    end if;

    updated_points := target.points + p_amount;

    update public.users
    set points = updated_points,
        points_updated_at = now()
    where uid = target.uid;

    insert into public.points_transactions (
      user_id,
      type,
      amount,
      points_before,
      points_after,
      locked_before,
      locked_after,
      admin_id,
      note
    )
    values (
      target.uid,
      'admin_adjust',
      p_amount,
      target.points,
      updated_points,
      target.locked_points,
      target.locked_points,
      admin_uid,
      coalesce(nullif(trim(coalesce(p_note, '')), ''), 'Bulk admin points adjustment')
    );

    updated_count := updated_count + 1;
  end loop;

  insert into public.admin_logs (admin_id, action, details)
  values (
    admin_uid,
    'admin_adjust_points_all',
    jsonb_build_object(
      'amount', p_amount,
      'affected_users', updated_count,
      'total_amount', updated_count * p_amount,
      'note', p_note
    )
  );

  affected_users := updated_count;
  total_amount := updated_count * p_amount;
  return next;
end;
$$;

drop function if exists public.admin_set_user_ban(text, uuid, boolean);
create or replace function public.admin_set_user_ban(p_session_token text, p_user_id uuid, p_is_banned boolean, p_reason text default null)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_uid uuid := public.assert_admin(p_session_token);
  updated_profile public.users%rowtype;
  clean_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if p_is_banned and clean_reason is null then
    raise exception 'Ban reason is required' using errcode = '22023';
  end if;

  if clean_reason is not null and char_length(clean_reason) > 300 then
    raise exception 'Ban reason is too long' using errcode = '22023';
  end if;

  update public.users
  set is_banned = p_is_banned,
      ban_reason = case when p_is_banned then clean_reason else null end,
      banned_at = case when p_is_banned then now() else null end,
      banned_by = case when p_is_banned then admin_uid else null end,
      updated_at = now()
  where uid = p_user_id
  returning * into updated_profile;

  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  insert into public.admin_logs (admin_id, action, target_user_id, details)
  values (
    admin_uid,
    'admin_set_user_ban',
    p_user_id,
    jsonb_build_object('is_banned', p_is_banned, 'reason', clean_reason)
  );

  return updated_profile;
end;
$$;

create or replace function public.admin_set_user_role(p_session_token text, p_user_id uuid, p_role text)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_uid uuid := public.assert_admin(p_session_token);
  updated_profile public.users%rowtype;
begin
  if p_role not in ('user', 'admin') then
    raise exception 'Invalid role' using errcode = '22023';
  end if;

  update public.users
  set role = p_role
  where uid = p_user_id
  returning * into updated_profile;

  insert into public.admin_logs (admin_id, action, target_user_id, details)
  values (admin_uid, 'admin_set_user_role', p_user_id, jsonb_build_object('role', p_role));

  return updated_profile;
end;
$$;

create or replace function public.admin_get_points_transactions(p_session_token text, p_user_id uuid)
returns setof public.points_transactions
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin(p_session_token);

  return query
  select *
  from public.points_transactions
  where user_id = p_user_id
  order by created_at desc
  limit 100;
end;
$$;

create or replace function public.admin_force_settle_round(p_session_token text, p_round_id uuid)
returns public.rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_uid uuid := public.assert_admin(p_session_token);
  settled_round public.rounds%rowtype;
begin
  settled_round := public.settle_single_round(p_round_id, admin_uid);
  perform public.ensure_active_round();

  insert into public.admin_logs (admin_id, action, target_round_id)
  values (admin_uid, 'admin_force_settle_round', p_round_id);

  return settled_round;
end;
$$;

create or replace function public.admin_cancel_round(p_session_token text, p_round_id uuid, p_note text default null)
returns public.rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_uid uuid := public.assert_admin(p_session_token);
  due_round public.rounds%rowtype;
  bet_record public.bets%rowtype;
  locked_user public.users%rowtype;
begin
  select *
  into due_round
  from public.rounds
  where round_id = p_round_id
  for update;

  if not found then
    raise exception 'Round not found' using errcode = 'P0002';
  end if;

  for bet_record in
    select *
    from public.bets
    where round_id = p_round_id
      and status = 'pending'
    for update
  loop
    select *
    into locked_user
    from public.users
    where uid = bet_record.user_id
    for update;

    update public.users
    set locked_points = greatest(0, public.users.locked_points - bet_record.bet_amount),
        points_updated_at = now()
    where uid = bet_record.user_id;

    update public.bets
    set status = 'cancelled',
        result = null,
        points_before = locked_user.points,
        points_after = locked_user.points,
        points_change = 0,
        settled_at = now()
    where bet_id = bet_record.bet_id;

    insert into public.points_transactions (
      user_id, type, amount, points_before, points_after, locked_before, locked_after, bet_id, round_id, admin_id, note
    )
    values (
      bet_record.user_id,
      'round_cancel',
      0,
      locked_user.points,
      locked_user.points,
      locked_user.locked_points,
      greatest(0, locked_user.locked_points - bet_record.bet_amount),
      bet_record.bet_id,
      p_round_id,
      admin_uid,
      p_note
    );
  end loop;

  update public.rounds
  set status = 'cancelled',
      is_cancelled = true,
      completed_at = now(),
      settled_at = now(),
      settled_by = admin_uid
  where round_id = p_round_id
  returning * into due_round;

  perform public.ensure_active_round();

  insert into public.admin_logs (admin_id, action, target_round_id, details)
  values (admin_uid, 'admin_cancel_round', p_round_id, jsonb_build_object('note', p_note));

  return due_round;
end;
$$;

create or replace function public.admin_delete_chat_message(p_session_token text, p_message_id uuid)
returns public.chat_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_uid uuid := public.assert_admin(p_session_token);
  message public.chat_messages%rowtype;
begin
  update public.chat_messages
  set is_deleted = true,
      deleted_at = now(),
      deleted_by = admin_uid,
      updated_at = now()
  where message_id = p_message_id
  returning * into message;

  insert into public.admin_logs (admin_id, action, target_message_id, target_user_id)
  values (admin_uid, 'admin_delete_chat_message', p_message_id, message.user_id);

  return message;
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
begin
  perform public.assert_admin(p_session_token);

  return query
  select
    (select count(*) from public.users),
    0::bigint,
    (select count(*) from public.bets),
    (select count(*) from public.rounds),
    (select coalesce(sum(u.points), 0)::bigint from public.users u),
    (select coalesce(sum(u.locked_points), 0)::bigint from public.users u),
    (select coalesce(sum(u.total_wins), 0)::bigint from public.users u),
    (select coalesce(sum(u.total_losses), 0)::bigint from public.users u);
end;
$$;

create or replace function public.admin_create_notification(
  p_session_token text,
  p_title text,
  p_message text,
  p_kind text default 'info',
  p_starts_at timestamptz default null,
  p_duration_seconds integer default 15
)
returns public.admin_notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_uid uuid := public.assert_admin(p_session_token);
  safe_title text := trim(coalesce(p_title, ''));
  safe_message text := trim(coalesce(p_message, ''));
  safe_kind text := lower(trim(coalesce(p_kind, 'info')));
  safe_starts_at timestamptz := coalesce(p_starts_at, now());
  safe_duration integer := coalesce(p_duration_seconds, 15);
  created_notification public.admin_notifications%rowtype;
begin
  if safe_title = '' or char_length(safe_title) > 100 then
    raise exception 'Notification title must be 1-100 characters' using errcode = '22023';
  end if;

  if safe_message = '' or char_length(safe_message) > 500 then
    raise exception 'Notification message must be 1-500 characters' using errcode = '22023';
  end if;

  if safe_kind not in ('info', 'success', 'warning', 'error') then
    raise exception 'Invalid notification kind' using errcode = '22023';
  end if;

  if safe_duration < 3 or safe_duration > 3600 then
    raise exception 'Notification duration must be 3-3600 seconds' using errcode = '22023';
  end if;

  insert into public.admin_notifications (
    admin_id, title, message, kind, starts_at, ends_at, is_active
  )
  values (
    admin_uid,
    safe_title,
    safe_message,
    safe_kind,
    safe_starts_at,
    safe_starts_at + make_interval(secs => safe_duration),
    true
  )
  returning * into created_notification;

  insert into public.admin_logs (admin_id, action, details)
  values (
    admin_uid,
    'admin_create_notification',
    jsonb_build_object(
      'notification_id', created_notification.notification_id,
      'title', safe_title,
      'kind', safe_kind,
      'starts_at', created_notification.starts_at,
      'ends_at', created_notification.ends_at
    )
  );

  return created_notification;
end;
$$;

create or replace function public.admin_deactivate_notification(
  p_session_token text,
  p_notification_id uuid
)
returns public.admin_notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_uid uuid := public.assert_admin(p_session_token);
  updated_notification public.admin_notifications%rowtype;
begin
  update public.admin_notifications
  set is_active = false,
      updated_at = now()
  where notification_id = p_notification_id
  returning * into updated_notification;

  if not found then
    raise exception 'Notification not found' using errcode = 'P0002';
  end if;

  insert into public.admin_logs (admin_id, action, details)
  values (
    admin_uid,
    'admin_deactivate_notification',
    jsonb_build_object('notification_id', p_notification_id)
  );

  return updated_notification;
end;
$$;

alter table public.points_transactions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.admin_logs enable row level security;
alter table public.admin_notifications enable row level security;

drop policy if exists "Anyone can read public users" on public.users;
create policy "Anyone can read public users"
  on public.users
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can read chat" on public.chat_messages;
create policy "Anyone can read chat"
  on public.chat_messages
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can read admin notifications" on public.admin_notifications;
create policy "Anyone can read admin notifications"
  on public.admin_notifications
  for select
  to anon, authenticated
  using (true);

revoke all on public.users from anon, authenticated;
revoke all on public.points_transactions from anon, authenticated;
revoke all on public.chat_messages from anon, authenticated;
revoke all on public.admin_logs from anon, authenticated;
revoke all on public.admin_notifications from anon, authenticated;
revoke all on function public.assert_admin(text) from public, anon, authenticated;
revoke all on function public.get_admin_session_debug(text) from public, anon, authenticated;
revoke all on function public.prune_old_round_history(integer) from public, anon, authenticated;
revoke all on function public.settle_single_round(uuid, uuid) from public, anon, authenticated;
revoke all on function public.send_chat_message(text, text) from public, anon, authenticated;
revoke all on function public.delete_chat_message(text, uuid) from public, anon, authenticated;
revoke all on function public.admin_get_users(text, text) from public, anon, authenticated;
revoke all on function public.admin_adjust_points(text, uuid, integer, text) from public, anon, authenticated;
revoke all on function public.admin_adjust_points_all(text, integer, text) from public, anon, authenticated;
revoke all on function public.admin_set_user_ban(text, uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.admin_set_user_role(text, uuid, text) from public, anon, authenticated;
revoke all on function public.admin_get_points_transactions(text, uuid) from public, anon, authenticated;
revoke all on function public.admin_force_settle_round(text, uuid) from public, anon, authenticated;
revoke all on function public.admin_cancel_round(text, uuid, text) from public, anon, authenticated;
revoke all on function public.admin_delete_chat_message(text, uuid) from public, anon, authenticated;
revoke all on function public.admin_get_stats(text) from public, anon, authenticated;
revoke all on function public.admin_create_notification(text, text, text, text, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.admin_deactivate_notification(text, uuid) from public, anon, authenticated;

grant select (
  uid, account_name, display_name, avatar_url, vip_level, points, locked_points,
  total_bets, total_wins, total_losses, total_points_won, total_points_lost,
  is_banned, ban_reason, banned_at, points_updated_at, created_at, updated_at
) on public.users to anon, authenticated;
grant select on public.chat_messages to anon, authenticated;
grant select on public.admin_notifications to anon, authenticated;
grant execute on function public.send_chat_message(text, text) to anon, authenticated;
grant execute on function public.delete_chat_message(text, uuid) to anon, authenticated;
grant execute on function public.get_admin_session_debug(text) to anon, authenticated;
grant execute on function public.admin_get_users(text, text) to anon, authenticated;
grant execute on function public.admin_adjust_points(text, uuid, integer, text) to anon, authenticated;
grant execute on function public.admin_adjust_points_all(text, integer, text) to anon, authenticated;
grant execute on function public.admin_set_user_ban(text, uuid, boolean, text) to anon, authenticated;
grant execute on function public.admin_set_user_role(text, uuid, text) to anon, authenticated;
grant execute on function public.admin_get_points_transactions(text, uuid) to anon, authenticated;
grant execute on function public.admin_force_settle_round(text, uuid) to anon, authenticated;
grant execute on function public.admin_cancel_round(text, uuid, text) to anon, authenticated;
grant execute on function public.admin_delete_chat_message(text, uuid) to anon, authenticated;
grant execute on function public.admin_get_stats(text) to anon, authenticated;
grant execute on function public.admin_create_notification(text, text, text, text, timestamptz, integer) to anon, authenticated;
grant execute on function public.admin_deactivate_notification(text, uuid) to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'points_transactions'
  ) then
    alter publication supabase_realtime add table public.points_transactions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'admin_notifications'
  ) then
    alter publication supabase_realtime add table public.admin_notifications;
  end if;
end $$;

notify pgrst, 'reload schema';

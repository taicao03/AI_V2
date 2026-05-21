set search_path = public, extensions;

alter table public.points_transactions add column if not exists game_type text;
alter table public.points_transactions add column if not exists room_id uuid;
alter table public.points_transactions add column if not exists rr_round_id uuid;

alter table public.points_transactions drop constraint if exists points_transactions_type_check;
alter table public.points_transactions add constraint points_transactions_type_check check (
  type in (
    'bet_lock', 'bet_win', 'bet_loss', 'admin_adjust', 'daily_claim', 'round_cancel',
    'poker_bet_lock', 'poker_bet_win', 'poker_bet_loss', 'poker_round_refund',
    'buy_in_lock', 'win_pot', 'refund'
  )
);

create table if not exists public.rr_game_settings (
  settings_id smallint primary key default 1 check (settings_id = 1),
  is_enabled boolean not null default true,
  min_buy_in integer not null default 10 check (min_buy_in >= 1),
  max_buy_in integer not null default 100000 check (max_buy_in >= min_buy_in),
  max_players smallint not null default 6 check (max_players between 2 and 6),
  enable_items boolean not null default true,
  updated_by uuid references public.users(uid) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

insert into public.rr_game_settings (settings_id)
values (1)
on conflict (settings_id) do nothing;

create table if not exists public.rr_rooms (
  room_id uuid primary key default gen_random_uuid(),
  room_code text unique,
  name text not null,
  is_private boolean not null default false,
  max_players smallint not null default 6 check (max_players between 2 and 6),
  min_buy_in integer not null default 10 check (min_buy_in >= 1),
  max_buy_in integer not null default 100000 check (max_buy_in >= min_buy_in),
  buy_in_amount integer not null check (buy_in_amount >= 1),
  status text not null default 'waiting' check (status in ('waiting', 'countdown', 'playing', 'completed', 'cancelled')),
  current_round_id uuid,
  created_by uuid references public.users(uid) on delete set null,
  enable_items boolean not null default true,
  allow_spectator_chat boolean not null default true,
  is_enabled boolean not null default true,
  countdown_ends_at timestamptz,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rr_rounds (
  round_id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rr_rooms(room_id) on delete cascade,
  status text not null default 'countdown' check (status in ('countdown', 'playing', 'completed', 'cancelled')),
  player_order uuid[] not null default '{}'::uuid[],
  current_player_id uuid references public.users(uid) on delete set null,
  current_turn_index integer not null default 0,
  danger_index integer not null default 1 check (danger_index between 1 and 6),
  trigger_count integer not null default 0 check (trigger_count >= 0),
  pot_amount integer not null default 0 check (pot_amount >= 0),
  winner_id uuid references public.users(uid) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  turn_started_at timestamptz,
  turn_ends_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.rr_rooms drop constraint if exists rr_rooms_current_round_fk;
alter table public.rr_rooms
  add constraint rr_rooms_current_round_fk
  foreign key (current_round_id) references public.rr_rounds(round_id) on delete set null;

create table if not exists public.rr_players (
  room_id uuid not null references public.rr_rooms(room_id) on delete cascade,
  user_id uuid not null references public.users(uid) on delete cascade,
  display_name text not null,
  avatar text,
  seat_index smallint,
  status text not null default 'joined' check (status in ('joined', 'ready', 'playing', 'eliminated', 'winner', 'spectator')),
  buy_in_amount integer not null default 0 check (buy_in_amount >= 0),
  locked_points integer not null default 0 check (locked_points >= 0),
  has_shield boolean not null default false,
  has_skip boolean not null default false,
  joined_at timestamptz not null default now(),
  last_action_at timestamptz,
  is_ready boolean not null default false,
  left_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.rr_actions (
  action_id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rr_rounds(round_id) on delete cascade,
  room_id uuid not null references public.rr_rooms(room_id) on delete cascade,
  user_id uuid not null references public.users(uid) on delete cascade,
  action_type text not null check (action_type in ('pull_trigger', 'use_shield', 'skip_turn', 'auto_action', 'eliminated', 'winner')),
  result text check (result in ('safe', 'danger', 'blocked', 'skipped')),
  trigger_count_before integer not null default 0,
  trigger_count_after integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.rr_chat_messages (
  message_id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rr_rooms(room_id) on delete cascade,
  user_id uuid not null references public.users(uid) on delete cascade,
  display_name text not null,
  avatar text,
  text text not null check (char_length(text) between 1 and 300),
  created_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.users(uid) on delete set null
);

alter table public.points_transactions drop constraint if exists points_transactions_rr_room_fk;
alter table public.points_transactions
  add constraint points_transactions_rr_room_fk
  foreign key (room_id) references public.rr_rooms(room_id) on delete set null;

alter table public.points_transactions drop constraint if exists points_transactions_rr_round_fk;
alter table public.points_transactions
  add constraint points_transactions_rr_round_fk
  foreign key (rr_round_id) references public.rr_rounds(round_id) on delete set null;

create index if not exists rr_rooms_status_idx on public.rr_rooms (status, updated_at desc);
create index if not exists rr_players_room_active_idx on public.rr_players (room_id, left_at, status, is_ready);
create index if not exists rr_rounds_room_created_idx on public.rr_rounds (room_id, created_at desc);
create index if not exists rr_actions_room_created_idx on public.rr_actions (room_id, created_at desc);
create index if not exists rr_chat_room_created_idx on public.rr_chat_messages (room_id, created_at desc);
create index if not exists points_transactions_game_idx on public.points_transactions (game_type, created_at desc);

create or replace function public.rr_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_rr_rooms_updated_at on public.rr_rooms;
create trigger set_rr_rooms_updated_at
  before update on public.rr_rooms
  for each row
  execute function public.rr_set_updated_at();

drop trigger if exists set_rr_players_updated_at on public.rr_players;
create trigger set_rr_players_updated_at
  before update on public.rr_players
  for each row
  execute function public.rr_set_updated_at();

create or replace function public.rr_generate_room_code()
returns text
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  candidate text;
begin
  loop
    candidate := upper(substring(encode(gen_random_bytes(4), 'hex') from 1 for 6));
    exit when not exists (select 1 from public.rr_rooms where room_code = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.rr_danger_roll()
returns integer
language sql
volatile
as $$
  select 1 + floor(random() * 6)::integer
$$;

create or replace function public.rr_assert_game_enabled()
returns public.rr_game_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  settings_record public.rr_game_settings%rowtype;
begin
  select * into settings_record from public.rr_game_settings where settings_id = 1;

  if not found then
    insert into public.rr_game_settings (settings_id) values (1)
    returning * into settings_record;
  end if;

  if not settings_record.is_enabled then
    raise exception 'Russian Roulette game is currently disabled' using errcode = '42501';
  end if;

  return settings_record;
end;
$$;

create or replace function public.rr_pick_next_player(p_round_id uuid)
returns table (next_user_id uuid, next_index integer)
language plpgsql
stable
set search_path = public
as $$
declare
  round_record public.rr_rounds%rowtype;
  order_length integer;
  probe integer;
  candidate uuid;
begin
  select * into round_record
  from public.rr_rounds r
  where r.round_id = p_round_id;

  if not found then
    return;
  end if;

  order_length := coalesce(array_length(round_record.player_order, 1), 0);
  if order_length = 0 then
    return;
  end if;

  for probe in 1..order_length loop
    candidate := round_record.player_order[((round_record.current_turn_index + probe - 1) % order_length) + 1];

    if exists (
      select 1
      from public.rr_players p
      where p.room_id = round_record.room_id
        and p.user_id = candidate
        and p.left_at is null
        and p.status not in ('eliminated', 'spectator')
    ) then
      next_user_id := candidate;
      next_index := ((round_record.current_turn_index + probe - 1) % order_length) + 1;
      return next;
      return;
    end if;
  end loop;
end;
$$;

create or replace function public.rr_list_lobby_rooms(p_session_token text default null)
returns table (
  room_id uuid,
  room_code text,
  name text,
  is_private boolean,
  max_players smallint,
  min_buy_in integer,
  max_buy_in integer,
  buy_in_amount integer,
  status text,
  current_round_id uuid,
  created_by uuid,
  enable_items boolean,
  allow_spectator_chat boolean,
  is_enabled boolean,
  countdown_ends_at timestamptz,
  last_activity_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  player_count integer,
  ready_count integer,
  spectator_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := null;
begin
  if p_session_token is not null then
    begin
      current_uid := public.get_session_user_id(p_session_token);
    exception when others then
      current_uid := null;
    end;
  end if;

  return query
  select
    r.room_id,
    case when r.is_private and not exists (
      select 1 from public.rr_players p where p.room_id = r.room_id and p.user_id = current_uid and p.left_at is null
    ) then null else r.room_code end as room_code,
    r.name,
    r.is_private,
    r.max_players,
    r.min_buy_in,
    r.max_buy_in,
    r.buy_in_amount,
    r.status,
    r.current_round_id,
    r.created_by,
    r.enable_items,
    r.allow_spectator_chat,
    r.is_enabled,
    r.countdown_ends_at,
    r.last_activity_at,
    r.created_at,
    r.updated_at,
    (
      select count(*)::integer
      from public.rr_players p
      where p.room_id = r.room_id and p.left_at is null and p.status <> 'spectator'
    ) as player_count,
    (
      select count(*)::integer
      from public.rr_players p
      where p.room_id = r.room_id and p.left_at is null and p.is_ready = true and p.status <> 'spectator'
    ) as ready_count,
    (
      select count(*)::integer
      from public.rr_players p
      where p.room_id = r.room_id and p.left_at is null and p.status = 'spectator'
    ) as spectator_count
  from public.rr_rooms r
  where r.status <> 'cancelled'
    and (not r.is_private or exists (
      select 1 from public.rr_players p where p.room_id = r.room_id and p.user_id = current_uid and p.left_at is null
    ))
  order by r.updated_at desc
  limit 80;
end;
$$;

create or replace function public.rr_create_room(
  p_session_token text,
  p_name text,
  p_is_private boolean default false,
  p_buy_in_amount integer default 100,
  p_min_buy_in integer default 10,
  p_max_buy_in integer default 100000,
  p_max_players smallint default 6,
  p_enable_items boolean default true,
  p_allow_spectator_chat boolean default true
)
returns public.rr_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
  settings_record public.rr_game_settings%rowtype;
  created_room public.rr_rooms%rowtype;
begin
  settings_record := public.rr_assert_game_enabled();

  select * into profile from public.users where uid = current_uid for update;
  if not found or profile.is_banned then
    raise exception 'Account cannot create room' using errcode = '42501';
  end if;

  if p_max_players < 2 or p_max_players > settings_record.max_players then
    raise exception 'Max players out of range' using errcode = '22023';
  end if;

  if p_min_buy_in < settings_record.min_buy_in or p_max_buy_in > settings_record.max_buy_in or p_min_buy_in > p_max_buy_in then
    raise exception 'Buy-in range is invalid' using errcode = '22023';
  end if;

  if p_buy_in_amount < p_min_buy_in or p_buy_in_amount > p_max_buy_in then
    raise exception 'Buy-in amount is out of room range' using errcode = '22023';
  end if;

  insert into public.rr_rooms (
    room_code,
    name,
    is_private,
    max_players,
    min_buy_in,
    max_buy_in,
    buy_in_amount,
    status,
    created_by,
    enable_items,
    allow_spectator_chat,
    is_enabled,
    countdown_ends_at,
    last_activity_at
  )
  values (
    case when p_is_private then public.rr_generate_room_code() else null end,
    coalesce(nullif(trim(coalesce(p_name, '')), ''), profile.display_name || '''s chamber'),
    p_is_private,
    p_max_players,
    p_min_buy_in,
    p_max_buy_in,
    p_buy_in_amount,
    'waiting',
    current_uid,
    coalesce(p_enable_items, settings_record.enable_items),
    coalesce(p_allow_spectator_chat, true),
    true,
    null,
    now()
  )
  returning * into created_room;

  return created_room;
end;
$$;

create or replace function public.rr_join_room(
  p_session_token text,
  p_room_id uuid default null,
  p_room_code text default null,
  p_as_spectator boolean default false
)
returns public.rr_players
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
  room_record public.rr_rooms%rowtype;
  player_record public.rr_players%rowtype;
  used_seats smallint[];
  next_seat smallint;
begin
  perform public.rr_assert_game_enabled();

  select * into profile from public.users where uid = current_uid for update;
  if not found or profile.is_banned then
    raise exception 'Account cannot join room' using errcode = '42501';
  end if;

  select *
  into room_record
  from public.rr_rooms r
  where (
      (p_room_id is not null and r.room_id = p_room_id)
      or (p_room_id is null and p_room_code is not null and upper(r.room_code) = upper(trim(p_room_code)))
    )
  for update;

  if not found then
    raise exception 'Room not found' using errcode = 'P0002';
  end if;

  if room_record.status = 'playing' and not coalesce(p_as_spectator, false) then
    raise exception 'Round is already in playing state. Join as spectator only.' using errcode = '22023';
  end if;

  if not coalesce(p_as_spectator, false) then
    if profile.points - profile.locked_points < room_record.buy_in_amount then
      raise exception 'Not enough points for buy-in' using errcode = '22023';
    end if;

    used_seats := array(
      select p.seat_index
      from public.rr_players p
      where p.room_id = room_record.room_id
        and p.left_at is null
        and p.status <> 'spectator'
      order by p.seat_index
    );

    select seat_no
    into next_seat
    from generate_series(1, room_record.max_players) as seat_no
    where not (seat_no = any(coalesce(used_seats, array[]::smallint[])))
    limit 1;

    if next_seat is null then
      raise exception 'Room is full' using errcode = '22023';
    end if;
  end if;

  insert into public.rr_players (
    room_id,
    user_id,
    display_name,
    avatar,
    seat_index,
    status,
    buy_in_amount,
    locked_points,
    has_shield,
    has_skip,
    joined_at,
    last_action_at,
    is_ready,
    left_at
  )
  values (
    room_record.room_id,
    current_uid,
    profile.display_name,
    profile.avatar_url,
    case when coalesce(p_as_spectator, false) then null else next_seat end,
    case when coalesce(p_as_spectator, false) then 'spectator' else 'joined' end,
    case when coalesce(p_as_spectator, false) then 0 else room_record.buy_in_amount end,
    0,
    false,
    false,
    now(),
    now(),
    false,
    null
  )
  on conflict (room_id, user_id) do update
    set display_name = excluded.display_name,
        avatar = excluded.avatar,
        seat_index = excluded.seat_index,
        status = excluded.status,
        buy_in_amount = excluded.buy_in_amount,
        has_shield = case when excluded.status = 'spectator' then false else public.rr_players.has_shield end,
        has_skip = case when excluded.status = 'spectator' then false else public.rr_players.has_skip end,
        is_ready = false,
        left_at = null,
        last_action_at = now(),
        updated_at = now()
  returning * into player_record;

  update public.rr_rooms
  set last_activity_at = now(),
      updated_at = now()
  where room_id = room_record.room_id;

  return player_record;
end;
$$;

create or replace function public.rr_leave_room(
  p_session_token text,
  p_room_id uuid
)
returns public.rr_players
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  room_record public.rr_rooms%rowtype;
  player_record public.rr_players%rowtype;
begin
  select * into room_record from public.rr_rooms where room_id = p_room_id for update;
  if not found then
    raise exception 'Room not found' using errcode = 'P0002';
  end if;

  update public.rr_players
  set is_ready = false,
      left_at = now(),
      last_action_at = now(),
      status = case
        when room_record.status = 'playing' and status <> 'spectator' then 'eliminated'
        when status = 'spectator' then 'spectator'
        else 'joined'
      end,
      updated_at = now()
  where room_id = p_room_id
    and user_id = current_uid
    and left_at is null
  returning * into player_record;

  if not found then
    raise exception 'Player is not in this room' using errcode = 'P0002';
  end if;

  update public.rr_rooms
  set last_activity_at = now(),
      updated_at = now()
  where room_id = p_room_id;

  return player_record;
end;
$$;

create or replace function public.rr_set_ready(
  p_session_token text,
  p_room_id uuid,
  p_is_ready boolean default true
)
returns public.rr_players
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  room_record public.rr_rooms%rowtype;
  player_record public.rr_players%rowtype;
  user_record public.users%rowtype;
  lock_before integer;
  ready_count integer;
begin
  select * into room_record from public.rr_rooms where room_id = p_room_id for update;
  if not found then
    raise exception 'Room not found' using errcode = 'P0002';
  end if;

  if room_record.status not in ('waiting', 'countdown', 'completed') then
    raise exception 'Cannot change ready state while room is in play' using errcode = '22023';
  end if;

  select * into player_record
  from public.rr_players
  where room_id = p_room_id
    and user_id = current_uid
    and left_at is null
  for update;

  if not found then
    raise exception 'Join room first' using errcode = 'P0002';
  end if;

  if player_record.status = 'spectator' then
    raise exception 'Spectator cannot ready' using errcode = '22023';
  end if;

  select * into user_record from public.users where uid = current_uid for update;

  if coalesce(p_is_ready, true) then
    if player_record.locked_points = 0 then
      if user_record.points - user_record.locked_points < room_record.buy_in_amount then
        raise exception 'Not enough points for buy-in lock' using errcode = '22023';
      end if;

      lock_before := user_record.locked_points;

      update public.users
      set locked_points = public.users.locked_points + room_record.buy_in_amount,
          points_updated_at = now()
      where uid = current_uid
      returning * into user_record;

      insert into public.points_transactions (
        user_id,
        game_type,
        type,
        amount,
        points_before,
        points_after,
        locked_before,
        locked_after,
        room_id,
        rr_round_id,
        note
      )
      values (
        current_uid,
        'russian_roulette',
        'buy_in_lock',
        room_record.buy_in_amount,
        user_record.points,
        user_record.points,
        lock_before,
        user_record.locked_points,
        p_room_id,
        null,
        'RR buy-in locked'
      );
    end if;

    update public.rr_players
    set is_ready = true,
        status = 'ready',
        buy_in_amount = room_record.buy_in_amount,
        locked_points = room_record.buy_in_amount,
        has_shield = false,
        has_skip = false,
        last_action_at = now(),
        updated_at = now()
    where room_id = p_room_id and user_id = current_uid
    returning * into player_record;

    select count(*)::integer
    into ready_count
    from public.rr_players p
    where p.room_id = p_room_id
      and p.left_at is null
      and p.status <> 'spectator'
      and p.is_ready = true
      and p.locked_points >= room_record.buy_in_amount;

    if room_record.status = 'waiting' and ready_count >= 2 then
      update public.rr_rooms
      set status = 'countdown',
          countdown_ends_at = now() + interval '8 seconds',
          updated_at = now(),
          last_activity_at = now()
      where room_id = p_room_id
      returning * into room_record;
    end if;
  else
    if room_record.status = 'countdown' then
      update public.rr_rooms set status = 'waiting', countdown_ends_at = null where room_id = p_room_id;
    end if;

    if player_record.locked_points > 0 then
      lock_before := user_record.locked_points;

      update public.users
      set locked_points = greatest(0, public.users.locked_points - player_record.locked_points),
          points_updated_at = now()
      where uid = current_uid
      returning * into user_record;

      insert into public.points_transactions (
        user_id,
        game_type,
        type,
        amount,
        points_before,
        points_after,
        locked_before,
        locked_after,
        room_id,
        rr_round_id,
        note
      )
      values (
        current_uid,
        'russian_roulette',
        'refund',
        player_record.locked_points,
        user_record.points,
        user_record.points,
        lock_before,
        user_record.locked_points,
        p_room_id,
        null,
        'RR ready cancelled refund lock'
      );
    end if;

    update public.rr_players
    set is_ready = false,
        status = 'joined',
        locked_points = 0,
        has_shield = false,
        has_skip = false,
        last_action_at = now(),
        updated_at = now()
    where room_id = p_room_id and user_id = current_uid
    returning * into player_record;
  end if;

  update public.rr_rooms
  set last_activity_at = now(),
      updated_at = now()
  where room_id = p_room_id;

  return player_record;
end;
$$;

create or replace function public.rr_start_round(
  p_room_id uuid
)
returns public.rr_rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  room_record public.rr_rooms%rowtype;
  new_round public.rr_rounds%rowtype;
  order_list uuid[];
  ready_count integer;
  first_player uuid;
begin
  select * into room_record from public.rr_rooms where room_id = p_room_id for update;
  if not found then
    raise exception 'Room not found' using errcode = 'P0002';
  end if;

  if room_record.status not in ('countdown', 'waiting', 'completed') then
    raise exception 'Room cannot start now' using errcode = '22023';
  end if;

  select array_agg(p.user_id order by p.seat_index asc)
  into order_list
  from public.rr_players p
  where p.room_id = p_room_id
    and p.left_at is null
    and p.status <> 'spectator'
    and p.is_ready = true
    and p.locked_points >= room_record.buy_in_amount;

  ready_count := coalesce(array_length(order_list, 1), 0);

  if ready_count < 2 then
    raise exception 'Need at least 2 ready players' using errcode = '22023';
  end if;

  first_player := order_list[1];

  insert into public.rr_rounds (
    room_id,
    status,
    player_order,
    current_player_id,
    current_turn_index,
    danger_index,
    trigger_count,
    pot_amount,
    started_at,
    turn_started_at,
    turn_ends_at
  )
  values (
    p_room_id,
    'playing',
    order_list,
    first_player,
    1,
    public.rr_danger_roll(),
    0,
    ready_count * room_record.buy_in_amount,
    now(),
    now(),
    now() + interval '15 seconds'
  )
  returning * into new_round;

  update public.rr_players
  set status = 'playing',
      is_ready = false,
      has_shield = case when room_record.enable_items then true else false end,
      has_skip = case when room_record.enable_items then true else false end,
      last_action_at = now(),
      updated_at = now()
  where room_id = p_room_id
    and left_at is null
    and status <> 'spectator'
    and user_id = any(order_list);

  update public.rr_rooms
  set status = 'playing',
      current_round_id = new_round.round_id,
      countdown_ends_at = null,
      last_activity_at = now(),
      updated_at = now()
  where room_id = p_room_id;

  return new_round;
end;
$$;

create or replace function public.rr_settle_round(
  p_round_id uuid,
  p_reason text default 'completed',
  p_settled_by uuid default null
)
returns public.rr_rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  round_record public.rr_rounds%rowtype;
  winner_uid uuid;
  alive_count integer;
  participant record;
  user_record public.users%rowtype;
  lock_before integer;
  points_before integer;
  settle_status text;
begin
  select * into round_record from public.rr_rounds where round_id = p_round_id for update;
  if not found then
    raise exception 'Round not found' using errcode = 'P0002';
  end if;

  if round_record.status in ('completed', 'cancelled') then
    return round_record;
  end if;

  select count(*)::integer
  into alive_count
  from public.rr_players p
  where p.room_id = round_record.room_id
    and p.left_at is null
    and p.status not in ('eliminated', 'spectator');

  select p.user_id
  into winner_uid
  from public.rr_players p
  where p.room_id = round_record.room_id
    and p.left_at is null
    and p.status not in ('eliminated', 'spectator')
  order by p.seat_index
  limit 1;

  if p_reason = 'cancelled' or alive_count = 0 then
    settle_status := 'cancelled';
  else
    settle_status := 'completed';
  end if;

  for participant in
    select *
    from public.rr_players p
    where p.room_id = round_record.room_id
      and p.status <> 'spectator'
      and p.locked_points > 0
    for update
  loop
    select * into user_record from public.users where uid = participant.user_id for update;

    lock_before := user_record.locked_points;
    points_before := user_record.points;

    if settle_status = 'cancelled' then
      update public.users
      set locked_points = greatest(0, public.users.locked_points - participant.locked_points),
          points_updated_at = now()
      where uid = participant.user_id
      returning * into user_record;

      insert into public.points_transactions (
        user_id,
        game_type,
        type,
        amount,
        points_before,
        points_after,
        locked_before,
        locked_after,
        room_id,
        rr_round_id,
        note
      )
      values (
        participant.user_id,
        'russian_roulette',
        'refund',
        participant.locked_points,
        points_before,
        user_record.points,
        lock_before,
        user_record.locked_points,
        round_record.room_id,
        round_record.round_id,
        coalesce(p_reason, 'Round cancelled')
      );
    else
      if participant.user_id = winner_uid then
        update public.users
        set points = public.users.points - participant.locked_points + round_record.pot_amount,
            locked_points = greatest(0, public.users.locked_points - participant.locked_points),
            points_updated_at = now()
        where uid = participant.user_id
        returning * into user_record;

        insert into public.points_transactions (
          user_id,
          game_type,
          type,
          amount,
          points_before,
          points_after,
          locked_before,
          locked_after,
          room_id,
          rr_round_id,
          note
        )
        values (
          participant.user_id,
          'russian_roulette',
          'win_pot',
          round_record.pot_amount,
          points_before,
          user_record.points,
          lock_before,
          user_record.locked_points,
          round_record.room_id,
          round_record.round_id,
          'RR winner payout'
        );
      else
        update public.users
        set points = greatest(0, public.users.points - participant.locked_points),
            locked_points = greatest(0, public.users.locked_points - participant.locked_points),
            points_updated_at = now()
        where uid = participant.user_id
        returning * into user_record;
      end if;
    end if;

    update public.rr_players
    set locked_points = 0,
        status = case
          when status = 'spectator' then 'spectator'
          when settle_status = 'completed' and user_id = winner_uid then 'winner'
          when settle_status = 'completed' and status <> 'eliminated' then 'eliminated'
          else status
        end,
        has_shield = false,
        has_skip = false,
        updated_at = now()
    where room_id = round_record.room_id and user_id = participant.user_id;
  end loop;

  update public.rr_rounds
  set status = settle_status,
      winner_id = case when settle_status = 'completed' then winner_uid else null end,
      completed_at = case when settle_status = 'completed' then now() else null end,
      cancelled_at = case when settle_status = 'cancelled' then now() else null end,
      turn_ends_at = null
  where round_id = round_record.round_id
  returning * into round_record;

  if settle_status = 'completed' and winner_uid is not null then
    insert into public.rr_actions (
      round_id,
      room_id,
      user_id,
      action_type,
      result,
      trigger_count_before,
      trigger_count_after
    )
    values (
      round_record.round_id,
      round_record.room_id,
      winner_uid,
      'winner',
      'safe',
      round_record.trigger_count,
      round_record.trigger_count
    );
  end if;

  update public.rr_rooms
  set status = settle_status,
      current_round_id = null,
      countdown_ends_at = case when settle_status = 'completed' then now() + interval '8 seconds' else null end,
      last_activity_at = now(),
      updated_at = now()
  where room_id = round_record.room_id;

  return round_record;
end;
$$;

create or replace function public.rr_cancel_round(
  p_room_id uuid,
  p_reason text default 'cancelled'
)
returns public.rr_rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  room_record public.rr_rooms%rowtype;
  round_record public.rr_rounds%rowtype;
begin
  select * into room_record from public.rr_rooms where room_id = p_room_id for update;
  if not found then
    raise exception 'Room not found' using errcode = 'P0002';
  end if;

  if room_record.current_round_id is null then
    update public.rr_rooms
    set status = 'cancelled',
        updated_at = now(),
        last_activity_at = now()
    where room_id = p_room_id;
    return null;
  end if;

  round_record := public.rr_settle_round(room_record.current_round_id, coalesce(p_reason, 'cancelled'), null);
  return round_record;
end;
$$;

create or replace function public.rr_apply_action(
  p_room_id uuid,
  p_user_id uuid,
  p_action text,
  p_is_auto boolean default false
)
returns public.rr_actions
language plpgsql
security definer
set search_path = public
as $$
declare
  action_name text := lower(trim(coalesce(p_action, '')));
  room_record public.rr_rooms%rowtype;
  round_record public.rr_rounds%rowtype;
  player_record public.rr_players%rowtype;
  action_record public.rr_actions%rowtype;
  trigger_before integer;
  trigger_after integer;
  chamber_index integer;
  danger_hit boolean;
  using_shield boolean := false;
  next_slot record;
  alive_count integer;
begin
  if action_name not in ('pull_trigger', 'use_shield', 'skip_turn') then
    raise exception 'Invalid action' using errcode = '22023';
  end if;

  select * into room_record from public.rr_rooms where room_id = p_room_id for update;
  if not found then
    raise exception 'Room not found' using errcode = 'P0002';
  end if;

  if room_record.status <> 'playing' or room_record.current_round_id is null then
    raise exception 'Room is not playing' using errcode = '22023';
  end if;

  select * into round_record from public.rr_rounds where round_id = room_record.current_round_id for update;

  if not found or round_record.status <> 'playing' then
    raise exception 'Round is not playing' using errcode = '22023';
  end if;

  select * into player_record
  from public.rr_players
  where room_id = p_room_id
    and user_id = p_user_id
    and left_at is null
  for update;

  if not found then
    raise exception 'Player is not active in room' using errcode = 'P0002';
  end if;

  if player_record.status in ('eliminated', 'spectator') then
    raise exception 'Player cannot act in current state' using errcode = '22023';
  end if;

  if round_record.current_player_id <> p_user_id then
    raise exception 'It is not your turn' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.rr_actions a
    where a.round_id = round_record.round_id
      and a.user_id = p_user_id
      and round_record.turn_started_at is not null
      and a.created_at >= round_record.turn_started_at
      and a.action_type in ('pull_trigger', 'use_shield', 'skip_turn', 'auto_action')
  ) then
    raise exception 'Already acted this turn' using errcode = '22023';
  end if;

  if not p_is_auto and player_record.last_action_at is not null and player_record.last_action_at > now() - interval '300 milliseconds' then
    raise exception 'Too many requests. Please slow down.' using errcode = '22023';
  end if;

  trigger_before := round_record.trigger_count;

  if action_name = 'skip_turn' then
    if not room_record.enable_items then
      raise exception 'Items are disabled in this room' using errcode = '22023';
    end if;
    if not player_record.has_skip then
      raise exception 'Skip item has already been used' using errcode = '22023';
    end if;

    update public.rr_players
    set has_skip = false,
        last_action_at = now(),
        updated_at = now()
    where room_id = p_room_id and user_id = p_user_id;

    insert into public.rr_actions (
      round_id,
      room_id,
      user_id,
      action_type,
      result,
      trigger_count_before,
      trigger_count_after
    )
    values (
      round_record.round_id,
      p_room_id,
      p_user_id,
      case when p_is_auto then 'auto_action' else 'skip_turn' end,
      'skipped',
      trigger_before,
      trigger_before
    )
    returning * into action_record;

    select * into next_slot from public.rr_pick_next_player(round_record.round_id) limit 1;

    if next_slot.next_user_id is null then
      perform public.rr_settle_round(round_record.round_id, 'completed', p_user_id);
    else
      update public.rr_rounds
      set current_player_id = next_slot.next_user_id,
          current_turn_index = next_slot.next_index,
          turn_started_at = now(),
          turn_ends_at = now() + interval '15 seconds'
      where round_id = round_record.round_id;
    end if;

    update public.rr_rooms set last_activity_at = now(), updated_at = now() where room_id = p_room_id;
    return action_record;
  end if;

  if action_name = 'use_shield' then
    if not room_record.enable_items then
      raise exception 'Items are disabled in this room' using errcode = '22023';
    end if;
    if not player_record.has_shield then
      raise exception 'Shield item has already been used' using errcode = '22023';
    end if;

    using_shield := true;

    update public.rr_players
    set has_shield = false,
        last_action_at = now(),
        updated_at = now()
    where room_id = p_room_id and user_id = p_user_id;
  end if;

  trigger_after := trigger_before + 1;
  chamber_index := ((trigger_after - 1) % 6) + 1;
  danger_hit := chamber_index = round_record.danger_index;

  if danger_hit and not using_shield then
    update public.rr_players
    set status = 'eliminated',
        last_action_at = now(),
        updated_at = now()
    where room_id = p_room_id and user_id = p_user_id;

    insert into public.rr_actions (
      round_id,
      room_id,
      user_id,
      action_type,
      result,
      trigger_count_before,
      trigger_count_after
    )
    values (
      round_record.round_id,
      p_room_id,
      p_user_id,
      case when p_is_auto then 'auto_action' else 'pull_trigger' end,
      'danger',
      trigger_before,
      trigger_after
    )
    returning * into action_record;

    insert into public.rr_actions (
      round_id,
      room_id,
      user_id,
      action_type,
      result,
      trigger_count_before,
      trigger_count_after
    )
    values (
      round_record.round_id,
      p_room_id,
      p_user_id,
      'eliminated',
      'danger',
      trigger_before,
      trigger_after
    );
  elsif danger_hit and using_shield then
    insert into public.rr_actions (
      round_id,
      room_id,
      user_id,
      action_type,
      result,
      trigger_count_before,
      trigger_count_after
    )
    values (
      round_record.round_id,
      p_room_id,
      p_user_id,
      case when p_is_auto then 'auto_action' else 'use_shield' end,
      'blocked',
      trigger_before,
      trigger_after
    )
    returning * into action_record;

    update public.rr_players
    set last_action_at = now(),
        updated_at = now()
    where room_id = p_room_id and user_id = p_user_id;
  else
    insert into public.rr_actions (
      round_id,
      room_id,
      user_id,
      action_type,
      result,
      trigger_count_before,
      trigger_count_after
    )
    values (
      round_record.round_id,
      p_room_id,
      p_user_id,
      case when p_is_auto then 'auto_action' else (case when action_name = 'use_shield' then 'use_shield' else 'pull_trigger' end) end,
      'safe',
      trigger_before,
      trigger_after
    )
    returning * into action_record;

    update public.rr_players
    set last_action_at = now(),
        updated_at = now()
    where room_id = p_room_id and user_id = p_user_id;
  end if;

  select count(*)::integer
  into alive_count
  from public.rr_players p
  where p.room_id = p_room_id
    and p.left_at is null
    and p.status not in ('eliminated', 'spectator');

  if alive_count <= 1 then
    update public.rr_rounds
    set trigger_count = trigger_after,
        danger_index = public.rr_danger_roll()
    where round_id = round_record.round_id;

    perform public.rr_settle_round(round_record.round_id, 'completed', p_user_id);
    return action_record;
  end if;

  select * into next_slot from public.rr_pick_next_player(round_record.round_id) limit 1;

  if next_slot.next_user_id is null then
    update public.rr_rounds
    set trigger_count = trigger_after,
        danger_index = public.rr_danger_roll()
    where round_id = round_record.round_id;

    perform public.rr_settle_round(round_record.round_id, 'completed', p_user_id);
    return action_record;
  end if;

  update public.rr_rounds
  set trigger_count = trigger_after,
      danger_index = case when danger_hit then public.rr_danger_roll() else round_record.danger_index end,
      current_player_id = next_slot.next_user_id,
      current_turn_index = next_slot.next_index,
      turn_started_at = now(),
      turn_ends_at = now() + interval '15 seconds'
  where round_id = round_record.round_id;

  update public.rr_rooms
  set last_activity_at = now(),
      updated_at = now()
  where room_id = p_room_id;

  return action_record;
end;
$$;

create or replace function public.rr_perform_action(
  p_session_token text,
  p_room_id uuid,
  p_action text
)
returns public.rr_actions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  user_record public.users%rowtype;
begin
  select * into user_record from public.users where uid = current_uid;
  if not found or user_record.is_banned then
    raise exception 'Account cannot perform action' using errcode = '42501';
  end if;

  return public.rr_apply_action(p_room_id, current_uid, p_action, false);
end;
$$;

create or replace function public.rr_tick_rooms(
  p_session_token text
)
returns table (
  room_id uuid,
  status text,
  current_round_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
  room_record public.rr_rooms%rowtype;
  round_record public.rr_rounds%rowtype;
  ready_count integer;
  auto_action text;
begin
  select * into profile from public.users where uid = current_uid;
  if not found or profile.is_banned then
    raise exception 'Account cannot tick rooms' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext('rr_tick_rooms_v1'));

  for room_record in
    select * from public.rr_rooms r where r.status <> 'cancelled' for update
  loop
    if room_record.status = 'waiting' then
      select count(*)::integer
      into ready_count
      from public.rr_players p
      where p.room_id = room_record.room_id
        and p.left_at is null
        and p.status <> 'spectator'
        and p.is_ready = true
        and p.locked_points >= room_record.buy_in_amount;

      if ready_count >= 2 then
        update public.rr_rooms
        set status = 'countdown',
            countdown_ends_at = now() + interval '8 seconds',
            last_activity_at = now(),
            updated_at = now()
        where room_id = room_record.room_id
        returning * into room_record;
      end if;

    elsif room_record.status = 'countdown' then
      select count(*)::integer
      into ready_count
      from public.rr_players p
      where p.room_id = room_record.room_id
        and p.left_at is null
        and p.status <> 'spectator'
        and p.is_ready = true
        and p.locked_points >= room_record.buy_in_amount;

      if ready_count < 2 then
        update public.rr_rooms
        set status = 'waiting',
            countdown_ends_at = null,
            last_activity_at = now(),
            updated_at = now()
        where room_id = room_record.room_id
        returning * into room_record;
      elsif room_record.countdown_ends_at is not null and room_record.countdown_ends_at <= now() then
        begin
          round_record := public.rr_start_round(room_record.room_id);
        exception when others then
          update public.rr_rooms
          set status = 'waiting',
              countdown_ends_at = null,
              updated_at = now(),
              last_activity_at = now()
          where room_id = room_record.room_id;
        end;
      end if;

    elsif room_record.status = 'playing' and room_record.current_round_id is not null then
      select * into round_record from public.rr_rounds where round_id = room_record.current_round_id for update;

      if found and round_record.status = 'playing' and round_record.turn_ends_at is not null and round_record.turn_ends_at <= now() then
        if exists (
          select 1 from public.rr_players p
          where p.room_id = room_record.room_id
            and p.user_id = round_record.current_player_id
            and p.left_at is null
            and p.has_skip = true
            and room_record.enable_items = true
        ) then
          auto_action := 'skip_turn';
        else
          auto_action := 'pull_trigger';
        end if;

        begin
          perform public.rr_apply_action(room_record.room_id, round_record.current_player_id, auto_action, true);
        exception when others then
          perform public.rr_apply_action(room_record.room_id, round_record.current_player_id, 'pull_trigger', true);
        end;
      end if;

    elsif room_record.status = 'completed' then
      if room_record.countdown_ends_at is not null and room_record.countdown_ends_at <= now() then
        update public.rr_players
        set status = case when public.rr_players.status = 'spectator' then 'spectator' else 'joined' end,
            is_ready = false,
            has_shield = false,
            has_skip = false,
            updated_at = now()
        where room_id = room_record.room_id
          and left_at is null;

        update public.rr_rooms
        set status = 'waiting',
            countdown_ends_at = null,
            updated_at = now(),
            last_activity_at = now()
        where room_id = room_record.room_id;
      end if;
    end if;

    select * into room_record from public.rr_rooms where room_id = room_record.room_id;
    room_id := room_record.room_id;
    status := room_record.status;
    current_round_id := room_record.current_round_id;
    return next;
  end loop;
end;
$$;

create or replace function public.rr_cleanup_inactive_rooms(
  p_session_token text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
  affected integer := 0;
  room_record record;
begin
  select * into profile from public.users where uid = current_uid;
  if not found or profile.is_banned then
    raise exception 'Account cannot cleanup rooms' using errcode = '42501';
  end if;

  for room_record in
    select r.room_id
    from public.rr_rooms r
    where r.last_activity_at < now() - interval '60 minutes'
      and r.status in ('waiting', 'completed', 'cancelled')
  loop
    update public.rr_players
    set left_at = coalesce(left_at, now()),
        is_ready = false,
        status = case when status = 'spectator' then 'spectator' else 'joined' end,
        updated_at = now()
    where room_id = room_record.room_id
      and left_at is null;

    update public.rr_rooms
    set status = 'cancelled',
        updated_at = now(),
        last_activity_at = now()
    where room_id = room_record.room_id;

    affected := affected + 1;
  end loop;

  return affected;
end;
$$;

create or replace function public.rr_send_chat_message(
  p_session_token text,
  p_room_id uuid,
  p_text text
)
returns public.rr_chat_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  room_record public.rr_rooms%rowtype;
  player_record public.rr_players%rowtype;
  profile public.users%rowtype;
  recent_message public.rr_chat_messages%rowtype;
  clean_text text := trim(coalesce(p_text, ''));
  created_message public.rr_chat_messages%rowtype;
begin
  if clean_text = '' or char_length(clean_text) > 300 then
    raise exception 'Message must be 1-300 characters' using errcode = '22023';
  end if;

  select * into room_record from public.rr_rooms where room_id = p_room_id;
  if not found then
    raise exception 'Room not found' using errcode = 'P0002';
  end if;

  select * into player_record
  from public.rr_players
  where room_id = p_room_id
    and user_id = current_uid
    and left_at is null;

  if not found then
    raise exception 'Join room before chatting' using errcode = '42501';
  end if;

  if player_record.status = 'spectator' and not room_record.allow_spectator_chat then
    raise exception 'Spectator chat is disabled in this room' using errcode = '42501';
  end if;

  select * into profile from public.users where uid = current_uid;

  select * into recent_message
  from public.rr_chat_messages
  where room_id = p_room_id
    and user_id = current_uid
    and is_deleted = false
  order by created_at desc
  limit 1;

  if found and recent_message.created_at > now() - interval '2 seconds' then
    raise exception 'Please wait 2 seconds before sending another message' using errcode = '22023';
  end if;

  insert into public.rr_chat_messages (
    room_id,
    user_id,
    display_name,
    avatar,
    text
  )
  values (
    p_room_id,
    current_uid,
    profile.display_name,
    profile.avatar_url,
    clean_text
  )
  returning * into created_message;

  return created_message;
end;
$$;

create or replace function public.rr_get_room_state(
  p_session_token text,
  p_room_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  room_record public.rr_rooms%rowtype;
  joined boolean;
begin
  -- Keep room lifecycle progressing even when client-side tick loop is delayed.
  -- Do not swallow errors so client can see permission/schema issues instead of a silent stuck timer.
  perform * from public.rr_tick_rooms(p_session_token);

  select * into room_record from public.rr_rooms where room_id = p_room_id;
  if not found then
    raise exception 'Room not found' using errcode = 'P0002';
  end if;

  joined := exists (
    select 1
    from public.rr_players p
    where p.room_id = p_room_id
      and p.user_id = current_uid
      and p.left_at is null
  );

  if not joined then
    raise exception 'You are not a member of this room' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'room', to_jsonb(room_record),
    'round', (
      select to_jsonb(r)
      from public.rr_rounds r
      where r.round_id = room_record.current_round_id
      limit 1
    ),
    'players', (
      select coalesce(jsonb_agg(to_jsonb(p) order by p.status = 'spectator', p.seat_index nulls last), '[]'::jsonb)
      from public.rr_players p
      where p.room_id = p_room_id
        and p.left_at is null
    ),
    'actions', (
      select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at asc), '[]'::jsonb)
      from (
        select *
        from public.rr_actions
        where room_id = p_room_id
        order by created_at desc
        limit 80
      ) a
    ),
    'chat', (
      select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at asc), '[]'::jsonb)
      from (
        select *
        from public.rr_chat_messages
        where room_id = p_room_id
          and is_deleted = false
        order by created_at desc
        limit 80
      ) c
    ),
    'settings', (
      select to_jsonb(s)
      from public.rr_game_settings s
      where s.settings_id = 1
    )
  );
end;
$$;

create or replace function public.admin_rr_list_active_rooms(
  p_session_token text
)
returns setof public.rr_rooms
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin(p_session_token);

  return query
  select *
  from public.rr_rooms r
  where r.status <> 'cancelled'
  order by r.updated_at desc
  limit 120;
end;
$$;

create or replace function public.admin_rr_get_room_state(
  p_session_token text,
  p_room_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin(p_session_token);

  return jsonb_build_object(
    'room', (select to_jsonb(r) from public.rr_rooms r where r.room_id = p_room_id),
    'round', (
      select to_jsonb(rr)
      from public.rr_rounds rr
      where rr.room_id = p_room_id
      order by rr.created_at desc
      limit 1
    ),
    'players', (
      select coalesce(jsonb_agg(to_jsonb(p) order by p.status = 'spectator', p.seat_index nulls last), '[]'::jsonb)
      from public.rr_players p
      where p.room_id = p_room_id
    ),
    'actions', (
      select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb)
      from (
        select *
        from public.rr_actions
        where room_id = p_room_id
        order by created_at desc
        limit 200
      ) a
    ),
    'chat', (
      select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc), '[]'::jsonb)
      from (
        select *
        from public.rr_chat_messages
        where room_id = p_room_id
        order by created_at desc
        limit 200
      ) c
    ),
    'settings', (select to_jsonb(s) from public.rr_game_settings s where settings_id = 1)
  );
end;
$$;

create or replace function public.admin_rr_force_cancel_room(
  p_session_token text,
  p_room_id uuid,
  p_note text default null
)
returns public.rr_rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_uid uuid := public.assert_admin(p_session_token);
  room_record public.rr_rooms%rowtype;
  round_record public.rr_rounds%rowtype;
begin
  select * into room_record from public.rr_rooms where room_id = p_room_id for update;
  if not found then
    raise exception 'Room not found' using errcode = 'P0002';
  end if;

  if room_record.current_round_id is not null then
    round_record := public.rr_settle_round(room_record.current_round_id, 'cancelled', admin_uid);
  else
    update public.rr_rooms
    set status = 'cancelled',
        last_activity_at = now(),
        updated_at = now()
    where room_id = p_room_id;
    return null;
  end if;

  insert into public.admin_logs (admin_id, action, details)
  values (
    admin_uid,
    'admin_rr_force_cancel_room',
    jsonb_build_object('room_id', p_room_id, 'note', p_note)
  );

  return round_record;
end;
$$;

create or replace function public.admin_rr_set_game_enabled(
  p_session_token text,
  p_is_enabled boolean
)
returns public.rr_game_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_uid uuid := public.assert_admin(p_session_token);
  settings_record public.rr_game_settings%rowtype;
begin
  update public.rr_game_settings
  set is_enabled = coalesce(p_is_enabled, true),
      updated_by = admin_uid,
      updated_at = now()
  where settings_id = 1
  returning * into settings_record;

  insert into public.admin_logs (admin_id, action, details)
  values (admin_uid, 'admin_rr_set_game_enabled', jsonb_build_object('is_enabled', p_is_enabled));

  return settings_record;
end;
$$;

create or replace function public.admin_rr_update_settings(
  p_session_token text,
  p_min_buy_in integer,
  p_max_buy_in integer,
  p_max_players smallint,
  p_enable_items boolean
)
returns public.rr_game_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_uid uuid := public.assert_admin(p_session_token);
  settings_record public.rr_game_settings%rowtype;
begin
  if p_min_buy_in < 1 or p_max_buy_in < p_min_buy_in then
    raise exception 'Invalid buy-in range' using errcode = '22023';
  end if;

  if p_max_players < 2 or p_max_players > 6 then
    raise exception 'Invalid max players value' using errcode = '22023';
  end if;

  update public.rr_game_settings
  set min_buy_in = p_min_buy_in,
      max_buy_in = p_max_buy_in,
      max_players = p_max_players,
      enable_items = coalesce(p_enable_items, enable_items),
      updated_by = admin_uid,
      updated_at = now()
  where settings_id = 1
  returning * into settings_record;

  insert into public.admin_logs (admin_id, action, details)
  values (
    admin_uid,
    'admin_rr_update_settings',
    jsonb_build_object(
      'min_buy_in', p_min_buy_in,
      'max_buy_in', p_max_buy_in,
      'max_players', p_max_players,
      'enable_items', p_enable_items
    )
  );

  return settings_record;
end;
$$;

create or replace function public.admin_rr_delete_chat_message(
  p_session_token text,
  p_message_id uuid
)
returns public.rr_chat_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_uid uuid := public.assert_admin(p_session_token);
  message_record public.rr_chat_messages%rowtype;
begin
  update public.rr_chat_messages
  set is_deleted = true,
      deleted_at = now(),
      deleted_by = admin_uid
  where message_id = p_message_id
  returning * into message_record;

  if not found then
    raise exception 'Message not found' using errcode = 'P0002';
  end if;

  insert into public.admin_logs (admin_id, action, details)
  values (admin_uid, 'admin_rr_delete_chat_message', jsonb_build_object('message_id', p_message_id, 'room_id', message_record.room_id));

  return message_record;
end;
$$;

revoke all on public.rr_rooms from anon, authenticated;
revoke all on public.rr_players from anon, authenticated;
revoke all on public.rr_rounds from anon, authenticated;
revoke all on public.rr_actions from anon, authenticated;
revoke all on public.rr_chat_messages from anon, authenticated;
revoke all on public.rr_game_settings from anon, authenticated;

revoke all on function public.rr_create_room(text, text, boolean, integer, integer, integer, smallint, boolean, boolean) from public, anon, authenticated;
revoke all on function public.rr_join_room(text, uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.rr_leave_room(text, uuid) from public, anon, authenticated;
revoke all on function public.rr_set_ready(text, uuid, boolean) from public, anon, authenticated;
revoke all on function public.rr_perform_action(text, uuid, text) from public, anon, authenticated;
revoke all on function public.rr_get_room_state(text, uuid) from public, anon, authenticated;
revoke all on function public.rr_list_lobby_rooms(text) from public, anon, authenticated;
revoke all on function public.rr_send_chat_message(text, uuid, text) from public, anon, authenticated;
revoke all on function public.rr_tick_rooms(text) from public, anon, authenticated;
revoke all on function public.rr_cleanup_inactive_rooms(text) from public, anon, authenticated;

revoke all on function public.admin_rr_list_active_rooms(text) from public, anon, authenticated;
revoke all on function public.admin_rr_get_room_state(text, uuid) from public, anon, authenticated;
revoke all on function public.admin_rr_force_cancel_room(text, uuid, text) from public, anon, authenticated;
revoke all on function public.admin_rr_set_game_enabled(text, boolean) from public, anon, authenticated;
revoke all on function public.admin_rr_update_settings(text, integer, integer, smallint, boolean) from public, anon, authenticated;
revoke all on function public.admin_rr_delete_chat_message(text, uuid) from public, anon, authenticated;

grant execute on function public.rr_create_room(text, text, boolean, integer, integer, integer, smallint, boolean, boolean) to anon, authenticated;
grant execute on function public.rr_join_room(text, uuid, text, boolean) to anon, authenticated;
grant execute on function public.rr_leave_room(text, uuid) to anon, authenticated;
grant execute on function public.rr_set_ready(text, uuid, boolean) to anon, authenticated;
grant execute on function public.rr_perform_action(text, uuid, text) to anon, authenticated;
grant execute on function public.rr_get_room_state(text, uuid) to anon, authenticated;
grant execute on function public.rr_list_lobby_rooms(text) to anon, authenticated;
grant execute on function public.rr_send_chat_message(text, uuid, text) to anon, authenticated;
grant execute on function public.rr_tick_rooms(text) to anon, authenticated;
grant execute on function public.rr_cleanup_inactive_rooms(text) to anon, authenticated;

grant execute on function public.admin_rr_list_active_rooms(text) to anon, authenticated;
grant execute on function public.admin_rr_get_room_state(text, uuid) to anon, authenticated;
grant execute on function public.admin_rr_force_cancel_room(text, uuid, text) to anon, authenticated;
grant execute on function public.admin_rr_set_game_enabled(text, boolean) to anon, authenticated;
grant execute on function public.admin_rr_update_settings(text, integer, integer, smallint, boolean) to anon, authenticated;
grant execute on function public.admin_rr_delete_chat_message(text, uuid) to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rr_rooms'
  ) then
    alter publication supabase_realtime add table public.rr_rooms;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rr_players'
  ) then
    alter publication supabase_realtime add table public.rr_players;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rr_rounds'
  ) then
    alter publication supabase_realtime add table public.rr_rounds;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rr_actions'
  ) then
    alter publication supabase_realtime add table public.rr_actions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rr_chat_messages'
  ) then
    alter publication supabase_realtime add table public.rr_chat_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rr_game_settings'
  ) then
    alter publication supabase_realtime add table public.rr_game_settings;
  end if;
end $$;

notify pgrst, 'reload schema';

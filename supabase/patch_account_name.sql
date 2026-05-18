set search_path = public, extensions;

alter table public.users add column if not exists account_name text;

update public.users
set account_name = left(
  lower(regexp_replace(coalesce(nullif(split_part(email, '@', 1), ''), uid::text), '[^a-z0-9_]+', '_', 'g')),
  24
)
where account_name is null
  or account_name = '';

update public.users
set account_name = 'user_' || substring(uid::text from 1 for 8)
where length(account_name) < 3;

with ranked_accounts as (
  select
    uid,
    account_name,
    row_number() over (partition by account_name order by created_at, uid) as row_number
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

notify pgrst, 'reload schema';

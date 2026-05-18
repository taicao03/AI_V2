# Supabase Setup

Huong dan nay ap dung cho ban Dice Predictor co backend-first points, realtime chat va Admin Dashboard.

## 1. Env

Tao `.env.local` tu `.env.example`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-or-publishable-key
```

Lay 2 gia tri nay trong **Supabase Project Settings -> API**.

## 2. Chay schema

Mo **Supabase SQL Editor**, copy toan bo noi dung [supabase/schema.sql](./supabase/schema.sql), chay mot lan tu dau den cuoi.

Schema tao/nang cap cac bang:

- `users`: profile, role, points, locked points, aggregate stats, ban state.
- `user_credentials`: password hash cho account auth rieng.
- `account_sessions`: session token hash.
- `rounds`: round state `betting | locked | rolling | completed | cancelled`.
- `bets`: bet pending/settled/cancelled, result, points before/after/change.
- `points_transactions`: ledger audit cho moi thay doi points/locked points.
- `chat_messages`: chat realtime voi soft delete.
- `admin_logs`: audit hanh dong admin.
- `leaderboard`: compatibility table sync tu `users`.
- `bet_history`: view doc lich su bet kem round/user display data.

RPC quan trong:

- `register_account(...)`, `login_account(...)`, `logout_account(...)`
- `get_account_profile(session_token)`
- `place_bet(session_token, prediction_type, prediction_value, bet_amount)`
- `settle_due_rounds()`, `get_current_round()`
- `claim_demo_points(session_token)`
- `send_chat_message(session_token, text)`
- `delete_chat_message(session_token, message_id)`
- `admin_get_stats(session_token)`
- `admin_get_users(session_token, search)`
- `admin_adjust_points(...)`
- `admin_set_user_ban(...)`
- `admin_set_user_role(...)`
- `admin_force_settle_round(...)`
- `admin_cancel_round(...)`
- `admin_delete_chat_message(...)`

## 3. Points model

Frontend khong duoc update points truc tiep. Tat ca thay doi points di qua RPC `security definer`.

- `points`: tong balance durable cua user.
- `locked_points`: stake dang bi khoa trong bet pending.
- `availablePoints = points - locked_points`.
- Khi dat bet: RPC tao bet `pending`, tang `locked_points`, ghi `points_transactions.type = 'bet_lock'`.
- Khi round settled:
  - Win: giam `locked_points`, cong winnings vao `points`, bet `settled/win`.
  - Lose: giam `locked_points`, tru stake khoi `points`, bet `settled/lose`.
- Khi cancel round: giam `locked_points`, khong doi `points`, bet `cancelled`.

## 4. Tao admin dau tien

1. Chay app, dang ky account binh thuong.
2. Chay SQL:

```sql
update public.users
set role = 'admin'
where account_name = 'ten_tai_khoan_admin';

notify pgrst, 'reload schema';
```

3. Kiem tra:

```sql
select uid, account_name, role, is_banned
from public.users
where account_name = 'ten_tai_khoan_admin';
```

4. Refresh app va vao `/admin`.

Trang `/admin` dung backend guard bang RPC `admin_get_stats(session_token)`. Neu RPC nay thanh cong thi frontend render Admin Dashboard ke ca khi local profile role vua moi duoc update.

## 5. Security model

- Client doc public leaderboard/users fields, rounds, bets, bet history, chat.
- Client khong duoc ghi truc tiep `points`, `locked_points`, `role`, `is_banned`.
- Bet, claim points, chat send/delete, admin actions deu qua RPC.
- `user_credentials`, `account_sessions`, `points_transactions`, `admin_logs` khong expose ghi truc tiep cho client.
- Admin RPC goi `assert_admin(session_token)` o backend.

## 6. Realtime

Schema add cac table sau vao `supabase_realtime` publication:

- `users`
- `leaderboard`
- `rounds`
- `bets`
- `points_transactions`
- `chat_messages`

Neu realtime khong cap nhat, vao **Database -> Replication** kiem tra publication `supabase_realtime`.

## 7. Troubleshooting

### Khong vao duoc `/admin` du da set role admin

Chay cac query sau:

```sql
select account_name, role, is_banned
from public.users
where account_name = 'ten_tai_khoan_admin';
```

Role phai la `admin`, khong phai Supabase Auth metadata. App nay dung `public.users.role`.

Kiem tra RPC admin co duoc grant/chay duoc:

```sql
select proname
from pg_proc
where proname in ('admin_get_stats', 'assert_admin', 'get_session_user_id');
```

Neu ban vua sua role, refresh app hoac dang xuat/dang nhap lai. Frontend moi nhat se reload profile khi vao `/admin` va con kiem tra them bang `admin_get_stats`.

Neu van bi tu choi, kha nang cao session token dang thuoc account khac. Dang xuat, dang nhap dung `account_name` da update role admin, roi vao `/admin`.

Neu man `/admin` bao `Admin permission required`, chay hotfix nay de cap nhat lai backend guard va debug RPC:

```sql
create or replace function public.assert_admin(p_session_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  current_role text;
begin
  select lower(trim(coalesce(role, 'user'))) into current_role
  from public.users
  where uid = current_uid;

  if current_role is distinct from 'admin' then
    raise exception 'Admin permission required for uid %, resolved role %', current_uid, coalesce(current_role, '<missing>')
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
  select u.uid, u.account_name, u.display_name, lower(trim(coalesce(u.role, 'user'))) as role, u.is_banned, true
  from public.users u
  where u.uid = current_uid;
end;
$$;

grant execute on function public.get_admin_session_debug(text) to anon, authenticated;
grant execute on function public.admin_get_stats(text) to anon, authenticated;
notify pgrst, 'reload schema';
```

Sau do refresh `/admin`. Man bi chan se hien them block `Backend session resolve`; dung UID trong block do de set admin neu can.

### `cannot change name of view column "result" to "payout_multiplier"`

Ban dang chay schema cu co `create or replace view public.bet_history`. File moi da dung:

```sql
drop view if exists public.bet_history;
create view public.bet_history ...
```

Paste lai SQL moi nhat tu file, khong dung clipboard cu.

### `cannot change return type of existing function`

Postgres khong cho `create or replace function` khi `RETURNS TABLE` doi shape. Chay rieng:

```sql
drop function if exists public.place_bet(text, text, text, integer);
drop function if exists public.claim_demo_points(text);
```

Sau do chay lai full `supabase/schema.sql`.

### `Could not find the function ... in the schema cache`

Chay:

```sql
notify pgrst, 'reload schema';
```

Cho 10-30 giay, refresh app.

### `function gen_random_bytes(integer) does not exist`

Dam bao schema da tao extension:

```sql
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
```

File `schema.sql` da co san cac dong nay va set `search_path = public, extensions`.

## 8. Reset demo data neu can

Chi xoa rounds/bets/chat/transactions, giu users:

```sql
drop view if exists public.bet_history;
truncate table public.points_transactions restart identity cascade;
truncate table public.chat_messages restart identity cascade;
truncate table public.bets restart identity cascade;
truncate table public.rounds restart identity cascade;

update public.users
set points = 1000,
    locked_points = 0,
    total_bets = 0,
    total_wins = 0,
    total_losses = 0,
    total_points_won = 0,
    total_points_lost = 0,
    points_updated_at = now();
```

Sau reset, chay lai full `supabase/schema.sql`.

# Dice Predictor Realtime

React + TailwindCSS + Supabase Postgres/RPC/Realtime app cho tro choi mo phong du doan xuc xac. App chi dung **demo points**, khong dung tien that.

## Tinh nang chinh

- Account auth bang Supabase RPC, khong dung email signup.
- Points dong bo realtime tu `public.users`.
- Backend-only points mutation: frontend khong tu cong/tru points.
- `locked_points` de khoa diem khi bet pending.
- Cong thuc hien thi: `availablePoints = points - locked_points`.
- Round 30 giay, backend settle bet bang transaction/row lock.
- Audit points trong `points_transactions`.
- Realtime chat tai trang `/chat` va widget chat tren trang chinh.
- Admin dashboard rieng tai `/admin`.
- Admin quan ly users, points, ban/unban, role, rounds, chat va stats.
- Mini game Poker Thung Pha Sanh realtime tai `/poker` (demo points only).
- Poker co public/private table, spectator, ready/unready, chat, auto-start, auto-showdown.
- Poker logic nhay cam xu ly bang Supabase RPC + transaction lock (deal/evaluate/settle/refund).

## Cai dat local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Cap nhat `.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-or-publishable-key
```

Sau do chay full SQL trong [supabase/schema.sql](./supabase/schema.sql) theo huong dan [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).
Neu bat Poker, chay them [supabase/poker_patch.sql](./supabase/poker_patch.sql) sau `schema.sql`.
De chay game tick tren server (khong phu thuoc client), chay them [supabase/server_tick_scheduler_patch.sql](./supabase/server_tick_scheduler_patch.sql).
De bat mini game Ai La Trieu Phu, chay them [supabase/millionaire_patch.sql](./supabase/millionaire_patch.sql).
Tai lieu setup AI question bank cho game nay: [MILLIONAIRE_AI_SETUP.md](./MILLIONAIRE_AI_SETUP.md).
`millionaire_patch.sql` cung bao gom RPC cho tab admin quan ly question bank/session.
Neu can them nhieu cau hoi AI seed san, chay them [supabase/millionaire_ai_seed_batch_01.sql](./supabase/millionaire_ai_seed_batch_01.sql).

## Pages

- `/`: trang chinh dat bet, profile, leaderboard, online users, chat mini.
- `/poker`: lobby + table poker realtime.
- `/chat`: trang chat realtime rieng.
- `/admin`: admin dashboard, chi admin moi vao duoc.

Admin guard hien tai kiem tra quyen bang backend RPC `admin_get_stats(session_token)`, khong chi dua vao `profile.role` trong frontend state. Neu backend chap nhan session la admin, dashboard se render.

## Tao admin dau tien

Dang ky/dang nhap account trong app truoc, sau do chay SQL:

```sql
update public.users
set role = 'admin'
where account_name = 'ten_tai_khoan_admin';

notify pgrst, 'reload schema';
```

Kiem tra lai:

```sql
select account_name, role, is_banned
from public.users
where account_name = 'ten_tai_khoan_admin';
```

Neu van khong vao duoc `/admin`, dang xuat/dang nhap lai hoac refresh trang. Xem them troubleshooting trong [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

## Scripts

```bash
npm run dev
npm run build
npm run test
npm run preview
```

## Cau truc code

- `src/App.tsx`: routing nhe theo path va state dung chung.
- `src/pages/HomePage.tsx`: trang chinh.
- `src/pages/ChatPage.tsx`: trang chat.
- `src/pages/AdminPage.tsx`: guard backend cho admin.
- `src/components/AppShell.tsx`: layout/header chung cho user pages.
- `src/components/ChatBox.tsx`: chat realtime.
- `src/components/PointsDisplay.tsx`: hien thi available/locked points.
- `src/components/admin/*`: admin layout va cac tab dashboard.
- `src/services/*`: service layer cho auth, points, bets, rounds, chat, admin.
- `src/hooks/*`: realtime hooks.
- `src/lib/supabaseClient.ts`: Supabase client, RPC wrappers, normalizers.
- `supabase/schema.sql`: schema, RLS/grants, views, RPC functions.

## Verify

```bash
npm run build
npm test
```

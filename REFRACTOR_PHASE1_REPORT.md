# Refactor Phase 1 Report

## Baseline vs Current

### Build output (before)
- Main bundle: `dist/assets/index-*.js` ~= `971.34 kB` (gzip `254.12 kB`)
- Warning: chunk > `500 kB`

### Build output (after)
- Main entry bundle: `dist/assets/index-*.js` ~= `352.14 kB` (gzip `106.90 kB`)
- Route-level chunks now split:
  - `PokerPage` ~= `50.89 kB`
  - `RussianRoulettePage` ~= `53.49 kB`
  - `WheelSpinPage` ~= `40.47 kB`
  - `HorseRacingPage` ~= `29.90 kB`
  - `AdminPage` ~= `133.28 kB`
- Result: removed large single-entry bottleneck and enabled lazy route delivery.

### Tests
- `vitest`: `22/22` passed.

## Implemented Changes

- Introduced route-level lazy loading in `App` with `react-router-dom` + `Suspense`.
- Added `@tanstack/react-query` and migrated chat/leaderboard data loading to cached query flow with realtime update sync.
- Added production utilities:
  - `src/core/errors.ts` (`AppError`, `Result`)
  - `src/core/logger.ts` (environment-aware logger)
  - `src/core/scheduler.ts` (throttled async scheduler for polling/realtime)
  - `src/core/supabaseApi.ts` (typed RPC boundary with `zod`)
  - `src/core/queryClient.ts`
- Consolidated duplicated Poker normalizers into `src/services/pokerMappers.ts` and reused across services.
- Reduced redundant polling bursts by moving horse/wheel reload scheduling to shared scheduler.
- Memoized heavy derived computations in `App` for history/alerts.

## DB Query & Index Review Checklist (No Large Migration)

- Review/confirm indexes for frequent patterns:
  - `bet_history(created_at desc)`
  - `rounds(created_at desc)`
  - `leaderboard(points desc, updated_at asc)`
  - `chat_messages(created_at desc)`
  - `bets(round_id, status, prediction_type, prediction_value)`
  - poker tables/players/rounds by `table_id` and `updated_at`
- Ensure realtime-triggered refresh paths avoid full table scans where possible.
- Prefer incremental updates from realtime payload before falling back to full refetch.


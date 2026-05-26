-- Server-side game loop scheduler
-- Muc tieu:
-- 1) Tick game o backend, khong phu thuoc client polling
-- 2) Client chi con realtime + fallback refresh

create extension if not exists pg_cron with schema extensions;

create or replace function public.system_pick_tick_token()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  picked_token text;
begin
  select np.bot_session_token
  into picked_token
  from public.npc_profiles np
  join public.users u on u.uid = np.user_id
  where np.is_enabled = true
    and np.bot_session_token is not null
    and u.is_banned = false
  order by case when np.npc_tier = 'whale' then 0 else 1 end, random()
  limit 1;

  return picked_token;
end;
$$;

create or replace function public.system_tick_games()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  tick_token text;
  npc_summary jsonb := '{}'::jsonb;
  poker_error text := null;
begin
  perform pg_advisory_xact_lock(hashtext('system_tick_games_v1'));

  tick_token := public.system_pick_tick_token();

  if tick_token is null and to_regprocedure('public.npc_ensure_accounts()') is not null then
    begin
      perform public.npc_ensure_accounts();
    exception when others then
      null;
    end;

    tick_token := public.system_pick_tick_token();
  end if;

  if tick_token is not null and to_regprocedure('public.poker_tick_tables(text)') is not null then
    begin
      perform * from public.poker_tick_tables(tick_token);
    exception when others then
      poker_error := sqlerrm;
    end;
  end if;

  if to_regprocedure('public.npc_tick_system(text)') is not null then
    begin
      npc_summary := coalesce(public.npc_tick_system(tick_token), '{}'::jsonb);
    exception when others then
      npc_summary := jsonb_build_object('error', sqlerrm);
    end;
  end if;

  return jsonb_build_object(
    'ok', true,
    'poker_tick_error', poker_error,
    'npc_summary', npc_summary,
    'tick_at', now()
  );
end;
$$;

create or replace function public.system_cleanup_games()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  tick_token text;
  cleaned integer := 0;
begin
  tick_token := public.system_pick_tick_token();

  if tick_token is null then
    return 0;
  end if;

  if to_regprocedure('public.rr_cleanup_inactive_rooms(text)') is not null then
    begin
      cleaned := public.rr_cleanup_inactive_rooms(tick_token);
    exception when others then
      cleaned := 0;
    end;
  end if;

  return cleaned;
end;
$$;

do $$
declare
  job_record record;
begin
  if to_regclass('cron.job') is null then
    return;
  end if;

  for job_record in
    select jobid
    from cron.job
    where jobname in ('game-loop-tick-v1', 'game-loop-cleanup-v1')
  loop
    perform cron.unschedule(job_record.jobid);
  end loop;
end;
$$;

select cron.schedule(
  'game-loop-tick-v1',
  '5 seconds',
  $$select public.system_tick_games();$$
);

select cron.schedule(
  'game-loop-cleanup-v1',
  '*/5 * * * *',
  $$select public.system_cleanup_games();$$
);

revoke all on function public.system_pick_tick_token() from public, anon, authenticated;
revoke all on function public.system_tick_games() from public, anon, authenticated;
revoke all on function public.system_cleanup_games() from public, anon, authenticated;

notify pgrst, 'reload schema';

-- Millionaire mini-game (AI question bank + verified sessions)

create table if not exists public.millionaire_question_bank (
  question_id uuid primary key default gen_random_uuid(),
  topic text not null default 'mixed',
  difficulty smallint not null check (difficulty between 1 and 15),
  question_text text not null check (char_length(trim(question_text)) between 10 and 500),
  options text[] not null check (array_length(options, 1) = 4),
  correct_choice smallint not null check (correct_choice between 0 and 3),
  explanation text null,
  source_provider text not null default 'ai',
  source_model text null,
  source_prompt_version text null,
  confidence_score numeric(5,4) not null default 0.8000 check (confidence_score between 0 and 1),
  verification_status text not null default 'verified' check (verification_status in ('pending', 'verified', 'rejected')),
  citation_urls text[] not null default '{}',
  created_by uuid null references public.users(uid) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.millionaire_sessions (
  session_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(uid) on delete cascade,
  topic text not null default 'mixed',
  status text not null default 'active' check (status in ('active', 'won', 'lost', 'cancelled')),
  current_question_index integer not null default 1 check (current_question_index between 1 and 15),
  max_question_count integer not null default 15 check (max_question_count = 15),
  earned_points integer not null default 0 check (earned_points >= 0),
  guaranteed_points integer not null default 0 check (guaranteed_points >= 0),
  lifeline_5050_used boolean not null default false,
  lifeline_skip_used boolean not null default false,
  lifeline_audience_used boolean not null default false,
  created_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  updated_at timestamptz not null default now()
);

create unique index if not exists millionaire_active_session_user_uniq
  on public.millionaire_sessions (user_id)
  where status = 'active';

create table if not exists public.millionaire_session_questions (
  session_id uuid not null references public.millionaire_sessions(session_id) on delete cascade,
  question_index integer not null check (question_index between 1 and 15),
  question_id uuid not null references public.millionaire_question_bank(question_id),
  available_choices smallint[] not null default '{0,1,2,3}',
  created_at timestamptz not null default now(),
  primary key (session_id, question_index)
);

create table if not exists public.millionaire_answers (
  answer_id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.millionaire_sessions(session_id) on delete cascade,
  question_index integer not null check (question_index between 1 and 15),
  question_id uuid not null references public.millionaire_question_bank(question_id),
  selected_choice smallint not null check (selected_choice between 0 and 3),
  correct_choice smallint not null check (correct_choice between 0 and 3),
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

create unique index if not exists millionaire_answers_session_q_idx_uniq
  on public.millionaire_answers (session_id, question_index);

create table if not exists public.millionaire_points_audit (
  audit_id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.millionaire_sessions(session_id) on delete cascade,
  user_id uuid not null references public.users(uid) on delete cascade,
  reason text not null,
  amount integer not null,
  points_before integer not null,
  points_after integer not null,
  created_at timestamptz not null default now()
);

create index if not exists millionaire_qbank_topic_diff_idx
  on public.millionaire_question_bank (topic, difficulty, verification_status, created_at desc);

create index if not exists millionaire_sessions_user_created_idx
  on public.millionaire_sessions (user_id, created_at desc);

create index if not exists millionaire_winner_idx
  on public.millionaire_sessions (status, earned_points desc, ended_at desc);

create or replace function public.millionaire_prize_for_index(p_question_index integer)
returns integer
language sql
immutable
as $$
  select case p_question_index
    when 1 then 1000
    when 2 then 2000
    when 3 then 3000
    when 4 then 5000
    when 5 then 10000
    when 6 then 20000
    when 7 then 40000
    when 8 then 80000
    when 9 then 160000
    when 10 then 320000
    when 11 then 640000
    when 12 then 1250000
    when 13 then 2500000
    when 14 then 5000000
    when 15 then 10000000
    else 0
  end;
$$;

create or replace function public.millionaire_guaranteed_for_index(p_question_index integer)
returns integer
language sql
immutable
as $$
  select case
    when p_question_index >= 10 then 320000
    when p_question_index >= 5 then 10000
    else 0
  end;
$$;

create or replace function public.millionaire_get_current_session_state(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
  session_record public.millionaire_sessions%rowtype;
  mapping_record public.millionaire_session_questions%rowtype;
  question_record public.millionaire_question_bank%rowtype;
begin
  select * into profile from public.users where uid = current_uid;
  if not found or profile.is_banned then
    raise exception 'Account is banned or unavailable' using errcode = '42501';
  end if;

  select *
  into session_record
  from public.millionaire_sessions s
  where s.user_id = current_uid
    and s.status = 'active'
  order by s.created_at desc
  limit 1;

  if not found then
    return null;
  end if;

  select *
  into mapping_record
  from public.millionaire_session_questions sq
  where sq.session_id = session_record.session_id
    and sq.question_index = session_record.current_question_index;

  if found then
    select * into question_record
    from public.millionaire_question_bank q
    where q.question_id = mapping_record.question_id;
  end if;

  return jsonb_build_object(
    'session_id', session_record.session_id,
    'status', session_record.status,
    'topic', session_record.topic,
    'current_question_index', session_record.current_question_index,
    'max_question_count', session_record.max_question_count,
    'earned_points', session_record.earned_points,
    'guaranteed_points', session_record.guaranteed_points,
    'lifeline_5050_used', session_record.lifeline_5050_used,
    'lifeline_skip_used', session_record.lifeline_skip_used,
    'lifeline_audience_used', session_record.lifeline_audience_used,
    'created_at', session_record.created_at,
    'started_at', session_record.started_at,
    'ended_at', session_record.ended_at,
    'updated_at', session_record.updated_at,
    'question', case
      when question_record.question_id is null then null
      else jsonb_build_object(
        'question_id', question_record.question_id,
        'topic', question_record.topic,
        'difficulty', question_record.difficulty,
        'question_text', question_record.question_text,
        'options', to_jsonb(question_record.options),
        'available_choices', to_jsonb(coalesce(mapping_record.available_choices, array[0, 1, 2, 3]))
      )
    end
  );
end;
$$;

create or replace function public.millionaire_start_session(
  p_session_token text,
  p_topic text default 'mixed'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
  new_session public.millionaire_sessions%rowtype;
  normalized_topic text := lower(trim(coalesce(p_topic, 'mixed')));
  chosen_question_id uuid;
  chosen_ids uuid[] := '{}';
  idx integer;
begin
  select * into profile from public.users where uid = current_uid;
  if not found or profile.is_banned then
    raise exception 'Account is banned or unavailable' using errcode = '42501';
  end if;

  update public.millionaire_sessions
  set status = 'cancelled',
      ended_at = now(),
      updated_at = now()
  where user_id = current_uid
    and status = 'active';

  insert into public.millionaire_sessions (user_id, topic)
  values (current_uid, normalized_topic)
  returning * into new_session;

  for idx in 1..15 loop
    chosen_question_id := null;

    select q.question_id
    into chosen_question_id
    from public.millionaire_question_bank q
    where q.verification_status = 'verified'
      and q.difficulty = idx
      and (normalized_topic = 'mixed' or q.topic = normalized_topic)
      and not (q.question_id = any(chosen_ids))
    order by random()
    limit 1;

    if chosen_question_id is null then
      select q.question_id
      into chosen_question_id
      from public.millionaire_question_bank q
      where q.verification_status = 'verified'
        and q.difficulty between greatest(1, idx - 2) and least(15, idx + 2)
        and not (q.question_id = any(chosen_ids))
      order by random()
      limit 1;
    end if;

    if chosen_question_id is null then
      raise exception 'Question bank khong du cau hoi verified de bat dau session.';
    end if;

    chosen_ids := array_append(chosen_ids, chosen_question_id);

    insert into public.millionaire_session_questions (
      session_id, question_index, question_id, available_choices
    )
    values (
      new_session.session_id, idx, chosen_question_id, array[0, 1, 2, 3]
    );
  end loop;

  return public.millionaire_get_current_session_state(p_session_token);
end;
$$;

create or replace function public.millionaire_answer_current_question(
  p_session_token text,
  p_choice_index integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
  session_record public.millionaire_sessions%rowtype;
  mapping_record public.millionaire_session_questions%rowtype;
  question_record public.millionaire_question_bank%rowtype;
  is_correct boolean;
  next_earned integer;
  next_guaranteed integer;
  payout integer;
  player_before integer;
  player_after integer;
begin
  if p_choice_index not between 0 and 3 then
    raise exception 'Choice index must be between 0 and 3.';
  end if;

  select * into profile from public.users where uid = current_uid;
  if not found or profile.is_banned then
    raise exception 'Account is banned or unavailable' using errcode = '42501';
  end if;

  select * into session_record
  from public.millionaire_sessions s
  where s.user_id = current_uid
    and s.status = 'active'
  order by s.created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'Khong co session active.';
  end if;

  select * into mapping_record
  from public.millionaire_session_questions sq
  where sq.session_id = session_record.session_id
    and sq.question_index = session_record.current_question_index
  for update;

  if not found then
    raise exception 'Khong tim thay cau hoi hien tai.';
  end if;

  if not (p_choice_index = any(mapping_record.available_choices)) then
    raise exception 'Lua chon nay da bi loai bo.';
  end if;

  select * into question_record
  from public.millionaire_question_bank q
  where q.question_id = mapping_record.question_id;

  if not found then
    raise exception 'Question khong ton tai.';
  end if;

  is_correct := question_record.correct_choice = p_choice_index;
  next_earned := public.millionaire_prize_for_index(session_record.current_question_index);
  next_guaranteed := public.millionaire_guaranteed_for_index(session_record.current_question_index);

  insert into public.millionaire_answers (
    session_id, question_index, question_id, selected_choice, correct_choice, is_correct
  )
  values (
    session_record.session_id,
    session_record.current_question_index,
    question_record.question_id,
    p_choice_index,
    question_record.correct_choice,
    is_correct
  );

  if is_correct then
    if session_record.current_question_index >= session_record.max_question_count then
      update public.millionaire_sessions
      set status = 'won',
          earned_points = next_earned,
          guaranteed_points = next_guaranteed,
          ended_at = now(),
          updated_at = now()
      where session_id = session_record.session_id
      returning * into session_record;

      payout := next_earned;
    else
      update public.millionaire_sessions
      set earned_points = next_earned,
          guaranteed_points = next_guaranteed,
          current_question_index = current_question_index + 1,
          updated_at = now()
      where session_id = session_record.session_id
      returning * into session_record;

      payout := 0;
    end if;
  else
    payout := session_record.guaranteed_points;

    update public.millionaire_sessions
    set status = 'lost',
        ended_at = now(),
        updated_at = now()
    where session_id = session_record.session_id
    returning * into session_record;
  end if;

  if payout > 0 then
    select u.points into player_before
    from public.users u
    where u.uid = current_uid
    for update;

    update public.users
    set points = points + payout,
        points_updated_at = now(),
        updated_at = now()
    where uid = current_uid
    returning points into player_after;

    insert into public.millionaire_points_audit (
      session_id, user_id, reason, amount, points_before, points_after
    )
    values (
      session_record.session_id,
      current_uid,
      case when is_correct then 'session_win' else 'guaranteed_payout' end,
      payout,
      player_before,
      player_after
    );
  end if;

  return jsonb_build_object(
    'session_id', session_record.session_id,
    'is_correct', is_correct,
    'selected_choice', p_choice_index,
    'correct_choice', question_record.correct_choice,
    'earned_points', session_record.earned_points,
    'guaranteed_points', session_record.guaranteed_points,
    'game_over', session_record.status <> 'active',
    'status', session_record.status,
    'next_question_index', case when session_record.status = 'active' then session_record.current_question_index else null end
  );
end;
$$;

create or replace function public.millionaire_use_lifeline_5050(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  session_record public.millionaire_sessions%rowtype;
  mapping_record public.millionaire_session_questions%rowtype;
  question_record public.millionaire_question_bank%rowtype;
  wrong_choice smallint;
  new_choices smallint[];
begin
  select * into session_record
  from public.millionaire_sessions s
  where s.user_id = current_uid
    and s.status = 'active'
  order by s.created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'Khong co session active.';
  end if;

  if session_record.lifeline_5050_used then
    raise exception 'Tro giup 50:50 da duoc su dung.';
  end if;

  select * into mapping_record
  from public.millionaire_session_questions sq
  where sq.session_id = session_record.session_id
    and sq.question_index = session_record.current_question_index
  for update;

  select * into question_record
  from public.millionaire_question_bank q
  where q.question_id = mapping_record.question_id;

  select candidate
  into wrong_choice
  from unnest(array[0::smallint, 1::smallint, 2::smallint, 3::smallint]) candidate
  where candidate <> question_record.correct_choice
  order by random()
  limit 1;

  new_choices := array[question_record.correct_choice::smallint, wrong_choice];

  update public.millionaire_session_questions
  set available_choices = (
    select array_agg(choice order by choice)
    from unnest(new_choices) choice
  )
  where session_id = session_record.session_id
    and question_index = session_record.current_question_index;

  update public.millionaire_sessions
  set lifeline_5050_used = true,
      updated_at = now()
  where session_id = session_record.session_id;

  return public.millionaire_get_current_session_state(p_session_token);
end;
$$;

create or replace function public.millionaire_use_lifeline_skip(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  session_record public.millionaire_sessions%rowtype;
begin
  select * into session_record
  from public.millionaire_sessions s
  where s.user_id = current_uid
    and s.status = 'active'
  order by s.created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'Khong co session active.';
  end if;

  if session_record.lifeline_skip_used then
    raise exception 'Tro giup Skip da duoc su dung.';
  end if;

  if session_record.current_question_index >= session_record.max_question_count then
    raise exception 'Khong the skip cau hoi cuoi.';
  end if;

  update public.millionaire_sessions
  set lifeline_skip_used = true,
      current_question_index = current_question_index + 1,
      updated_at = now()
  where session_id = session_record.session_id;

  return public.millionaire_get_current_session_state(p_session_token);
end;
$$;

create or replace function public.millionaire_get_recent_winners(p_limit integer default 20)
returns table (
  session_id uuid,
  user_id uuid,
  display_name text,
  avatar_url text,
  earned_points integer,
  topic text,
  ended_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    s.session_id,
    s.user_id,
    u.display_name,
    u.avatar_url,
    s.earned_points,
    s.topic,
    s.ended_at
  from public.millionaire_sessions s
  join public.users u on u.uid = s.user_id
  where s.status in ('won', 'lost')
    and s.earned_points > 0
    and s.ended_at is not null
  order by s.earned_points desc, s.ended_at desc
  limit greatest(1, least(100, coalesce(p_limit, 20)));
$$;

create or replace function public.millionaire_admin_upsert_ai_question(
  p_session_token text,
  p_payload jsonb
)
returns public.millionaire_question_bank
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
  question_text_value text := trim(coalesce(p_payload->>'question_text', ''));
  options_value text[];
  correct_choice_value integer := coalesce((p_payload->>'correct_choice')::integer, -1);
  difficulty_value integer := coalesce((p_payload->>'difficulty')::integer, 1);
  topic_value text := lower(trim(coalesce(p_payload->>'topic', 'mixed')));
  confidence_value numeric(5,4) := coalesce((p_payload->>'confidence_score')::numeric, 0.8000);
  verification_value text := lower(trim(coalesce(p_payload->>'verification_status', 'verified')));
  result_row public.millionaire_question_bank%rowtype;
begin
  select * into profile from public.users where uid = current_uid;
  if not found or profile.role <> 'admin' then
    raise exception 'Admin role required.' using errcode = '42501';
  end if;

  if question_text_value = '' then
    raise exception 'question_text is required.';
  end if;

  select array_agg(value order by ordinality)
  into options_value
  from jsonb_array_elements_text(coalesce(p_payload->'options', '[]'::jsonb)) with ordinality as t(value, ordinality);

  if options_value is null or array_length(options_value, 1) <> 4 then
    raise exception 'options must contain exactly 4 choices.';
  end if;

  if correct_choice_value not between 0 and 3 then
    raise exception 'correct_choice must be 0..3.';
  end if;

  if difficulty_value not between 1 and 15 then
    raise exception 'difficulty must be 1..15.';
  end if;

  if verification_value not in ('pending', 'verified', 'rejected') then
    raise exception 'verification_status is invalid.';
  end if;

  insert into public.millionaire_question_bank (
    topic,
    difficulty,
    question_text,
    options,
    correct_choice,
    explanation,
    source_provider,
    source_model,
    source_prompt_version,
    confidence_score,
    verification_status,
    citation_urls,
    created_by
  )
  values (
    topic_value,
    difficulty_value,
    question_text_value,
    options_value,
    correct_choice_value,
    nullif(trim(coalesce(p_payload->>'explanation', '')), ''),
    coalesce(nullif(trim(coalesce(p_payload->>'source_provider', '')), ''), 'ai'),
    nullif(trim(coalesce(p_payload->>'source_model', '')), ''),
    nullif(trim(coalesce(p_payload->>'source_prompt_version', '')), ''),
    least(1, greatest(0, confidence_value)),
    verification_value,
    coalesce(
      (
        select array_agg(value)
        from jsonb_array_elements_text(coalesce(p_payload->'citation_urls', '[]'::jsonb)) as t(value)
      ),
      '{}'
    ),
    current_uid
  )
  returning * into result_row;

  return result_row;
end;
$$;

create or replace function public.millionaire_admin_list_questions(
  p_session_token text,
  p_search text default '',
  p_topic text default '',
  p_limit integer default 80
)
returns table (
  question_id uuid,
  topic text,
  difficulty smallint,
  question_text text,
  options text[],
  correct_choice smallint,
  confidence_score numeric(5,4),
  verification_status text,
  source_provider text,
  source_model text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
begin
  select * into profile from public.users where uid = current_uid;
  if not found or profile.role <> 'admin' then
    raise exception 'Admin role required.' using errcode = '42501';
  end if;

  return query
  select
    q.question_id,
    q.topic,
    q.difficulty,
    q.question_text,
    q.options,
    q.correct_choice,
    q.confidence_score,
    q.verification_status,
    q.source_provider,
    q.source_model,
    q.created_at
  from public.millionaire_question_bank q
  where (trim(coalesce(p_search, '')) = '' or q.question_text ilike '%' || trim(p_search) || '%')
    and (trim(coalesce(p_topic, '')) = '' or q.topic = lower(trim(p_topic)))
  order by q.created_at desc
  limit greatest(1, least(200, coalesce(p_limit, 80)));
end;
$$;

create or replace function public.millionaire_admin_set_question_verification(
  p_session_token text,
  p_question_id uuid,
  p_status text
)
returns public.millionaire_question_bank
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
  next_status text := lower(trim(coalesce(p_status, '')));
  result_row public.millionaire_question_bank%rowtype;
begin
  select * into profile from public.users where uid = current_uid;
  if not found or profile.role <> 'admin' then
    raise exception 'Admin role required.' using errcode = '42501';
  end if;

  if next_status not in ('pending', 'verified', 'rejected') then
    raise exception 'Invalid verification status.';
  end if;

  update public.millionaire_question_bank
  set verification_status = next_status,
      updated_at = now()
  where question_id = p_question_id
  returning * into result_row;

  if result_row.question_id is null then
    raise exception 'Question not found.';
  end if;

  return result_row;
end;
$$;

create or replace function public.millionaire_admin_list_sessions(
  p_session_token text,
  p_limit integer default 60
)
returns table (
  session_id uuid,
  user_id uuid,
  display_name text,
  topic text,
  status text,
  current_question_index integer,
  earned_points integer,
  guaranteed_points integer,
  started_at timestamptz,
  ended_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
begin
  select * into profile from public.users where uid = current_uid;
  if not found or profile.role <> 'admin' then
    raise exception 'Admin role required.' using errcode = '42501';
  end if;

  return query
  select
    s.session_id,
    s.user_id,
    u.display_name,
    s.topic,
    s.status,
    s.current_question_index,
    s.earned_points,
    s.guaranteed_points,
    s.started_at,
    s.ended_at
  from public.millionaire_sessions s
  join public.users u on u.uid = s.user_id
  order by s.created_at desc
  limit greatest(1, least(200, coalesce(p_limit, 60)));
end;
$$;

create or replace function public.millionaire_admin_get_overview(
  p_session_token text
)
returns table (
  total_questions integer,
  verified_questions integer,
  pending_questions integer,
  rejected_questions integer,
  active_sessions integer,
  total_sessions integer,
  payout_24h bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.get_session_user_id(p_session_token);
  profile public.users%rowtype;
begin
  select * into profile from public.users where uid = current_uid;
  if not found or profile.role <> 'admin' then
    raise exception 'Admin role required.' using errcode = '42501';
  end if;

  return query
  select
    (select count(*)::integer from public.millionaire_question_bank),
    (select count(*)::integer from public.millionaire_question_bank where verification_status = 'verified'),
    (select count(*)::integer from public.millionaire_question_bank where verification_status = 'pending'),
    (select count(*)::integer from public.millionaire_question_bank where verification_status = 'rejected'),
    (select count(*)::integer from public.millionaire_sessions where status = 'active'),
    (select count(*)::integer from public.millionaire_sessions),
    (select coalesce(sum(amount), 0)::bigint from public.millionaire_points_audit where created_at >= now() - interval '24 hours');
end;
$$;

insert into public.millionaire_question_bank (
  topic, difficulty, question_text, options, correct_choice, explanation, source_provider, source_model, source_prompt_version, confidence_score, verification_status
)
select *
from (
  values
    ('science', 1, 'Hanh tinh nao duoc goi la hanh tinh do?', array['Trai Dat', 'Sao Hoa', 'Sao Moc', 'Sao Kim'], 1, 'Sao Hoa co mau do do oxit sat.', 'seed', 'manual', 'v1', 0.99, 'verified'),
    ('geography', 2, 'Thu do cua Nhat Ban la gi?', array['Osaka', 'Kyoto', 'Tokyo', 'Sapporo'], 2, 'Tokyo la thu do hien tai.', 'seed', 'manual', 'v1', 0.99, 'verified'),
    ('history', 3, 'Nguoi tim ra chau My nam 1492 la ai?', array['Magellan', 'Columbus', 'Marco Polo', 'Vasco da Gama'], 1, 'Christopher Columbus thuc hien hai trinh nam 1492.', 'seed', 'manual', 'v1', 0.95, 'verified'),
    ('technology', 4, 'HTML viet tat cua cum tu nao?', array['HyperText Markup Language', 'HighText Machine Language', 'Hyperlink and Text Markup Language', 'Home Tool Markup Language'], 0, 'HTML = HyperText Markup Language.', 'seed', 'manual', 'v1', 0.99, 'verified'),
    ('sports', 5, 'Mon the thao nao su dung qua bong hinh bau duc?', array['Bong da', 'Bong chuyen', 'Bong bau duc', 'Bong ro'], 2, 'American football su dung bong hinh bau duc.', 'seed', 'manual', 'v1', 0.98, 'verified'),
    ('science', 6, 'Nguon nang luong chinh cua Mat Troi la qua trinh nao?', array['Phan hach', 'Nong chay hat nhan', 'Dot than', 'Phan ra alpha'], 1, 'Mat Troi phat nang luong nhờ fusion.', 'seed', 'manual', 'v1', 0.96, 'verified'),
    ('geography', 7, 'Song dai nhat the gioi thuong duoc ghi nhan la?', array['Amazon', 'Nile', 'Mekong', 'Danube'], 1, 'Theo nhieu tai lieu pho bien la Nile.', 'seed', 'manual', 'v1', 0.90, 'verified'),
    ('history', 8, 'Nam nao Viet Nam tuyen bo doc lap voi Tuyen ngon doc lap?', array['1945', '1954', '1975', '1930'], 0, 'Ngay 2/9/1945.', 'seed', 'manual', 'v1', 0.99, 'verified'),
    ('technology', 9, 'Giao thuc nao duoc dung de truyen trang web bao mat?', array['HTTP', 'FTP', 'HTTPS', 'SMTP'], 2, 'HTTPS la HTTP qua TLS.', 'seed', 'manual', 'v1', 0.99, 'verified'),
    ('sports', 10, 'Olympic hien dai dau tien dien ra nam nao?', array['1896', '1900', '1912', '1920'], 0, 'The van hoi hien dai bat dau nam 1896 tai Athens.', 'seed', 'manual', 'v1', 0.95, 'verified'),
    ('science', 11, 'Don vi do cuong do dong dien trong he SI la?', array['Volt', 'Ampere', 'Ohm', 'Watt'], 1, 'Cuong do dong dien do bang ampere.', 'seed', 'manual', 'v1', 0.99, 'verified'),
    ('geography', 12, 'Nui cao nhat the gioi la?', array['K2', 'Kangchenjunga', 'Everest', 'Lhotse'], 2, 'Everest cao nhat theo do cao so voi muc nuoc bien.', 'seed', 'manual', 'v1', 0.99, 'verified'),
    ('history', 13, 'Chien tranh the gioi thu hai ket thuc nam nao?', array['1942', '1945', '1948', '1950'], 1, 'WWII ket thuc nam 1945.', 'seed', 'manual', 'v1', 0.99, 'verified'),
    ('technology', 14, 'Cau truc du lieu nao hoat dong theo nguyen ly LIFO?', array['Queue', 'Stack', 'Tree', 'Graph'], 1, 'Stack theo Last In First Out.', 'seed', 'manual', 'v1', 0.98, 'verified'),
    ('sports', 15, 'Trong co vua, quan nao di theo duong cheo bat ky o khoang cach nao?', array['Xe', 'Ma', 'Tuong', 'Tot'], 2, 'Tuong di duong cheo khong gioi han o.', 'seed', 'manual', 'v1', 0.97, 'verified')
) as seed(
  topic, difficulty, question_text, options, correct_choice, explanation, source_provider, source_model, source_prompt_version, confidence_score, verification_status
)
where not exists (
  select 1 from public.millionaire_question_bank q where q.question_text = seed.question_text
);

revoke all on public.millionaire_question_bank from anon, authenticated;
revoke all on public.millionaire_sessions from anon, authenticated;
revoke all on public.millionaire_session_questions from anon, authenticated;
revoke all on public.millionaire_answers from anon, authenticated;
revoke all on public.millionaire_points_audit from anon, authenticated;

revoke all on function public.millionaire_prize_for_index(integer) from public, anon, authenticated;
revoke all on function public.millionaire_guaranteed_for_index(integer) from public, anon, authenticated;
revoke all on function public.millionaire_get_current_session_state(text) from public, anon, authenticated;
revoke all on function public.millionaire_start_session(text, text) from public, anon, authenticated;
revoke all on function public.millionaire_answer_current_question(text, integer) from public, anon, authenticated;
revoke all on function public.millionaire_use_lifeline_5050(text) from public, anon, authenticated;
revoke all on function public.millionaire_use_lifeline_skip(text) from public, anon, authenticated;
revoke all on function public.millionaire_get_recent_winners(integer) from public, anon, authenticated;
revoke all on function public.millionaire_admin_upsert_ai_question(text, jsonb) from public, anon, authenticated;
revoke all on function public.millionaire_admin_list_questions(text, text, text, integer) from public, anon, authenticated;
revoke all on function public.millionaire_admin_set_question_verification(text, uuid, text) from public, anon, authenticated;
revoke all on function public.millionaire_admin_list_sessions(text, integer) from public, anon, authenticated;
revoke all on function public.millionaire_admin_get_overview(text) from public, anon, authenticated;

grant execute on function public.millionaire_get_current_session_state(text) to anon, authenticated;
grant execute on function public.millionaire_start_session(text, text) to anon, authenticated;
grant execute on function public.millionaire_answer_current_question(text, integer) to anon, authenticated;
grant execute on function public.millionaire_use_lifeline_5050(text) to anon, authenticated;
grant execute on function public.millionaire_use_lifeline_skip(text) to anon, authenticated;
grant execute on function public.millionaire_get_recent_winners(integer) to anon, authenticated;
grant execute on function public.millionaire_admin_upsert_ai_question(text, jsonb) to anon, authenticated;
grant execute on function public.millionaire_admin_list_questions(text, text, text, integer) to anon, authenticated;
grant execute on function public.millionaire_admin_set_question_verification(text, uuid, text) to anon, authenticated;
grant execute on function public.millionaire_admin_list_sessions(text, integer) to anon, authenticated;
grant execute on function public.millionaire_admin_get_overview(text) to anon, authenticated;

do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'millionaire_sessions'
  ) is false then
    alter publication supabase_realtime add table public.millionaire_sessions;
  end if;

  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'millionaire_answers'
  ) is false then
    alter publication supabase_realtime add table public.millionaire_answers;
  end if;
end;
$$;

notify pgrst, 'reload schema';

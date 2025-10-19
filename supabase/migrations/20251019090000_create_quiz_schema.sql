-- migration: create quiz schema (quizzes, quiz_questions, answers)
-- purpose: initial schema for quizcards app including tables, constraints, indexes, rls and policies
-- affected objects:
--   tables: public.quizzes, public.quiz_questions, public.answers
--   functions: public.set_updated_at()
--   triggers: quizzes_set_updated_at, quiz_questions_set_updated_at
--   indexes: idx_quizzes_user_id, idx_quiz_questions_quiz_id, idx_answers_question_id, unique_correct_answer
--   rls: enabled on all new tables with granular policies for roles anon and authenticated
-- notes:
-- - user identities are managed by supabase auth (auth.users). we reference auth.users(id) for ownership.
-- - all sql is lowercase by convention.
-- - destructive commands are not used in this migration. future destructive changes must be carefully reviewed.

-- ensure required extensions exist (for uuid generation)
create extension if not exists pgcrypto;

-- helper function to maintain updated_at timestamps
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- table: public.quizzes
-- stores quiz metadata and ownership. each row belongs to a single user (auth.users.id).
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_url text null,
  quizlet_set_id varchar(255) null,
  title varchar(255) not null,
  status varchar(50) not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- trigger to auto-update updated_at on quizzes
drop trigger if exists quizzes_set_updated_at on public.quizzes;
create trigger quizzes_set_updated_at
before update on public.quizzes
for each row
execute function public.set_updated_at();

-- recommended index to accelerate lookups by owner
create index if not exists idx_quizzes_user_id on public.quizzes(user_id);

-- table: public.quiz_questions
-- stores questions belonging to a quiz; metadata holds ai generation parameters.
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_text text not null check (char_length(question_text) <= 2048),
  metadata jsonb not null check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- trigger to auto-update updated_at on quiz_questions
drop trigger if exists quiz_questions_set_updated_at on public.quiz_questions;
create trigger quiz_questions_set_updated_at
before update on public.quiz_questions
for each row
execute function public.set_updated_at();

-- recommended index to accelerate lookups by quiz
create index if not exists idx_quiz_questions_quiz_id on public.quiz_questions(quiz_id);

-- table: public.answers
-- stores answers for a question; exactly one should be correct via a partial unique index.
create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  answer_text text not null check (char_length(answer_text) <= 512),
  is_correct boolean not null default false
);

-- recommended index to accelerate lookups by question
create index if not exists idx_answers_question_id on public.answers(question_id);

-- enforce that there is at most one correct answer per question.
-- note: this guarantees uniqueness for is_correct=true; application logic should ensure exactly four answers exist.
create unique index if not exists unique_correct_answer on public.answers(question_id) where is_correct = true;

-- row level security must be enabled on all user-data tables.
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.answers enable row level security;

-- rls policies
-- design goals:
-- - deny by default; anon users have no access.
-- - authenticated users may access only their own data determined by quizzes.user_id = auth.uid().
-- - for child tables, ownership is derived via the quizzes table through a join.

-- quizzes policies
-- anon: explicitly deny all operations for clarity (using false)
drop policy if exists quizzes_anon_select on public.quizzes;
create policy quizzes_anon_select on public.quizzes
  for select to anon
  using (false);

drop policy if exists quizzes_anon_insert on public.quizzes;
create policy quizzes_anon_insert on public.quizzes
  for insert to anon
  with check (false);

drop policy if exists quizzes_anon_update on public.quizzes;
create policy quizzes_anon_update on public.quizzes
  for update to anon
  using (false)
  with check (false);

drop policy if exists quizzes_anon_delete on public.quizzes;
create policy quizzes_anon_delete on public.quizzes
  for delete to anon
  using (false);

-- authenticated: allow access to own quizzes only
drop policy if exists quizzes_auth_select on public.quizzes;
create policy quizzes_auth_select on public.quizzes
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists quizzes_auth_insert on public.quizzes;
create policy quizzes_auth_insert on public.quizzes
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists quizzes_auth_update on public.quizzes;
create policy quizzes_auth_update on public.quizzes
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists quizzes_auth_delete on public.quizzes;
create policy quizzes_auth_delete on public.quizzes
  for delete to authenticated
  using (user_id = auth.uid());

-- quiz_questions policies
-- anon: deny all
drop policy if exists quiz_questions_anon_select on public.quiz_questions;
create policy quiz_questions_anon_select on public.quiz_questions
  for select to anon
  using (false);

drop policy if exists quiz_questions_anon_insert on public.quiz_questions;
create policy quiz_questions_anon_insert on public.quiz_questions
  for insert to anon
  with check (false);

drop policy if exists quiz_questions_anon_update on public.quiz_questions;
create policy quiz_questions_anon_update on public.quiz_questions
  for update to anon
  using (false)
  with check (false);

drop policy if exists quiz_questions_anon_delete on public.quiz_questions;
create policy quiz_questions_anon_delete on public.quiz_questions
  for delete to anon
  using (false);

-- authenticated: access only to questions whose parent quiz is owned by the user
drop policy if exists quiz_questions_auth_select on public.quiz_questions;
create policy quiz_questions_auth_select on public.quiz_questions
  for select to authenticated
  using (
    exists (
      select 1
      from public.quizzes q
      where q.id = quiz_questions.quiz_id
        and q.user_id = auth.uid()
    )
  );

drop policy if exists quiz_questions_auth_insert on public.quiz_questions;
create policy quiz_questions_auth_insert on public.quiz_questions
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.quizzes q
      where q.id = quiz_id
        and q.user_id = auth.uid()
    )
  );

drop policy if exists quiz_questions_auth_update on public.quiz_questions;
create policy quiz_questions_auth_update on public.quiz_questions
  for update to authenticated
  using (
    exists (
      select 1
      from public.quizzes q
      where q.id = quiz_questions.quiz_id
        and q.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.quizzes q
      where q.id = quiz_questions.quiz_id
        and q.user_id = auth.uid()
    )
  );

drop policy if exists quiz_questions_auth_delete on public.quiz_questions;
create policy quiz_questions_auth_delete on public.quiz_questions
  for delete to authenticated
  using (
    exists (
      select 1
      from public.quizzes q
      where q.id = quiz_questions.quiz_id
        and q.user_id = auth.uid()
    )
  );

-- answers policies
-- anon: deny all
drop policy if exists answers_anon_select on public.answers;
create policy answers_anon_select on public.answers
  for select to anon
  using (false);

drop policy if exists answers_anon_insert on public.answers;
create policy answers_anon_insert on public.answers
  for insert to anon
  with check (false);

drop policy if exists answers_anon_update on public.answers;
create policy answers_anon_update on public.answers
  for update to anon
  using (false)
  with check (false);

drop policy if exists answers_anon_delete on public.answers;
create policy answers_anon_delete on public.answers
  for delete to anon
  using (false);

-- authenticated: access only to answers whose question's quiz is owned by the user
drop policy if exists answers_auth_select on public.answers;
create policy answers_auth_select on public.answers
  for select to authenticated
  using (
    exists (
      select 1
      from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      where qq.id = answers.question_id
        and q.user_id = auth.uid()
    )
  );

drop policy if exists answers_auth_insert on public.answers;
create policy answers_auth_insert on public.answers
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      where qq.id = question_id
        and q.user_id = auth.uid()
    )
  );

drop policy if exists answers_auth_update on public.answers;
create policy answers_auth_update on public.answers
  for update to authenticated
  using (
    exists (
      select 1
      from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      where qq.id = answers.question_id
        and q.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      where qq.id = answers.question_id
        and q.user_id = auth.uid()
    )
  );

drop policy if exists answers_auth_delete on public.answers;
create policy answers_auth_delete on public.answers
  for delete to authenticated
  using (
    exists (
      select 1
      from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      where qq.id = answers.question_id
        and q.user_id = auth.uid()
    )
  );

-- end of migration


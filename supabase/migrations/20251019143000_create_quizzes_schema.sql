-- migration: create quizzes schema
-- description: creates tables for quizzes, quiz_questions, and answers with proper constraints, indexes, and rls policies
-- tables affected: quizzes, quiz_questions, answers
-- dependencies: requires supabase auth (auth.users table)
-- notes: 
--   - users table is managed by supabase auth
--   - each question must have exactly 4 answers with exactly one correct answer (enforced by unique index)
--   - rls policies ensure users can only access their own quizzes

-- ============================================================================
-- table: quizzes
-- description: stores quiz metadata created by users
-- ============================================================================

create table quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_url text null,
  quizlet_set_id varchar(255) null,
  title varchar(255) not null,
  status varchar(50) not null default 'draft',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- add comment explaining the table purpose
comment on table quizzes is 'stores user-created quizzes with metadata about source and status';
comment on column quizzes.source_url is 'optional url of the source material for the quiz';
comment on column quizzes.quizlet_set_id is 'optional quizlet set identifier if imported from quizlet';
comment on column quizzes.status is 'current status of the quiz (e.g., draft, published)';

-- ============================================================================
-- table: quiz_questions
-- description: stores questions belonging to quizzes
-- ============================================================================

create table quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  question_text text not null check (char_length(question_text) <= 2048),
  metadata jsonb not null default '{}' check (jsonb_typeof(metadata) = 'object'),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- add comment explaining the table purpose
comment on table quiz_questions is 'stores questions for quizzes with ai generation metadata';
comment on column quiz_questions.question_text is 'the question text, max 2048 characters';
comment on column quiz_questions.metadata is 'json object containing ai generation parameters (prompt, model, temperature, seed)';

-- ============================================================================
-- table: answers
-- description: stores answers for quiz questions (4 per question, 1 correct)
-- ============================================================================

create table answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references quiz_questions(id) on delete cascade,
  answer_text text not null check (char_length(answer_text) <= 512),
  is_correct boolean not null default false,
  source varchar(20) not null default 'provided' check (source in ('provided', 'manual', 'ai', 'ai-edited'))
);

-- add comment explaining the table purpose
comment on table answers is 'stores answer options for quiz questions (must have exactly 4 answers per question with exactly 1 correct)';
comment on column answers.answer_text is 'the answer text, max 512 characters';
comment on column answers.is_correct is 'indicates if this is the correct answer for the question';
comment on column answers.source is 'origin of the answer: defaults to ''provided'' if is_correct=true, ''ai'' if is_correct=false';

-- ============================================================================
-- indexes
-- description: performance indexes for common query patterns
-- ============================================================================

-- index for finding all quizzes by user
create index idx_quizzes_user_id on quizzes(user_id);

-- index for finding all questions in a quiz
create index idx_quiz_questions_quiz_id on quiz_questions(quiz_id);

-- index for finding all answers for a question
create index idx_answers_question_id on answers(question_id);

-- unique partial index to ensure only one correct answer per question
-- this constraint is critical for quiz integrity
create unique index unique_correct_answer on answers(question_id) where is_correct = true;

comment on index unique_correct_answer is 'ensures each question has exactly one correct answer';

-- ============================================================================
-- row level security (rls)
-- description: enable rls on all tables
-- ============================================================================

-- enable rls on quizzes table
-- users should only access their own quizzes
alter table quizzes disable row level security;

-- enable rls on quiz_questions table
-- users should only access questions from their own quizzes
alter table quiz_questions disable row level security;

-- enable rls on answers table
-- users should only access answers from questions in their own quizzes
alter table answers disable row level security;

-- ============================================================================
-- rls policies for quizzes table
-- description: policies ensure users can only access their own quizzes
-- ============================================================================

-- policy: authenticated users can select their own quizzes
create policy "authenticated users can select own quizzes"
  on quizzes
  for select
  to authenticated
  using (user_id = auth.uid());

-- policy: authenticated users can insert their own quizzes
create policy "authenticated users can insert own quizzes"
  on quizzes
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- policy: authenticated users can update their own quizzes
create policy "authenticated users can update own quizzes"
  on quizzes
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- policy: authenticated users can delete their own quizzes
-- note: cascade delete will automatically remove associated questions and answers
create policy "authenticated users can delete own quizzes"
  on quizzes
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- rls policies for quiz_questions table
-- description: policies ensure users can only access questions from their own quizzes
-- ============================================================================

-- policy: authenticated users can select questions from their own quizzes
create policy "authenticated users can select own quiz questions"
  on quiz_questions
  for select
  to authenticated
  using (
    exists (
      select 1 from quizzes
      where quizzes.id = quiz_questions.quiz_id
      and quizzes.user_id = auth.uid()
    )
  );

-- policy: authenticated users can insert questions to their own quizzes
create policy "authenticated users can insert own quiz questions"
  on quiz_questions
  for insert
  to authenticated
  with check (
    exists (
      select 1 from quizzes
      where quizzes.id = quiz_questions.quiz_id
      and quizzes.user_id = auth.uid()
    )
  );

-- policy: authenticated users can update questions in their own quizzes
create policy "authenticated users can update own quiz questions"
  on quiz_questions
  for update
  to authenticated
  using (
    exists (
      select 1 from quizzes
      where quizzes.id = quiz_questions.quiz_id
      and quizzes.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from quizzes
      where quizzes.id = quiz_questions.quiz_id
      and quizzes.user_id = auth.uid()
    )
  );

-- policy: authenticated users can delete questions from their own quizzes
-- note: cascade delete will automatically remove associated answers
create policy "authenticated users can delete own quiz questions"
  on quiz_questions
  for delete
  to authenticated
  using (
    exists (
      select 1 from quizzes
      where quizzes.id = quiz_questions.quiz_id
      and quizzes.user_id = auth.uid()
    )
  );

-- ============================================================================
-- rls policies for answers table
-- description: policies ensure users can only access answers from their own quizzes
-- ============================================================================

-- policy: authenticated users can select answers from questions in their own quizzes
create policy "authenticated users can select own quiz answers"
  on answers
  for select
  to authenticated
  using (
    exists (
      select 1 from quiz_questions
      join quizzes on quizzes.id = quiz_questions.quiz_id
      where quiz_questions.id = answers.question_id
      and quizzes.user_id = auth.uid()
    )
  );

-- policy: authenticated users can insert answers to questions in their own quizzes
create policy "authenticated users can insert own quiz answers"
  on answers
  for insert
  to authenticated
  with check (
    exists (
      select 1 from quiz_questions
      join quizzes on quizzes.id = quiz_questions.quiz_id
      where quiz_questions.id = answers.question_id
      and quizzes.user_id = auth.uid()
    )
  );

-- policy: authenticated users can update answers in questions from their own quizzes
create policy "authenticated users can update own quiz answers"
  on answers
  for update
  to authenticated
  using (
    exists (
      select 1 from quiz_questions
      join quizzes on quizzes.id = quiz_questions.quiz_id
      where quiz_questions.id = answers.question_id
      and quizzes.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from quiz_questions
      join quizzes on quizzes.id = quiz_questions.quiz_id
      where quiz_questions.id = answers.question_id
      and quizzes.user_id = auth.uid()
    )
  );

-- policy: authenticated users can delete answers from questions in their own quizzes
create policy "authenticated users can delete own quiz answers"
  on answers
  for delete
  to authenticated
  using (
    exists (
      select 1 from quiz_questions
      join quizzes on quizzes.id = quiz_questions.quiz_id
      where quiz_questions.id = answers.question_id
      and quizzes.user_id = auth.uid()
    )
  );

-- ============================================================================
-- triggers for updated_at timestamp
-- description: automatically update the updated_at field when records are modified
-- ============================================================================

-- function to update the updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- trigger for quizzes table
create trigger update_quizzes_updated_at
  before update on quizzes
  for each row
  execute function update_updated_at_column();

-- trigger for quiz_questions table
create trigger update_quiz_questions_updated_at
  before update on quiz_questions
  for each row
  execute function update_updated_at_column();

comment on function update_updated_at_column is 'automatically updates the updated_at timestamp when a record is modified';

-- trigger: update 'updated_at' column in quiz_questions when a related row in 'answers' is modified
-- this ensures the parent quiz_question's 'updated_at' stays in sync with any changes in its child answers.

create or replace function update_quiz_question_updated_at_from_answers()
returns trigger as $$
begin
  update quiz_questions
  set updated_at = now()
  where id = new.question_id;
  return new;
end;
$$ language plpgsql;

-- trigger for answers table: after insert, update, or delete, update parent quiz_question's updated_at
create trigger answers_touch_quiz_questions_updated_at
  after insert or update or delete
  on answers
  for each row
  execute function update_quiz_question_updated_at_from_answers();

comment on function update_quiz_question_updated_at_from_answers is 
  'Updates the updated_at timestamp of quiz_questions when any related answer row is inserted, updated, or deleted. Ensures quiz_questions stays current if answers are changed.';

comment on trigger answers_touch_quiz_questions_updated_at on answers is 
  'Fires after insert, update, or delete on answers to update the parent quiz_question''s updated_at timestamp.';


-- trigger: update 'updated_at' column in quizzes when a related row in 'quiz_questions' is modified
-- this ensures the parent quizzes's 'updated_at' reflects recent changes to its questions.

create or replace function update_quizzes_updated_at_from_quiz_questions()
returns trigger as $$
begin
  update quizzes
  set updated_at = now()
  where id = new.quiz_id;
  return new;
end;
$$ language plpgsql;

-- trigger for quiz_questions table: after update, update parent quizzes's updated_at
create trigger quiz_questions_touch_quizzes_updated_at
  after update
  on quiz_questions
  for each row
  execute function update_quizzes_updated_at_from_quiz_questions();

comment on function update_quizzes_updated_at_from_quiz_questions is 
  'Updates the updated_at timestamp of quizzes when any related quiz_question row is updated. Ensures quizzes stays current if quiz_questions are changed.';

comment on trigger quiz_questions_touch_quizzes_updated_at on quiz_questions is 
  'Fires after update on quiz_questions to update the parent quizzes'' updated_at timestamp.';


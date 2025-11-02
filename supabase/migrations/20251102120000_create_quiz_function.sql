-- supabase/migrations/20251102120000_create_quiz_function.sql

-- Drop the function if it already exists to ensure a clean slate
DROP FUNCTION IF EXISTS create_quiz_with_questions_and_answers;
-- Drop the custom type if it exists
DROP TYPE IF EXISTS question_with_answers;

-- Create a custom type for the question and its answers to be passed as an array
CREATE TYPE question_with_answers AS (
  question_text TEXT,
  metadata JSONB,
  answers JSONB
);

-- Create a custom type for the quiz summary return value
DROP TYPE IF EXISTS quiz_summary CASCADE;
CREATE TYPE quiz_summary AS (
  id UUID,
  title VARCHAR(255),
  status quiz_status,
  source_url TEXT,
  quizlet_set_id VARCHAR(255),
  question_count BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Define the function to create a quiz with its questions and answers in a single transaction
CREATE OR REPLACE FUNCTION create_quiz_with_questions_and_answers(
  quiz_title VARCHAR(255),
  quiz_status quiz_status,
  quiz_source_url TEXT,
  quiz_quizlet_set_id VARCHAR(255),
  quiz_user_id UUID,
  questions question_with_answers[]
)
RETURNS quiz_summary AS $$
DECLARE
  new_quiz_id UUID;
  question_data question_with_answers;
  new_question_id UUID;
  answer_data JSONB;
  result quiz_summary;
BEGIN
  -- Insert the new quiz and get its ID
  INSERT INTO quizzes (title, status, source_url, quizlet_set_id, user_id)
  VALUES (quiz_title, quiz_status, quiz_source_url, quiz_quizlet_set_id, quiz_user_id)
  RETURNING quizzes.id INTO new_quiz_id;

  -- Loop through each question provided
  FOREACH question_data IN ARRAY questions
  LOOP
    -- Insert the question and get its ID
    INSERT INTO quiz_questions (quiz_id, question_text, metadata)
    VALUES (new_quiz_id, question_data.question_text, question_data.metadata)
    RETURNING quiz_questions.id INTO new_question_id;

    -- Loop through each answer for the current question using jsonb_array_elements
    FOR answer_data IN SELECT * FROM jsonb_array_elements(question_data.answers)
    LOOP
      -- Insert the answer
      INSERT INTO answers (question_id, answer_text, is_correct, source)
      VALUES (
        new_question_id,
        answer_data->>'answer_text',
        (answer_data->>'is_correct')::BOOLEAN,
        (answer_data->>'source')::answer_source
      );
    END LOOP;
  END LOOP;

  -- Build the result record
    SELECT
      q.id,
      q.title,
      q.status,
      q.source_url,
      q.quizlet_set_id,
      (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS question_count,
      q.created_at,
      q.updated_at
  INTO result
    FROM quizzes q
    WHERE q.id = new_quiz_id;

  RETURN result;

END;
$$ LANGUAGE plpgsql;


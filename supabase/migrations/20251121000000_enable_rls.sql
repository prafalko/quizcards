-- Migration: Enable Row Level Security
-- Description: Enables RLS on quizzes, quiz_questions, and answers tables
-- This was disabled in the initial migration for early stage development of the application
-- Date: 2025-11-21

-- Enable RLS on quizzes table
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on quiz_questions table
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on answers table
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Add comment explaining the change
COMMENT ON TABLE quizzes IS 'Stores user-created quizzes with metadata about source and status. RLS enabled to ensure users can only access their own quizzes.';
COMMENT ON TABLE quiz_questions IS 'Stores questions for quizzes with AI generation metadata. RLS enabled to ensure users can only access questions from their own quizzes.';
COMMENT ON TABLE answers IS 'Stores answer options for quiz questions. RLS enabled to ensure users can only access answers from their own quizzes.';


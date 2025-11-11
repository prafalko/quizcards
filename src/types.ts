import type { Tables } from "./db/database.types";

// ============================================================================
// Base Entity Types (derived from database)
// ============================================================================

/**
 * Quiz entity from database
 */
export type Quiz = Tables<"quizzes">;

/**
 * Question entity from database
 */
export type Question = Tables<"quiz_questions">;

/**
 * Answer entity from database
 */
export type Answer = Tables<"answers">;

// ============================================================================
// DTO Types for API Responses
// ============================================================================

/**
 * Answer DTO - represents an answer in API responses
 * Omits question_id as it's implied by the parent question context
 */
export type AnswerDTO = Omit<Answer, "question_id">;

/**
 * Question detail DTO - represents a question with all its answers
 * Omits quiz_id as it's implied by the parent quiz context
 * Adds answers array for nested data
 */
export type QuestionDetailDTO = Omit<Question, "quiz_id"> & {
  answers: AnswerDTO[];
};

/**
 * Quiz list item DTO - represents a quiz in list views
 * Omits user_id (implied by authentication)
 * Adds question_count (computed field from database)
 */
export type QuizListItemDTO = Omit<Quiz, "user_id"> & {
  question_count: number;
};

/**
 * Quiz detail DTO - represents a complete quiz with all questions and answers
 * Omits user_id (implied by authentication)
 * Adds questions array with nested answers
 */
export type QuizDetailDTO = Omit<Quiz, "user_id"> & {
  questions: QuestionDetailDTO[];
};

/**
 * Quiz summary DTO - represents a quiz after creation or update
 * Omits user_id (implied by authentication)
 * Adds question_count for summary information
 */
export type QuizSummaryDTO = Omit<Quiz, "user_id"> & {
  question_count: number;
};

/**
 * Quizzes list response - returns array of quiz items
 */
export type QuizzesListDTO = QuizListItemDTO[];

// ============================================================================
// Command Models for API Requests
// ============================================================================

/**
 * Create quiz command - request to generate a quiz from Quizlet URL
 */
export interface CreateQuizCommand {
  source_url: string;
  title?: string; // Optional, defaults to Quizlet set title
}

/**
 * Update quiz command - request to update quiz properties
 */
export interface UpdateQuizCommand {
  title?: string;
  status?: quiz_status;
}

/**
 * Update question command - request to update question text
 * Only question text can be updated
 */
export interface UpdateQuestionCommand {
  question_text: string;
}

/**
 * Regenerate answers command - request to regenerate incorrect answers using AI
 */
export interface RegenerateAnswersCommand {
  temperature?: number; // Default: 0.7
  seed?: number; // Optional, for reproducibility
}

/**
 * Update answer command - request to update an answer text
 * Only answer text can be updated
 */
export interface UpdateAnswerCommand {
  answer_text: string;
}

// ============================================================================
// Error Response Types
// ============================================================================

/**
 * Standard error response format for all API endpoints
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Common error codes used across the API
 */
export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "QUIZLET_PRIVATE"
  | "QUIZLET_NOT_FOUND"
  | "QUIZLET_EMPTY"
  | "AI_GENERATION_FAILED"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR"
  | "RATE_LIMIT_EXCEEDED";

// ============================================================================
// Query Parameter Types
// ============================================================================

export type quiz_status = "draft" | "published";
/**
 * Query parameters for GET /api/quizzes
 */
export interface QuizzesListQueryParams {
  status?: quiz_status; // Filter by status ('draft' | 'published')
}

// ============================================================================
// Metadata Types
// ============================================================================

/**
 * AI generation metadata stored in question.metadata field
 * Tracks how the question's incorrect answers were generated
 */
export interface QuestionMetadata {
  model: string; // e.g., "gemini-pro"
  temperature?: number;
  seed?: number;
  prompt: string; // The prompt used to generate incorrect answers
  regenerated_at?: string; // ISO timestamp of last regeneration
}

// ============================================================================
// ViewModel Types for Quiz Play Interface
// ============================================================================

/**
 * Answer ViewModel - represents a single answer in the quiz play UI
 * Same as AnswerDTO but typed for clarity in UI context
 */
export type QuizAnswerViewModel = AnswerDTO;

/**
 * Question ViewModel - represents a question with randomly shuffled answers
 * Omits quiz_id as it's implied by the current quiz context
 */
export type QuizQuestionViewModel = Omit<QuestionDetailDTO, "quiz_id"> & {
  answers: QuizAnswerViewModel[]; // Answers in random order for quiz play
};

/**
 * User Answer - stores information about an answer selected by the user
 */
export interface UserAnswer {
  questionId: string;
  answerId: string;
}

// ============================================================================
// External Service Types (Quizlet, AI)
// ============================================================================

/**
 * Quizlet flashcard - represents a single term/definition pair from Quizlet
 */
export interface QuizletFlashcard {
  term: string;
  definition: string;
}

/**
 * Quizlet set - represents a complete set of flashcards from Quizlet
 */
export interface QuizletSet {
  id: string;
  title: string;
  flashcards: QuizletFlashcard[];
}

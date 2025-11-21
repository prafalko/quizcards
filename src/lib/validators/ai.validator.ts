import { z } from "zod";

/**
 * AI Response Validators
 * Contains Zod schemas for validating AI service responses
 */

// ============================================================================
// Generate Incorrect Answers
// ============================================================================

/**
 * Schema for incorrect answers generation response
 * Validates that AI returns exactly 3 incorrect answer options
 */
export const generateIncorrectAnswersResponseSchema = z.object({
  incorrectAnswers: z
    .array(z.string().min(1, "Answer must not be empty"))
    .length(3, "Must generate exactly 3 incorrect answers")
    .describe("Array of exactly 3 incorrect answer options"),
});

/**
 * Type for validated incorrect answers response
 */
export type GenerateIncorrectAnswersResponse = z.infer<typeof generateIncorrectAnswersResponseSchema>;

// ============================================================================
// Batch Quiz Generation (from flashcards)
// ============================================================================

/**
 * Schema for a single generated question in batch mode
 * Validates that each question has the correct structure with exactly 3 incorrect answers
 */
const GeneratedQuestionSchema = z.object({
  question: z.string().min(1, "Question text must not be empty").describe("Original question from flashcard"),
  correctAnswer: z.string().min(1, "Correct answer must not be empty").describe("Correct answer from flashcard"),
  incorrectAnswers: z
    .array(z.string().min(1, "Answer must not be empty"))
    .length(3, "Must generate exactly 3 incorrect answers")
    .describe("Array of exactly 3 generated incorrect answer options"),
});

/**
 * Schema for complete quiz generation response
 * Validates that AI returns a title and array of questions
 */
export const GeneratedQuizSchema = z.object({
  title: z
    .string()
    .min(1, "Quiz title must not be empty")
    .describe("Quiz title generated based on topic and flashcards"),
  questions: z.array(GeneratedQuestionSchema).min(1, "Must generate at least one question"),
});

/**
 * Type for validated generated quiz response
 */
export type GeneratedQuiz = z.infer<typeof GeneratedQuizSchema>;

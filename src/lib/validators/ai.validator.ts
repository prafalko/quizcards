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
// Future validators can be added here
// ============================================================================

/**
 * Example: Schema for quiz generation (if needed in the future)
 */
// export const generateQuizResponseSchema = z.object({
//   title: z.string(),
//   questions: z.array(
//     z.object({
//       question: z.string(),
//       correctAnswer: z.string(),
//       incorrectAnswers: z.array(z.string()).length(3),
//     })
//   ),
// });

import { z } from "zod";
import { ValidationError } from "../errors";

/**
 * Validator for CreateQuizCommand
 * Validates the request body for POST /api/quizzes/generate
 *
 * Supported Quizlet URL formats:
 * - https://quizlet.com/{set_id}/{title}/
 * - https://quizlet.com/{language_code}/{set_id}/{title}/
 * - https://www.quizlet.com/{set_id}/{title}/
 * - https://www.quizlet.com/{language_code}/{set_id}/{title}/
 *
 * Where:
 * - language_code: 2-letter language code (optional, e.g., "pl", "en")
 * - set_id: numeric set identifier (required)
 * - title: URL-friendly title (optional, ignored during processing)
 *
 * Examples:
 * - https://quizlet.com/123456789/biology-cells-flash-cards/
 * - https://quizlet.com/pl/870889722/tasiemce-flash-cards/
 * - https://www.quizlet.com/en/555666777/chemistry-elements/
 */
export const validateGenerateQuizCommand = z.object({
  source_url: z
    .string()
    .url("Invalid URL format")
    .refine(
      (url) => {
        try {
          const urlObj = new URL(url);
          return urlObj.hostname === "quizlet.com" || urlObj.hostname.endsWith(".quizlet.com");
        } catch {
          return false;
        }
      },
      { message: "URL must be from quizlet.com" }
    )
    .refine(
      (url) => {
        // URL should match pattern: https://quizlet.com/{optional_language}/{set_id}/{optional_title}/
        // Language code (optional): e.g., "pl", "en", etc.
        // Set ID (required): numeric identifier
        // Title and other segments (optional): ignored
        const regex = /^https:\/\/(www\.)?quizlet\.com\/(?:[a-z]{2}\/)?(\d+)(?:\/.*)?\/?$/;
        return regex.test(url);
      },
      { message: "Invalid Quizlet set URL format. URL must contain a valid set ID." }
    ),
  title: z.string().min(1, "Title cannot be empty").max(200, "Title is too long").optional(),
});

/**
 * Validator for QuizzesListQueryParams
 * Validates query parameters for GET /api/quizzes
 */
export const validateQuizzesListQueryParams = z.object({
  status: z.enum(["draft", "published"]).optional(),
});

/**
 * Validator for UpdateQuizCommand
 * Validates the request body for PATCH /api/quizzes/:id
 */
export const validateUpdateQuizCommand = z
  .object({
    title: z
      .string()
      .min(1, "Title cannot be empty")
      .max(255, "Title must not exceed 255 characters")
      .trim()
      .optional(),
    status: z.enum(["draft", "published"]).optional(),
  })
  .refine((data) => data.title !== undefined || data.status !== undefined, {
    message: "At least one field (title or status) must be provided",
  });

/**
 * Validator for UpdateQuestionCommand
 * Validates the request body for PATCH /api/questions/:id
 */
export const validateUpdateQuestionCommand = z.object({
  question_text: z
    .string()
    .min(1, "Question text cannot be empty")
    .max(2048, "Question text must not exceed 2048 characters")
    .trim(),
});

/**
 * Validator for RegenerateAnswersCommand
 * Validates the request body for POST /api/questions/:id/regenerate
 */
export const validateRegenerateAnswersCommand = z.object({
  temperature: z
    .number()
    .min(0, "Temperature must be between 0 and 1")
    .max(1, "Temperature must be between 0 and 1")
    .optional()
    .default(0.7),
  seed: z.number().int("Seed must be an integer").optional(),
});

/**
 * Validator for UpdateAnswerCommand
 * Validates the request body for PATCH /api/answers/:id
 */
export const validateUpdateAnswerCommand = z.object({
  answer_text: z
    .string()
    .min(1, "Answer text cannot be empty")
    .max(512, "Answer text must not exceed 512 characters")
    .trim(),
});

/**
 * Validates if a string is a valid UUID format
 * @param id - The string to validate as UUID
 * @returns true if valid UUID, false otherwise
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validates ID parameter from URL path
 * @param id - The ID to validate
 * @param resourceType - The type of resource (e.g., "Quiz", "Question", "Answer")
 * @throws ValidationError if invalid
 */
export function validateId(id: string, resourceType: string): void {
  if (!id || typeof id !== "string") {
    throw new ValidationError(`${resourceType} ID is required`, { id });
  }

  if (!isValidUUID(id)) {
    throw new ValidationError(`Invalid ${resourceType} ID format. Must be a valid UUID.`, { id });
  }
}

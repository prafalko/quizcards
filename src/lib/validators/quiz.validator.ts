import { z } from "zod";
import { ValidationError } from "../errors";

/**
 * Validator for CreateQuizCommand
 * Validates the request body for POST /api/quizzes/generate
 */
export const validateRequestData = z.object({
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
        // URL should match pattern: https://quizlet.com/{id}/{set-name}/
        const regex = /^https:\/\/(www\.)?quizlet\.com\/\d+\/.+/;
        return regex.test(url);
      },
      { message: "Invalid Quizlet set URL format" }
    ),
  title: z.string().min(1, "Title cannot be empty").max(200, "Title is too long").optional(),
});

/**
 * Validates if a string is a valid UUID format
 * @param id - The string to validate as UUID
 * @returns true if valid UUID, false otherwise
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validates quiz ID parameter from URL path
 * @param id - The quiz ID from URL parameter
 * @throws ValidationError if invalid
 */
export function validateQuizId(id: string): void {
  if (!id || typeof id !== "string") {
    throw new ValidationError("Quiz ID is required", { id });
  }

  if (!isValidUUID(id)) {
    throw new ValidationError("Invalid quiz ID format. Must be a valid UUID.", { id });
  }
}

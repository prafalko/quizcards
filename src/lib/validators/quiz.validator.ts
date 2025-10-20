import { z } from "zod";

/**
 * Validator for CreateQuizCommand
 * Validates the request body for POST /api/quizzes/generate
 */
export const createQuizSchema = z.object({
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

export type CreateQuizInput = z.infer<typeof createQuizSchema>;

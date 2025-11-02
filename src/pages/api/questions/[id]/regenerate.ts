import type { APIRoute } from "astro";

import type { RegenerateAnswersCommand } from "../../../../types";
import { validateId, validateRegenerateAnswersCommand } from "../../../../lib/validators/quiz.validator";
import { ValidationError } from "../../../../lib/errors";
import { createApiRoute } from "../../../../lib/api-handler";
import { logger } from "../../../../lib/services/logger.service";

export const prerender = false;

/**
 * POST /api/questions/:id/regenerate
 *
 * Regenerates incorrect answers for a question using AI.
 * The question text and correct answer remain unchanged.
 * This endpoint deletes all existing incorrect answers and generates 3 new ones.
 * Only the owner of the quiz containing the question can regenerate answers (IDOR protection).
 *
 * URL Parameters:
 * - id: UUID of the question to regenerate answers for
 *
 * Request Body (optional):
 * - temperature: number (0-1, default: 0.7) - Controls AI creativity
 * - seed: number (integer, optional) - For reproducibility
 *
 * @returns 200 OK with QuestionDetailDTO on success
 * @returns 400 Bad Request for invalid UUID format or validation errors
 * @returns 401 Unauthorized if user is not authenticated
 * @returns 403 Forbidden if user doesn't own the quiz containing the question
 * @returns 404 Not Found if question doesn't exist
 * @returns 500 Internal Server Error for AI generation or database errors
 */
export const POST: APIRoute = createApiRoute(async ({ params, request, context }) => {
  const { userId, quizService, correlationId } = context;

  // Step 1: Extract and validate question ID from URL parameters
  const { id } = params;

  if (!id || typeof id !== "string") {
    throw new ValidationError("Question ID is required in URL path", { id }, correlationId);
  }
  validateId(id, "Question");

  // Step 2: Parse and validate request body (optional parameters)
  let requestBody: unknown = {};
  const contentType = request.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    try {
      const text = await request.text();
      if (text && text.trim().length > 0) {
        requestBody = JSON.parse(text);
      }
    } catch (parseError) {
      throw new ValidationError(
        "Invalid JSON in request body",
        { error: parseError instanceof Error ? parseError.message : String(parseError) },
        correlationId
      );
    }
  }

  const validationResult = validateRegenerateAnswersCommand.safeParse(requestBody);
  if (!validationResult.success) {
    const validationErrors = validationResult.error.errors.map((err) => ({
      path: err.path.join("."),
      message: err.message,
    }));

    throw new ValidationError("Request validation failed", { errors: validationErrors }, correlationId);
  }

  const validatedData: RegenerateAnswersCommand = validationResult.data;

  // Step 3: Regenerate incorrect answers using service
  logger.info("Starting answer regeneration", {
    correlationId,
    metadata: {
      questionId: id,
      temperature: validatedData.temperature,
      seed: validatedData.seed,
    },
  });

  const updatedQuestion = await quizService.regenerateIncorrectAnswers(id, userId, validatedData, correlationId);

  // Step 4: Return successful response
  return {
    body: updatedQuestion,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  };
});

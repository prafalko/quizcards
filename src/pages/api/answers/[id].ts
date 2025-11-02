import type { APIRoute } from "astro";

import type { UpdateAnswerCommand } from "../../../types";
import { validateId, validateUpdateAnswerCommand } from "../../../lib/validators/quiz.validator";
import { ValidationError } from "../../../lib/errors";
import { createApiRoute } from "../../../lib/api-handler";

export const prerender = false;

/**
 * PATCH /api/answers/:id
 *
 * Updates the text of an existing answer.
 * This endpoint ensures that only the owner of the quiz containing the answer can update it (IDOR protection).
 * If the answer was originally AI-generated (source: 'ai'), its source changes to 'ai-edited'.
 * The question's updated_at field is automatically updated to reflect the change.
 *
 * URL Parameters:
 * - id: UUID of the answer to update
 *
 * Request Body:
 * - answer_text: New text for the answer (string, min 1, max 512 characters)
 *
 * @returns 200 OK with AnswerDTO on success
 * @returns 400 Bad Request for invalid UUID format or validation errors
 * @returns 401 Unauthorized if user is not authenticated (future implementation)
 * @returns 404 Not Found if answer doesn't exist or user doesn't have access
 * @returns 500 Internal Server Error for database or server errors
 */
export const PATCH: APIRoute = createApiRoute(async ({ params, request, context }) => {
  const { userId, quizService, correlationId } = context;

  // Step 1: Extract and validate answer ID from URL parameters
  const { id } = params;

  if (!id || typeof id !== "string") {
    throw new ValidationError("Answer ID is required in URL path", { id }, correlationId);
  }
  validateId(id, "Answer");

  // Step 2: Parse and validate request body
  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch (parseError) {
    throw new ValidationError(
      "Invalid JSON in request body",
      { error: parseError instanceof Error ? parseError.message : String(parseError) },
      correlationId
    );
  }

  const validationResult = validateUpdateAnswerCommand.safeParse(requestBody);
  if (!validationResult.success) {
    const validationErrors = validationResult.error.errors.map((err) => ({
      path: err.path.join("."),
      message: err.message,
    }));

    throw new ValidationError("Request validation failed", { errors: validationErrors }, correlationId);
  }

  const validatedData: UpdateAnswerCommand = validationResult.data;

  // Step 3: Update answer text using service
  const updatedAnswer = await quizService.updateAnswer(id, userId, validatedData, correlationId);

  // Step 4: Return successful response
  return {
    body: updatedAnswer,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  };
});

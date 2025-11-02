import type { APIRoute } from "astro";

import type { UpdateQuestionCommand } from "../../../types";
import { validateId, validateUpdateQuestionCommand } from "../../../lib/validators/quiz.validator";
import { ValidationError } from "../../../lib/errors";
import { createApiRoute } from "../../../lib/api-handler";

export const prerender = false;

/**
 * GET /api/questions/:id
 *
 * Retrieves a question with all its answers by ID.
 * This endpoint ensures that only the owner of the quiz containing the question can access it (IDOR protection).
 *
 * URL Parameters:
 * - id: UUID of the question to retrieve
 *
 * @returns 200 OK with QuestionDetailDTO on success
 * @returns 400 Bad Request for invalid UUID format
 * @returns 401 Unauthorized if user is not authenticated (future implementation)
 * @returns 404 Not Found if question doesn't exist or user doesn't have access
 * @returns 500 Internal Server Error for database or server errors
 */
export const GET: APIRoute = createApiRoute(async ({ params, context }) => {
  const { userId, quizService, correlationId } = context;

  // Step 1: Extract and validate question ID from URL parameters
  const { id } = params;
  if (!id || typeof id !== "string") {
    throw new ValidationError("Question ID is required in URL path", { id }, correlationId);
  }
  validateId(id, "Question");

  // Step 2: Retrieve question data using service
  const questionData = await quizService.getQuestionById(id, userId, correlationId);

  // Step 3: Return successful response
  return {
    body: questionData,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  };
});

/**
 * PATCH /api/questions/:id
 *
 * Updates the text of an existing question.
 * This endpoint ensures that only the owner of the quiz containing the question can update it (IDOR protection).
 * The updated_at field is automatically updated in the database.
 *
 * URL Parameters:
 * - id: UUID of the question to update
 *
 * Request Body:
 * - question_text: New text for the question (string, min 1, max 2048 characters)
 *
 * @returns 200 OK with QuestionDetailDTO on success
 * @returns 400 Bad Request for invalid UUID format or validation errors
 * @returns 401 Unauthorized if user is not authenticated (future implementation)
 * @returns 404 Not Found if question doesn't exist or user doesn't have access
 * @returns 500 Internal Server Error for database or server errors
 */
export const PATCH: APIRoute = createApiRoute(async ({ params, request, context }) => {
  const { userId, quizService, correlationId } = context;

  // Step 1: Extract and validate question ID from URL parameters
  const { id } = params;
  if (!id || typeof id !== "string") {
    throw new ValidationError("Question ID is required in URL path", { id }, correlationId);
  }
  validateId(id, "Question");

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

  const validationResult = validateUpdateQuestionCommand.safeParse(requestBody);
  if (!validationResult.success) {
    const validationErrors = validationResult.error.errors.map((err) => ({
      path: err.path.join("."),
      message: err.message,
    }));
    throw new ValidationError("Request validation failed", { errors: validationErrors }, correlationId);
  }

  const validatedData: UpdateQuestionCommand = validationResult.data;

  // Step 3: Update question text using service
  const updatedQuestion = await quizService.updateQuestionText(id, userId, validatedData, correlationId);

  // Step 4: Return successful response
  return {
    body: updatedQuestion,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  };
});

/**
 * DELETE /api/questions/:id
 *
 * Deletes a question and all its associated answers.
 * This operation is permanent and irreversible.
 * This endpoint ensures that only the owner of the quiz containing the question can delete it (IDOR protection).
 * The quiz's updated_at field is automatically updated to reflect the change.
 *
 * URL Parameters:
 * - id: UUID of the question to delete
 *
 * @returns 204 No Content on successful deletion
 * @returns 400 Bad Request for invalid UUID format
 * @returns 401 Unauthorized if user is not authenticated (future implementation)
 * @returns 404 Not Found if question doesn't exist or user doesn't have access
 * @returns 500 Internal Server Error for database or server errors
 */
export const DELETE: APIRoute = createApiRoute(async ({ params, context }) => {
  const { userId, quizService, correlationId } = context;

  // Step 1: Extract and validate question ID from URL parameters
  const { id } = params;
  if (!id || typeof id !== "string") {
    throw new ValidationError("Question ID is required in URL path", { id }, correlationId);
  }
  validateId(id, "Question");

  // Step 2: Delete the question using service
  await quizService.deleteQuestion(id, userId, correlationId);

  // Step 3: Return successful response (204 No Content)
  return {
    status: 204,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  };
});

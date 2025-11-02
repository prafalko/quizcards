import type { APIRoute } from "astro";

import type { UpdateQuizCommand } from "../../../types";
import { validateId, validateUpdateQuizCommand } from "../../../lib/validators/quiz.validator";
import { ValidationError } from "../../../lib/errors";
import { createApiRoute } from "../../../lib/api-handler";

export const prerender = false;

/**
 * GET /api/quizzes/:id
 *
 * Retrieves a complete quiz with all questions and answers by ID.
 * This endpoint supports user isolation by filtering quizzes by the authenticated user.
 *
 * URL Parameters:
 * - id: UUID of the quiz to retrieve
 *
 * @returns 200 OK with QuizDetailDTO on success
 * @returns 400 Bad Request for invalid UUID format
 * @returns 401 Unauthorized if user is not authenticated (future implementation)
 * @returns 404 Not Found if quiz doesn't exist or user doesn't have access
 * @returns 500 Internal Server Error for database or server errors
 */
export const GET: APIRoute = createApiRoute(async ({ params, context }) => {
  const { userId, quizService, correlationId } = context;

  // Step 1: Extract and validate quiz ID from URL parameters
  const { id } = params;

  if (!id || typeof id !== "string") {
    throw new ValidationError("Quiz ID is required in URL path", { id }, correlationId);
  }
  validateId(id, "Quiz");

  // Step 2: Retrieve quiz data using service
  const quizData = await quizService.getQuizById(id, userId, correlationId);

  // Step 3: Return successful response with caching headers
  return {
    body: quizData,
    headers: {
      "Cache-Control":
        quizData.status === "published" ? "public, max-age=300, s-maxage=300" : "no-cache, no-store, must-revalidate",
      ETag: `"quiz-${quizData.id}-${quizData.updated_at}"`,
    },
  };
});

/**
 * PATCH /api/quizzes/:id
 *
 * Updates a quiz's properties (currently only title can be updated).
 * This endpoint supports user isolation by ensuring only the quiz owner can update it.
 *
 * URL Parameters:
 * - id: UUID of the quiz to update
 *
 * Request Body:
 * - title: New title for the quiz (1-255 characters, required)
 *
 * @returns 200 OK with QuizSummaryDTO on success
 * @returns 400 Bad Request for invalid UUID format or validation errors
 * @returns 401 Unauthorized if user is not authenticated (future implementation)
 * @returns 404 Not Found if quiz doesn't exist or user doesn't have access
 * @returns 500 Internal Server Error for database or server errors
 */
export const PATCH: APIRoute = createApiRoute(async ({ params, request, context }) => {
  const { userId, quizService, correlationId } = context;

  // Step 1: Extract and validate quiz ID from URL parameters
  const { id } = params;
  if (!id || typeof id !== "string") {
    throw new ValidationError("Quiz ID is required in URL path", { id }, correlationId);
  }
  validateId(id, "Quiz");

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

  const validationResult = validateUpdateQuizCommand.safeParse(requestBody);
  if (!validationResult.success) {
    throw new ValidationError("Invalid request body", { errors: validationResult.error.errors }, correlationId);
  }

  const updateData: UpdateQuizCommand = validationResult.data;

  // Step 3: Update quiz using service
  const updatedQuiz = await quizService.updateQuiz(id, userId, updateData, correlationId);

  // Step 4: Return successful response
  return {
    body: updatedQuiz,
  };
});

/**
 * DELETE /api/quizzes/:id
 *
 * Permanently deletes a quiz and all associated questions and answers.
 * This operation is irreversible and can only be performed by the quiz owner.
 * The database CASCADE delete will automatically remove all related data.
 *
 * URL Parameters:
 * - id: UUID of the quiz to delete
 *
 * @returns 204 No Content on successful deletion
 * @returns 400 Bad Request for invalid UUID format
 * @returns 401 Unauthorized if user is not authenticated (future implementation)
 * @returns 404 Not Found if quiz doesn't exist or user doesn't have access
 * @returns 500 Internal Server Error for database or server errors
 */
export const DELETE: APIRoute = createApiRoute(async ({ params, context }) => {
  const { userId, quizService, correlationId } = context;

  // Step 1: Extract and validate quiz ID from URL parameters
  const { id } = params;
  if (!id || typeof id !== "string") {
    throw new ValidationError("Quiz ID is required in URL path", { id }, correlationId);
  }
  validateId(id, "Quiz");

  // Step 2: Delete quiz using service
  await quizService.deleteQuiz(id, userId, correlationId);

  // Step 3: Return successful response with 204 No Content
  return {
    status: 204,
  };
});

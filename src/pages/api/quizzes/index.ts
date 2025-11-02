import type { APIRoute } from "astro";
import { ZodError } from "zod";

import type { QuizzesListQueryParams } from "../../../types";
import { validateQuizzesListQueryParams } from "../../../lib/validators/quiz.validator";
import { createApiRoute } from "../../../lib/api-handler";
import { ValidationError } from "../../../lib/errors";

export const prerender = false;

/**
 * GET /api/quizzes
 *
 * Retrieves a list of quizzes belonging to the authenticated user.
 * Results are sorted by creation date (newest first).
 * Supports optional filtering by status (draft or published).
 *
 * Query Parameters:
 * - status?: 'draft' | 'published' - Optional filter by quiz status
 *
 * @returns 200 OK with QuizzesListDTO (array of quiz items) on success
 * @returns 400 Bad Request for invalid status parameter
 * @returns 401 Unauthorized if user is not authenticated (future: when auth is implemented)
 * @returns 500 Internal Server Error for database or unexpected errors
 */
export const GET: APIRoute = createApiRoute(async ({ request, context }) => {
  const { userId, quizService, correlationId } = context;

  // Step 1: Parse and validate query parameters
  const url = new URL(request.url);
  const rawParams: Record<string, string | undefined> = {
    status: url.searchParams.get("status") || undefined,
  };

  let validatedParams: QuizzesListQueryParams;
  try {
    validatedParams = validateQuizzesListQueryParams.parse(rawParams);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(
        "Invalid query parameters",
        {
          errors: error.errors,
          rawParams,
        },
        correlationId
      );
    }
    throw error;
  }

  // Step 2: Fetch quizzes using the service
  const quizzesList = await quizService.getQuizzes(userId, validatedParams, correlationId);

  // Step 3: Return success response
  return {
    body: quizzesList,
  };
});

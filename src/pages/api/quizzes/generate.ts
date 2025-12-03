import type { APIRoute } from "astro";
import { ZodError } from "zod";

import type { CreateQuizCommand } from "../../../types";
import { validateGenerateQuizCommand } from "../../../lib/validators/quiz.validator";
import { extractQuizletSetId } from "../../../lib/services/quizlet.service";
import { createApiRoute } from "../../../lib/api-handler";
import { ValidationError } from "../../../lib/errors";
import { QuizletScraperFailedError } from "../../../lib/errors";

export const prerender = false;

/**
 * POST /api/quizzes/generate
 *
 * Generates a quiz from a Quizlet set URL by:
 * 1. Validating the input
 * 2. Fetching flashcards from Quizlet
 * 3. Generating incorrect answers using AI
 * 4. Saving the quiz to the database
 *
 * @returns 201 Created with QuizSummaryDTO on success
 * @returns 400 Bad Request for validation errors
 * @returns 403 Forbidden for private Quizlet sets
 * @returns 404 Not Found for non-existent Quizlet sets
 * @returns 422 Unprocessable Entity for empty Quizlet sets
 * @returns 500 Internal Server Error for AI or database failures
 */
export const POST: APIRoute = createApiRoute(async ({ request, context }) => {
  const { userId, quizService, correlationId } = context;

  // Step 1: Parse and validate request body
  let command: CreateQuizCommand;
  try {
    const body = await request.json();
    command = validateGenerateQuizCommand.parse(body) as CreateQuizCommand;
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Invalid request data", { errors: error.errors }, correlationId);
    }
    throw new ValidationError(
      "Failed to parse request data",
      { error: error instanceof Error ? error.message : String(error) },
      correlationId
    );
  }

  // Step 2: Extract Quizlet set ID
  let quizletSetId: string;
  try {
    quizletSetId = extractQuizletSetId(command.source_url);
  } catch {
    throw new ValidationError("Invalid Quizlet URL format", { source_url: command.source_url }, correlationId);
  }

  // Step 3: Call service to create quiz
  const quizSummary = await quizService.createQuizFromQuizlet(command, userId, quizletSetId, correlationId);

  // Step 4: Return successful response
  return {
    status: 201,
    body: quizSummary,
  };
});

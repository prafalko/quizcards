import type { APIRoute } from "astro";

import type { ErrorResponse, UpdateAnswerCommand } from "../../../types";
import { validateId, validateUpdateAnswerCommand } from "../../../lib/validators/quiz.validator";
import { createQuizService } from "../../../lib/services/quiz.service";
import { supabaseClient, supabaseDefaultUserId } from "../../../db/supabase.client";
import { logger, LoggerService } from "../../../lib/services/logger.service";
import { AppError, ValidationError, UnauthorizedError, extractErrorDetails } from "../../../lib/errors";

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
export const PATCH: APIRoute = async ({ params, request }) => {
  const correlationId = LoggerService.generateCorrelationId();
  const startTime = Date.now();

  try {
    logger.logRequestStart("PATCH /api/answers/:id", correlationId, undefined, {
      url: request.url,
      method: request.method,
    });

    // Step 1: Extract and validate answer ID from URL parameters
    const { id } = params;

    if (!id || typeof id !== "string") {
      throw new ValidationError("Answer ID is required in URL path", { id }, correlationId);
    }

    // Validate UUID format
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

    // Validate request body against schema
    const validationResult = validateUpdateAnswerCommand.safeParse(requestBody);
    if (!validationResult.success) {
      const validationErrors = validationResult.error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      }));

      throw new ValidationError("Request validation failed", { errors: validationErrors }, correlationId);
    }

    const validatedData: UpdateAnswerCommand = validationResult.data;

    // Step 3: Initialize service and get user context
    const quizService = createQuizService(supabaseClient);
    const userId = supabaseDefaultUserId; // MOCK: Development user ID

    if (!userId) {
      throw new UnauthorizedError(
        "User authentication required - SUPABASE_DEFAULT_USER_ID not configured",
        correlationId
      );
    }

    // Step 4: Update answer text using service
    const updatedAnswer = await quizService.updateAnswer(id, userId, validatedData, correlationId);

    // Step 5: Return successful response
    const responseHeaders = new Headers({
      "Content-Type": "application/json",
      // No caching for updated answers
      "Cache-Control": "no-cache, no-store, must-revalidate",
      // Add correlation ID for debugging
      "X-Correlation-ID": correlationId,
    });

    logger.logRequestComplete("PATCH /api/answers/:id", correlationId, Date.now() - startTime, userId, {
      answerId: id,
      answer_text: validatedData.answer_text,
    });

    return new Response(JSON.stringify(updatedAnswer), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    // Handle different error types
    if (error instanceof AppError) {
      logger.logRequestError("PATCH /api/answers/:id", correlationId, error, undefined, {
        errorDetails: extractErrorDetails(error),
      });

      const responseHeaders = new Headers({
        "Content-Type": "application/json",
        "X-Correlation-ID": correlationId,
      });

      return new Response(JSON.stringify(error.toResponse()), {
        status: error.statusCode,
        headers: responseHeaders,
      });
    }

    // Handle unexpected errors
    logger.logRequestError("PATCH /api/answers/:id", correlationId, error, undefined, {
      errorDetails: extractErrorDetails(error),
    });

    const errorResponse: ErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while updating the answer",
        details: { correlationId },
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "X-Correlation-ID": correlationId,
      },
    });
  }
};

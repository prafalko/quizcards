import type { APIRoute } from "astro";

import type { ErrorResponse, RegenerateAnswersCommand } from "../../../../types";
import { validateId, validateRegenerateAnswersCommand } from "../../../../lib/validators/quiz.validator";
import { createQuizService } from "../../../../lib/services/quiz.service";
import { supabaseClient, supabaseDefaultUserId } from "../../../../db/supabase.client";
import { logger, LoggerService } from "../../../../lib/services/logger.service";
import { AppError, ValidationError, UnauthorizedError, extractErrorDetails } from "../../../../lib/errors";

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
export const POST: APIRoute = async ({ params, request }) => {
  const correlationId = LoggerService.generateCorrelationId();
  const startTime = Date.now();

  try {
    logger.logRequestStart("POST /api/questions/:id/regenerate", correlationId, undefined, {
      url: request.url,
      method: request.method,
    });

    // Step 1: Extract and validate question ID from URL parameters
    const { id } = params;

    if (!id || typeof id !== "string") {
      throw new ValidationError("Question ID is required in URL path", { id }, correlationId);
    }

    // Validate UUID format
    validateId(id, "Question");

    // Step 2: Parse and validate request body (optional parameters)
    let requestBody: unknown = {};
    const contentType = request.headers.get("content-type");

    // Only parse body if Content-Type is application/json and there is content
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

    // Validate request body against schema (will use defaults if empty)
    const validationResult = validateRegenerateAnswersCommand.safeParse(requestBody);
    if (!validationResult.success) {
      const validationErrors = validationResult.error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      }));

      throw new ValidationError("Request validation failed", { errors: validationErrors }, correlationId);
    }

    const validatedData: RegenerateAnswersCommand = validationResult.data;

    // Step 3: Initialize service and get user context
    const quizService = createQuizService(supabaseClient);
    const userId = supabaseDefaultUserId; // MOCK: Development user ID

    if (!userId) {
      throw new UnauthorizedError(
        "User authentication required - SUPABASE_DEFAULT_USER_ID not configured",
        correlationId
      );
    }

    // Step 4: Regenerate incorrect answers using service
    logger.info("Starting answer regeneration", {
      correlationId,
      metadata: {
        questionId: id,
        temperature: validatedData.temperature,
        seed: validatedData.seed,
      },
    });

    const updatedQuestion = await quizService.regenerateIncorrectAnswers(id, userId, validatedData, correlationId);

    // Step 5: Return successful response
    const responseHeaders = new Headers({
      "Content-Type": "application/json",
      // No caching for regenerated answers
      "Cache-Control": "no-cache, no-store, must-revalidate",
      // Add correlation ID for debugging
      "X-Correlation-ID": correlationId,
    });

    logger.logRequestComplete("POST /api/questions/:id/regenerate", correlationId, Date.now() - startTime, userId, {
      questionId: id,
      answerCount: updatedQuestion.answers.length,
      temperature: validatedData.temperature,
    });

    return new Response(JSON.stringify(updatedQuestion), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    // Handle different error types
    if (error instanceof AppError) {
      logger.logRequestError("POST /api/questions/:id/regenerate", correlationId, error, undefined, {
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
    logger.logRequestError("POST /api/questions/:id/regenerate", correlationId, error, undefined, {
      errorDetails: extractErrorDetails(error),
    });

    const errorResponse: ErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while regenerating answers",
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

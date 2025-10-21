import type { APIRoute } from "astro";

import type { ErrorResponse } from "../../../types";
import { validateQuizId } from "../../../lib/validators/quiz.validator";
import { createQuizService } from "../../../lib/services/quiz.service";
import { supabaseClient, supabaseDefaultUserId } from "../../../db/supabase.client";
import { logger, LoggerService } from "../../../lib/services/logger.service";
import { AppError, ValidationError, UnauthorizedError, extractErrorDetails } from "../../../lib/errors";

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
export const GET: APIRoute = async ({ params, request }) => {
  const correlationId = LoggerService.generateCorrelationId();
  const startTime = Date.now();

  try {
    logger.logRequestStart("GET /api/quizzes/:id", correlationId, undefined, {
      url: request.url,
      method: request.method,
    });

    // Step 1: Extract and validate quiz ID from URL parameters
    const { id } = params;

    if (!id || typeof id !== "string") {
      throw new ValidationError("Quiz ID is required in URL path", { id }, correlationId);
    }

    // Validate UUID format
    validateQuizId(id);

    // Step 2: Initialize service and get user context
    const quizService = createQuizService(supabaseClient);
    const userId = supabaseDefaultUserId; // MOCK: Development user ID

    if (!userId) {
      throw new UnauthorizedError(
        "User authentication required - SUPABASE_DEFAULT_USER_ID not configured",
        correlationId
      );
    }

    // Step 3: Retrieve quiz data using service
    const quizData = await quizService.getQuizById(id, userId, correlationId);

    // Step 4: Return successful response with caching headers
    const responseHeaders = new Headers({
      "Content-Type": "application/json",
      // Cache for 5 minutes for published quizzes, no cache for drafts
      "Cache-Control":
        quizData.status === "published" ? "public, max-age=300, s-maxage=300" : "no-cache, no-store, must-revalidate",
      // ETag for conditional requests
      ETag: `"quiz-${quizData.id}-${quizData.updated_at}"`,
      // Add correlation ID for debugging
      "X-Correlation-ID": correlationId,
    });
    logger.logRequestComplete("GET /api/quizzes/:id", correlationId, Date.now() - startTime, userId, {
      quizId: id,
      status: quizData.status,
      questionCount: quizData.questions.length,
    });

    return new Response(JSON.stringify(quizData), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    // Handle different error types
    if (error instanceof AppError) {
      logger.logRequestError("GET /api/quizzes/:id", correlationId, error, undefined, {
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
    logger.logRequestError("GET /api/quizzes/:id", correlationId, error, undefined, {
      errorDetails: extractErrorDetails(error),
    });

    const errorResponse: ErrorResponse = {
      error: {
        code: "AI_GENERATION_FAILED", // Reusing existing error code for server errors
        message: "An unexpected error occurred while retrieving the quiz",
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

import type { APIRoute } from "astro";

import type { ErrorResponse, UpdateQuestionCommand } from "../../../types";
import { validateId, validateUpdateQuestionCommand } from "../../../lib/validators/quiz.validator";
import { createQuizService } from "../../../lib/services/quiz.service";
import { supabaseClient, supabaseDefaultUserId } from "../../../db/supabase.client";
import { logger, LoggerService } from "../../../lib/services/logger.service";
import { AppError, ValidationError, UnauthorizedError, extractErrorDetails } from "../../../lib/errors";

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
export const GET: APIRoute = async ({ params, request }) => {
  const correlationId = LoggerService.generateCorrelationId();
  const startTime = Date.now();

  try {
    logger.logRequestStart("GET /api/questions/:id", correlationId, undefined, {
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

    // Step 2: Initialize service and get user context
    const quizService = createQuizService(supabaseClient);
    const userId = supabaseDefaultUserId; // MOCK: Development user ID

    if (!userId) {
      throw new UnauthorizedError(
        "User authentication required - SUPABASE_DEFAULT_USER_ID not configured",
        correlationId
      );
    }

    // Step 3: Retrieve question data using service
    const questionData = await quizService.getQuestionById(id, userId, correlationId);

    // Step 4: Return successful response
    const responseHeaders = new Headers({
      "Content-Type": "application/json",
      // No caching for questions as they may be edited
      "Cache-Control": "no-cache, no-store, must-revalidate",
      // Add correlation ID for debugging
      "X-Correlation-ID": correlationId,
    });

    logger.logRequestComplete("GET /api/questions/:id", correlationId, Date.now() - startTime, userId, {
      questionId: id,
      answerCount: questionData.answers.length,
    });

    return new Response(JSON.stringify(questionData), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    // Handle different error types
    if (error instanceof AppError) {
      logger.logRequestError("GET /api/questions/:id", correlationId, error, undefined, {
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
    logger.logRequestError("GET /api/questions/:id", correlationId, error, undefined, {
      errorDetails: extractErrorDetails(error),
    });

    const errorResponse: ErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while retrieving the question",
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
export const PATCH: APIRoute = async ({ params, request }) => {
  const correlationId = LoggerService.generateCorrelationId();
  const startTime = Date.now();

  try {
    logger.logRequestStart("PATCH /api/questions/:id", correlationId, undefined, {
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
    const validationResult = validateUpdateQuestionCommand.safeParse(requestBody);
    if (!validationResult.success) {
      const validationErrors = validationResult.error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      }));

      throw new ValidationError("Request validation failed", { errors: validationErrors }, correlationId);
    }

    const validatedData: UpdateQuestionCommand = validationResult.data;

    // Step 3: Initialize service and get user context
    const quizService = createQuizService(supabaseClient);
    const userId = supabaseDefaultUserId; // MOCK: Development user ID

    if (!userId) {
      throw new UnauthorizedError(
        "User authentication required - SUPABASE_DEFAULT_USER_ID not configured",
        correlationId
      );
    }

    // Step 4: Update question text using service
    const updatedQuestion = await quizService.updateQuestionText(id, userId, validatedData, correlationId);

    // Step 5: Return successful response
    const responseHeaders = new Headers({
      "Content-Type": "application/json",
      // No caching for updated questions
      "Cache-Control": "no-cache, no-store, must-revalidate",
      // Add correlation ID for debugging
      "X-Correlation-ID": correlationId,
    });

    logger.logRequestComplete("PATCH /api/questions/:id", correlationId, Date.now() - startTime, userId, {
      questionId: id,
      question_text: validatedData.question_text,
    });

    return new Response(JSON.stringify(updatedQuestion), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    // Handle different error types
    if (error instanceof AppError) {
      logger.logRequestError("PATCH /api/questions/:id", correlationId, error, undefined, {
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
    logger.logRequestError("PATCH /api/questions/:id", correlationId, error, undefined, {
      errorDetails: extractErrorDetails(error),
    });

    const errorResponse: ErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while updating the question",
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
export const DELETE: APIRoute = async ({ params, request }) => {
  const correlationId = LoggerService.generateCorrelationId();
  const startTime = Date.now();

  try {
    logger.logRequestStart("DELETE /api/questions/:id", correlationId, undefined, {
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

    // Step 2: Initialize service and get user context
    const quizService = createQuizService(supabaseClient);
    const userId = supabaseDefaultUserId; // MOCK: Development user ID

    if (!userId) {
      throw new UnauthorizedError(
        "User authentication required - SUPABASE_DEFAULT_USER_ID not configured",
        correlationId
      );
    }

    // Step 3: Delete the question using service
    await quizService.deleteQuestion(id, userId, correlationId);

    // Step 4: Return successful response (204 No Content)
    const responseHeaders = new Headers({
      // No caching for delete operations
      "Cache-Control": "no-cache, no-store, must-revalidate",
      // Add correlation ID for debugging
      "X-Correlation-ID": correlationId,
    });

    logger.logRequestComplete("DELETE /api/questions/:id", correlationId, Date.now() - startTime, userId, {
      questionId: id,
    });

    return new Response(null, {
      status: 204,
      headers: responseHeaders,
    });
  } catch (error) {
    // Handle different error types
    if (error instanceof AppError) {
      logger.logRequestError("DELETE /api/questions/:id", correlationId, error, undefined, {
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
    logger.logRequestError("DELETE /api/questions/:id", correlationId, error, undefined, {
      errorDetails: extractErrorDetails(error),
    });

    const errorResponse: ErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while deleting the question",
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

import type { APIRoute } from "astro";
import { ZodError } from "zod";

import type { ErrorResponse, QuizzesListDTO, QuizzesListQueryParams } from "../../../types";
import { validateQuizzesListQueryParams } from "../../../lib/validators/quiz.validator";
import { createQuizService } from "../../../lib/services/quiz.service";
import { supabaseDefaultUserId } from "../../../db/supabase.client";
import { logger } from "../../../lib/services/logger.service";
import { DatabaseError } from "../../../lib/errors";

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
export const GET: APIRoute = async ({ request, locals }) => {
  const correlationId = crypto.randomUUID();

  try {
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
        logger.warn("Invalid query parameters for GET /api/quizzes", {
          correlationId,
          metadata: { errors: error.errors, rawParams },
        });

        const errorResponse: ErrorResponse = {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: { errors: error.errors },
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      throw error;
    }

    // Step 2: Get user ID (MVP: using default user ID)
    // TODO: Replace with actual user authentication from locals.supabase.auth.getUser()
    const userId = supabaseDefaultUserId;

    if (!userId) {
      logger.warn("Missing user ID for GET /api/quizzes", {
        correlationId,
      });

      const errorResponse: ErrorResponse = {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 3: Get Supabase client from locals (using service role client for MVP)
    // TODO: Replace with user-specific client from locals.supabase when auth is implemented
    const supabase = locals.supabase;

    // Step 4: Create quiz service and fetch quizzes
    const quizService = createQuizService(supabase);
    const quizzesList: QuizzesListDTO = await quizService.getQuizzes(userId, validatedParams, correlationId);

    // Step 5: Return success response
    return new Response(JSON.stringify(quizzesList), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle database errors
    if (error instanceof DatabaseError) {
      logger.error("Database error in GET /api/quizzes", {
        correlationId,
        metadata: error.details,
      });

      const errorResponse: ErrorResponse = {
        error: {
          code: "DATABASE_ERROR",
          message: "Failed to retrieve quizzes",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
    logger.error("Unexpected error in GET /api/quizzes", {
      correlationId,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    });

    const errorResponse: ErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

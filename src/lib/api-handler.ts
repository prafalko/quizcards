import type { APIContext, APIRoute } from "astro";
import { AppError, extractErrorDetails, UnauthorizedError } from "./errors";
import { supabaseClient, supabaseDefaultUserId } from "../db/supabase.client";
import { createQuizService, QuizService } from "./services/quiz.service";
import { logger, LoggerService } from "./services/logger.service";
import type { ErrorResponse } from "../types";

// Define the context that will be passed to each API route handler
interface ApiRouteContext {
  userId: string;
  correlationId: string;
  quizService: QuizService;
}

// Define the shape of the handler function that will be passed to createApiRoute
type ApiRouteHandler<T = unknown> = (
  // It receives the original Astro APIContext and our custom context
  args: { context: ApiRouteContext } & APIContext
) => Promise<
  | {
      // It can return a body with a status code and optional headers
      body: T;
      status?: number;
      headers?: Record<string, string>;
    }
  | {
      // Or it can return just a status code for responses with no body (e.g., 204 No Content)
      status: number;
      body?: undefined;
      headers?: Record<string, string>;
    }
>;

/**
 * Creates a wrapped APIRoute that provides standardized error handling, logging, and context injection.
 * This centralizes common logic for all API endpoints.
 *
 * @param handler - The specific logic for the API endpoint.
 * @returns An APIRoute function that can be exported from an Astro API route file.
 */
export function createApiRoute<T>(handler: ApiRouteHandler<T>): APIRoute {
  // Return the actual APIRoute function
  return async (apiContext) => {
    const { request } = apiContext;
    const correlationId = LoggerService.generateCorrelationId();
    const startTime = Date.now();
    const routeName = `${request.method} ${new URL(request.url).pathname}`;

    try {
      // Log the start of the request
      logger.logRequestStart(routeName, correlationId, undefined, {
        url: request.url,
        method: request.method,
      });

      // --- Context Injection ---
      // For MVP, we use a default user ID. In a real application, this would come from the session.
      const userId = supabaseDefaultUserId;
      if (!userId) {
        // This error will be caught by the generic error handler below
        throw new UnauthorizedError(
          "User authentication required - SUPABASE_DEFAULT_USER_ID not configured",
          correlationId
        );
      }

      // Create an instance of the quiz service, passing in the Supabase client
      const quizService = createQuizService(supabaseClient);

      // --- Handler Execution ---
      // Execute the specific route handler logic
      const result = await handler({
        ...apiContext,
        context: { userId, correlationId, quizService },
      });

      const responseHeaders = new Headers({
        "Content-Type": "application/json",
        "X-Correlation-ID": correlationId,
        ...result.headers,
      });

      // Log the successful completion of the request
      logger.logRequestComplete(routeName, correlationId, Date.now() - startTime, userId);

      // --- Response Handling ---
      // If the handler returns a body, stringify it and send it in the response.
      if (result.body) {
        return new Response(JSON.stringify(result.body), {
          status: result.status ?? 200,
          headers: responseHeaders,
        });
      }

      // If there's no body, return an empty response with the appropriate status code.
      return new Response(null, {
        status: result.status,
        headers: responseHeaders,
      });
    } catch (error) {
      // --- Error Handling ---
      // Log the error with all available details
      logger.logRequestError(routeName, correlationId, error, undefined, {
        errorDetails: extractErrorDetails(error),
      });

      const responseHeaders = new Headers({
        "Content-Type": "application/json",
        "X-Correlation-ID": correlationId,
      });

      // If it's a known application error, create a response from it
      if (error instanceof AppError) {
        return new Response(JSON.stringify(error.toResponse()), {
          status: error.statusCode,
          headers: responseHeaders,
        });
      }

      // For unexpected errors, return a generic 500 Internal Server Error response
      const errorResponse: ErrorResponse = {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again later.",
          details: { correlationId },
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: responseHeaders,
      });
    }
  };
}

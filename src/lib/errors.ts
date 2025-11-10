import type { ErrorCode } from "../types";

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly correlationId?: string;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode = 500,
    details?: Record<string, unknown>,
    correlationId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.correlationId = correlationId;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Converts the error to a standardized error response format
   */
  toResponse() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

/**
 * Validation error for input validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>, correlationId?: string) {
    super("VALIDATION_ERROR", message, 400, details, correlationId);
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier: string, correlationId?: string) {
    super("NOT_FOUND", `${resource} not found`, 404, { resource, identifier }, correlationId);
  }
}

/**
 * Unauthorized error for authentication failures
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required", correlationId?: string) {
    super("UNAUTHORIZED", message, 401, undefined, correlationId);
  }
}

/**
 * Forbidden error for authorization failures
 */
export class ForbiddenError extends AppError {
  constructor(message = "Access denied", details?: Record<string, unknown>, correlationId?: string) {
    super("FORBIDDEN", message, 403, details, correlationId);
  }
}

/**
 * Database error for database operation failures
 */
export class DatabaseError extends AppError {
  constructor(operation: string, originalError: unknown, correlationId?: string) {
    let message = "A database error occurred";
    const details: Record<string, unknown> = { operation };

    if (typeof originalError === "object" && originalError !== null) {
      if ("message" in originalError && typeof originalError.message === "string") {
        message = originalError.message;
      }
      if ("details" in originalError) {
        details.db_details = originalError.details;
      }
      if ("hint" in originalError) {
        details.db_hint = originalError.hint;
      }
      if ("code" in originalError) {
        details.db_code = originalError.code;
      }
    } else {
      details.originalError = String(originalError);
    }

    super("DATABASE_ERROR", message, 500, details, correlationId);
  }
}

/**
 * External service error for third-party service failures
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, operation: string, originalError: unknown, correlationId?: string) {
    const errorMessage = originalError instanceof Error ? originalError.message : String(originalError);
    super(
      "AI_GENERATION_FAILED", // Reusing existing error code for external service issues
      `External service error: ${service}`,
      502, // Bad Gateway
      {
        service,
        operation,
        originalError: errorMessage,
      },
      correlationId
    );
  }
}

/**
 * AI generation error for AI service failures
 */
export class AIGenerationError extends AppError {
  constructor(message: string, originalError: Error, correlationId?: string) {
    super(
      "AI_GENERATION_FAILED",
      message,
      500,
      {
        originalError: originalError.message,
        stack: originalError.stack,
      },
      correlationId
    );
  }
}

/**
 * Rate limit error for rate limiting
 */
export class RateLimitError extends AppError {
  constructor(message = "Rate limit exceeded", correlationId?: string) {
    super("RATE_LIMIT_EXCEEDED", message, 429, undefined, correlationId);
  }
}

/**
 * PostgreSQL/Supabase error interface
 */
interface DatabaseErrorLike {
  code?: string;
  message?: string;
}

/**
 * Type guard for database error objects
 */
function isDatabaseErrorLike(error: unknown): error is DatabaseErrorLike {
  return typeof error === "object" && error !== null && ("code" in error || "message" in error);
}

/**
 * Creates an error from a database error code
 */
export function createDatabaseError(error: unknown, operation: string, correlationId?: string): AppError {
  if (!isDatabaseErrorLike(error)) {
    return new DatabaseError(operation, error, correlationId);
  }

  // Handle specific PostgreSQL error codes
  if (error.code === "PGRST116") {
    return new NotFoundError("Resource", "requested item", correlationId);
  }

  if (error.code?.startsWith("23")) {
    // Integrity constraint violations
    return new ValidationError("Data integrity violation", { operation, error: error.message }, correlationId);
  }

  if (error.code?.startsWith("42")) {
    // Syntax errors
    return new DatabaseError(operation, error, correlationId);
  }

  // Default database error
  return new DatabaseError(operation, error, correlationId);
}

/**
 * Safely extracts error details for logging
 */
export function extractErrorDetails(error: unknown): Record<string, unknown> {
  if (!error) return {};

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error instanceof AppError && {
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
      }),
    };
  }

  // Handle non-Error objects
  if (typeof error === "object") {
    const errorObj = error as Record<string, unknown>;
    return {
      name: errorObj.name,
      message: errorObj.message,
      code: errorObj.code,
      statusCode: errorObj.statusCode,
      stack: errorObj.stack,
      details: errorObj.details,
    };
  }

  return { message: String(error) };
}

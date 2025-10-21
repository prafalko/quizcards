/**
 * Logging levels for structured logging
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Structured log entry interface
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  operation?: string;
  userId?: string;
  quizId?: string;
  error?: {
    code?: string;
    message: string;
    stack?: string;
    details?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Logger service for structured logging across the application
 */
export class LoggerService {
  private logLevel: LogLevel;
  private serviceName: string;

  constructor(serviceName = "QuizCards", logLevel: LogLevel = LogLevel.INFO) {
    this.serviceName = serviceName;
    this.logLevel = logLevel;
  }

  /**
   * Generates a correlation ID for request tracking
   */
  static generateCorrelationId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Logs a message with the specified level
   */
  private log(level: LogLevel, message: string, entry: Partial<LogEntry> = {}): void {
    if (level < this.logLevel) return;

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...entry,
    };

    const levelName = LogLevel[level];
    const logString = `[${this.serviceName}] ${logEntry.timestamp} ${levelName}: ${message}`;

    // In development, use console with structured data
    if (import.meta.env.DEV) {
      const consoleMethod =
        level >= LogLevel.ERROR ? "error" : level >= LogLevel.WARN ? "warn" : level >= LogLevel.INFO ? "info" : "debug";

      // eslint-disable-next-line no-console
      console[consoleMethod](logString, {
        correlationId: logEntry.correlationId,
        operation: logEntry.operation,
        userId: logEntry.userId,
        quizId: logEntry.quizId,
        error: logEntry.error,
        metadata: logEntry.metadata,
      });
    } else {
      // In production, you might want to send to a logging service
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(logEntry));
    }
  }

  /**
   * Logs debug information
   */
  debug(message: string, entry: Partial<LogEntry> = {}): void {
    this.log(LogLevel.DEBUG, message, entry);
  }

  /**
   * Logs general information
   */
  info(message: string, entry: Partial<LogEntry> = {}): void {
    this.log(LogLevel.INFO, message, entry);
  }

  /**
   * Logs warnings
   */
  warn(message: string, entry: Partial<LogEntry> = {}): void {
    this.log(LogLevel.WARN, message, entry);
  }

  /**
   * Logs errors with full context
   */
  error(message: string, entry: Partial<LogEntry> = {}): void {
    this.log(LogLevel.ERROR, message, entry);
  }

  /**
   * Logs API request start
   */
  logRequestStart(operation: string, correlationId: string, userId?: string, metadata?: Record<string, unknown>): void {
    this.info(`Request started: ${operation}`, {
      correlationId,
      operation,
      userId,
      metadata,
    });
  }

  /**
   * Logs API request completion
   */
  logRequestComplete(
    operation: string,
    correlationId: string,
    duration: number,
    userId?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.info(`Request completed: ${operation}`, {
      correlationId,
      operation,
      userId,
      metadata: {
        ...metadata,
        duration,
      },
    });
  }

  /**
   * Logs API request errors
   */
  logRequestError(
    operation: string,
    correlationId: string,
    error: unknown,
    userId?: string,
    metadata?: Record<string, unknown>
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.error(`Request failed: ${operation}`, {
      correlationId,
      operation,
      userId,
      error: {
        message: errorMessage,
        stack: errorStack,
        details: metadata,
      },
      metadata,
    });
  }

  /**
   * Logs database operations
   */
  logDatabaseOperation(
    operation: string,
    table: string,
    correlationId: string,
    success: boolean,
    error?: unknown
  ): void {
    const level = success ? LogLevel.DEBUG : LogLevel.ERROR;
    const message = `Database ${operation}: ${table}`;
    const errorMessage = error instanceof Error ? error.message : error ? String(error) : undefined;

    this.log(level, message, {
      correlationId,
      operation: `db.${operation}`,
      error: success
        ? undefined
        : {
            message: errorMessage || "Unknown error",
            details: { table, operation },
          },
    });
  }
}

/**
 * Global logger instance
 */
export const logger = new LoggerService();

/**
 * Creates a logger instance for a specific service
 */
export function createLogger(serviceName: string, logLevel?: LogLevel): LoggerService {
  return new LoggerService(serviceName, logLevel);
}

/**
 * Utility functions for tracking user activity and managing session timeout
 */

import { logger } from "./services/logger.service";

const ACTIVITY_STORAGE_KEY = "user_last_activity";
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Updates the last activity timestamp in localStorage
 */
export function updateLastActivity(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(ACTIVITY_STORAGE_KEY, Date.now().toString());
  } catch (error) {
    // Handle localStorage errors (e.g., quota exceeded, private browsing)
    logger.warn("Failed to update activity timestamp", {
      operation: "activity.update",
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    });
  }
}

/**
 * Gets the last activity timestamp from localStorage
 * @returns Timestamp in milliseconds or null if not found
 */
export function getLastActivity(): number | null {
  if (typeof window === "undefined") return null;

  try {
    const timestamp = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch (error) {
    logger.warn("Failed to get activity timestamp", {
      operation: "activity.get",
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    });
    return null;
  }
}

/**
 * Checks if the user has been inactive for longer than the timeout period
 * @returns true if user should be logged out, false otherwise
 */
export function shouldLogoutDueToInactivity(): boolean {
  const lastActivity = getLastActivity();

  if (!lastActivity) {
    // No activity recorded, assume user should be logged out
    return true;
  }

  const timeSinceLastActivity = Date.now() - lastActivity;
  return timeSinceLastActivity >= INACTIVITY_TIMEOUT_MS;
}

/**
 * Clears the activity timestamp from localStorage
 */
export function clearActivity(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(ACTIVITY_STORAGE_KEY);
  } catch (error) {
    logger.warn("Failed to clear activity timestamp", {
      operation: "activity.clear",
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    });
  }
}

/**
 * Gets the inactivity timeout in milliseconds
 */
export function getInactivityTimeout(): number {
  return INACTIVITY_TIMEOUT_MS;
}

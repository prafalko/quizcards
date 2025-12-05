import { useActivityTracker } from "./hooks/useActivityTracker";
import { logger } from "../lib/services/logger.service";

/**
 * Component that tracks user activity and automatically logs out after inactivity
 * Should be mounted on authenticated pages only
 */
export function ActivityTracker() {
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Nie udało się wylogować");
      }

      // Redirect to login page with message about inactivity
      const params = new URLSearchParams({
        status: "error",
        message: "Zostałeś automatycznie wylogowany z powodu nieaktywności (30 minut).",
      });
      window.location.assign(`/login?${params.toString()}`);
    } catch (error) {
      logger.error("Auto-logout failed", {
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        operation: "user.auto-logout",
      });
      // Even if there's an error, try to redirect user
      const params = new URLSearchParams({
        status: "error",
        message: "Zostałeś automatycznie wylogowany z powodu nieaktywności.",
      });
      window.location.assign(`/login?${params.toString()}`);
    }
  };

  useActivityTracker(handleLogout);

  // This component doesn't render anything
  return null;
}

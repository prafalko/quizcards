import { useEffect, useRef } from "react";
import {
  updateLastActivity,
  shouldLogoutDueToInactivity,
  clearActivity,
  getInactivityTimeout,
} from "../../lib/activity-tracker";

/**
 * Hook to track user activity and automatically logout after inactivity
 *
 * @param onLogout - Callback function to execute when user should be logged out
 * @param checkInterval - How often to check for inactivity (default: 1 minute)
 */
export function useActivityTracker(
  onLogout: () => void,
  checkInterval: number = 60 * 1000 // Check every minute
): void {
  const logoutCallbackRef = useRef(onLogout);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update callback ref when it changes
  useEffect(() => {
    logoutCallbackRef.current = onLogout;
  }, [onLogout]);

  useEffect(() => {
    // Initialize activity tracking on mount
    updateLastActivity();

    // Set up event listeners for user activity
    const activityEvents: (keyof WindowEventMap)[] = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    const handleActivity = () => {
      updateLastActivity();
    };

    // Add event listeners with throttling to avoid excessive updates
    let throttleTimeout: NodeJS.Timeout | null = null;
    const throttledHandleActivity = () => {
      if (throttleTimeout) return;

      throttleTimeout = setTimeout(() => {
        handleActivity();
        throttleTimeout = null;
      }, 1000); // Throttle to once per second
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, throttledHandleActivity, { passive: true });
    });

    // Check for inactivity periodically
    const checkInactivity = () => {
      if (shouldLogoutDueToInactivity()) {
        clearActivity();
        logoutCallbackRef.current();
      }
    };

    // Initial check
    checkInactivity();

    // Set up interval to check for inactivity
    checkIntervalRef.current = setInterval(checkInactivity, checkInterval);

    // Cleanup function
    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, throttledHandleActivity);
      });

      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }

      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [checkInterval]);

  // Handle visibility change (when user switches tabs/windows)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // User returned to the tab, check if they should be logged out
        if (shouldLogoutDueToInactivity()) {
          clearActivity();
          logoutCallbackRef.current();
        } else {
          // Update activity when user returns
          updateLastActivity();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Handle page unload to save activity
  useEffect(() => {
    const handleBeforeUnload = () => {
      updateLastActivity();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
}

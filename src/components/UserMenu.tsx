import { useState } from "react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { logger } from "../lib/services/logger.service";
import { clearActivity } from "../lib/activity-tracker";

interface UserMenuProps {
  userEmail: string | null;
}

export function UserMenu({ userEmail }: UserMenuProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Nie udało się wylogować");
      }

      // Clear activity tracking on logout
      clearActivity();

      // Przekieruj do strony logowania po pomyślnym wylogowaniu
      window.location.assign("/login");
    } catch (error) {
      logger.error("Logout failed", {
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        operation: "user.logout",
      });
      setIsLoggingOut(false);
      // Clear activity tracking even on error
      clearActivity();
      // Nawet jeśli wystąpi błąd, spróbuj przekierować użytkownika
      window.location.assign("/login");
    }
  };

  const getInitials = (email: string | null): string => {
    if (!email) return "U";
    const parts = email.split("@");
    if (parts[0].length > 0) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Avatar className="size-8">
          <AvatarFallback className="text-xs font-medium">{getInitials(userEmail)}</AvatarFallback>
        </Avatar>
        {userEmail && <span className="text-sm text-muted-foreground hidden sm:inline">{userEmail}</span>}
      </div>
      <Button variant="outline" size="default" onClick={handleLogout} disabled={isLoggingOut} aria-label="Wyloguj">
        {isLoggingOut ? "Wylogowywanie..." : "Wyloguj"}
      </Button>
    </div>
  );
}

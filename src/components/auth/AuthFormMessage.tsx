import { cn } from "@/lib/utils";

export type AuthFormStatus = "idle" | "success" | "error";

interface AuthFormMessageProps {
  status: AuthFormStatus;
  message?: string;
}

export function AuthFormMessage({ status, message }: AuthFormMessageProps) {
  if (status === "idle" || !message) {
    return null;
  }

  const variant =
    status === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-50"
      : "border-destructive/40 bg-destructive/10 text-destructive dark:border-destructive/30 dark:bg-destructive/15";

  return (
    <p role="status" aria-live="polite" className={cn("rounded-md border px-3 py-2 text-sm", variant)}>
      {message}
    </p>
  );
}

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { AuthFormMessage, type AuthFormStatus } from "./AuthFormMessage";

interface LoginFormProps {
  initialStatus?: AuthFormStatus;
  initialMessage?: string;
}

const loginSchema = z.object({
  email: z.string({ required_error: "Adres e-mail jest wymagany" }).email("Podaj poprawny adres e-mail"),
  password: z.string({ required_error: "Hasło jest wymagane" }).min(1, "Hasło jest wymagane"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm({ initialStatus = "idle", initialMessage }: LoginFormProps) {
  const [status, setStatus] = useState<AuthFormStatus>(initialStatus);
  const [message, setMessage] = useState<string | undefined>(initialMessage);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setStatus("idle");
    setMessage(undefined);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
        credentials: "include",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setStatus("error");
        setMessage(payload?.error ?? "Nieprawidłowy e-mail lub hasło.");
        return;
      }

      setStatus("success");
      setMessage("Zalogowano pomyślnie. Przekierowuję...");
      setTimeout(() => {
        window.location.assign("/");
      }, 800);
    } catch {
      setStatus("error");
      setMessage("Ups! Nie udało się połączyć z serwerem. Spróbuj ponownie.");
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-semibold">Witaj ponownie</CardTitle>
        <CardDescription>Wprowadź dane logowania, aby przejść do panelu quizów.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="login-email" className="text-sm font-medium text-foreground">
              Adres e-mail
            </label>
            <Input
              id="login-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <p id="login-email-error" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="login-password" className="text-sm font-medium text-foreground">
              Hasło
            </label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="********"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "login-password-error" : undefined}
              {...register("password")}
            />
            {errors.password && (
              <p id="login-password-error" className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <AuthFormMessage status={status} message={message} />
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? "Logowanie..." : "Zaloguj się"}
          </Button>
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>
              Nie masz konta?{" "}
              <a href="/register" className="text-primary font-medium hover:underline">
                Załóż je teraz
              </a>
            </p>
            <p>
              Zapomniałeś hasła?{" "}
              <a href="/recover" className="text-primary font-medium hover:underline">
                Odzyskaj dostęp
              </a>
            </p>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

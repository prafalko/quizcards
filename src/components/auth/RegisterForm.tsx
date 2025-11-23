import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { AuthFormMessage, type AuthFormStatus } from "./AuthFormMessage";

const registerSchema = z
  .object({
    email: z.string({ required_error: "Adres e-mail jest wymagany" }).email("Podaj poprawny adres e-mail"),
    password: z
      .string({ required_error: "Hasło jest wymagane" })
      .min(8, "Hasło musi mieć co najmniej 8 znaków")
      .regex(/[0-9]/, "Hasło musi zawierać cyfrę")
      .regex(/[A-Z]/, "Hasło musi zawierać wielką literę"),
    confirmPassword: z.string({ required_error: "Potwierdź hasło" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const [status, setStatus] = useState<AuthFormStatus>("idle");
  const [message, setMessage] = useState<string>();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setStatus("idle");
    setMessage(undefined);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
        credentials: "include",
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setStatus("error");
        setMessage(payload?.error ?? "Nie udało się utworzyć konta. Spróbuj ponownie.");
        return;
      }

      if (payload?.requiresConfirmation) {
        setStatus("success");
        setMessage(
          payload.message ??
            "Konto zostało utworzone. Sprawdź swoją skrzynkę e-mail i kliknij link weryfikacyjny, aby aktywować konto."
        );
      } else {
        // Email confirmation disabled - user is automatically logged in
        setStatus("success");
        setMessage("Konto zostało utworzone. Przekierowuję...");
        setTimeout(() => {
          window.location.assign("/");
        }, 800);
      }
    } catch {
      setStatus("error");
      setMessage("Ups! Nie udało się połączyć z serwerem. Spróbuj ponownie.");
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-semibold">Załóż konto</CardTitle>
        <CardDescription>Utwórz darmowe konto i twórz własne zestawy quizów.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="register-email" className="text-sm font-medium text-foreground">
              Adres e-mail
            </label>
            <Input
              id="register-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="emily@example.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "register-email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <p id="register-email-error" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="register-password" className="text-sm font-medium text-foreground">
              Hasło
            </label>
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              placeholder="********"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "register-password-error" : "register-password-hint"}
              {...register("password")}
            />
            {errors.password ? (
              <p id="register-password-error" className="text-sm text-destructive">
                {errors.password.message}
              </p>
            ) : (
              <p id="register-password-hint" className="text-xs text-muted-foreground">
                Minimum 8 znaków, jedna wielka litera oraz jedna cyfra.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="register-confirm" className="text-sm font-medium text-foreground">
              Potwierdź hasło
            </label>
            <Input
              id="register-confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Powtórz hasło"
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={errors.confirmPassword ? "register-confirm-error" : undefined}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p id="register-confirm-error" className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <AuthFormMessage status={status} message={message} />
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? "Zakładanie konta..." : "Utwórz konto"}
          </Button>
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>
              Masz już konto?{" "}
              <a href="/login" className="text-primary font-medium hover:underline">
                Zaloguj się
              </a>
            </p>
            <p>
              Potrzebujesz pomocy?{" "}
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

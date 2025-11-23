import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { AuthFormMessage, type AuthFormStatus } from "./AuthFormMessage";

const recoverSchema = z.object({
  email: z.string({ required_error: "Adres e-mail jest wymagany" }).email("Podaj poprawny adres e-mail"),
});

type RecoverFormValues = z.infer<typeof recoverSchema>;

export function RecoverAccountForm() {
  const [status, setStatus] = useState<AuthFormStatus>("idle");
  const [message, setMessage] = useState<string>();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecoverFormValues>({
    resolver: zodResolver(recoverSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: RecoverFormValues) => {
    setStatus("idle");
    setMessage(undefined);

    await new Promise((resolve) => setTimeout(resolve, 700));
    setStatus("success");
    setMessage(`Jeśli konto ${values.email} istnieje, wkrótce otrzymasz e-mail z instrukcją resetu hasła.`);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-semibold">Odzyskaj konto</CardTitle>
        <CardDescription>Podaj adres e-mail, a wyślemy link do zresetowania hasła.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="recover-email" className="text-sm font-medium text-foreground">
              Adres e-mail
            </label>
            <Input
              id="recover-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="ola@quizcards.app"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "recover-email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <p id="recover-email-error" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <AuthFormMessage status={status} message={message} />

          <ul className="text-xs text-muted-foreground space-y-1 rounded-lg border border-dashed border-border/60 bg-muted/30 p-3">
            <li>- Sprawdź folder spam, jeśli wiadomość nie dotrze w kilka minut.</li>
            <li>- Masz dostęp SSO? Spróbuj zalogować się standardowo.</li>
          </ul>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? "Wysyłanie..." : "Wyślij instrukcję"}
          </Button>
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>
              Jednak pamiętasz hasło?{" "}
              <a href="/login" className="text-primary font-medium hover:underline">
                Wróć do logowania
              </a>
            </p>
            <p>
              Nie masz jeszcze konta?{" "}
              <a href="/register" className="text-primary font-medium hover:underline">
                Załóż je w minutę
              </a>
            </p>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

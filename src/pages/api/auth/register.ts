import type { APIRoute } from "astro";
import { z } from "zod";

import { createSupabaseServerInstance } from "@/db/supabase.client";

const registerSchema = z.object({
  email: z.string({ required_error: "Adres e-mail jest wymagany." }).email("Adres e-mail jest nieprawidłowy."),
  password: z
    .string({ required_error: "Hasło jest wymagane." })
    .min(8, "Hasło musi mieć co najmniej 8 znaków.")
    .regex(/[0-9]/, "Hasło musi zawierać cyfrę.")
    .regex(/[A-Z]/, "Hasło musi zawierać wielką literę."),
});

const jsonHeaders = {
  "Content-Type": "application/json",
};

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  let payload: z.infer<typeof registerSchema>;

  try {
    payload = registerSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return new Response(
        JSON.stringify({
          error: firstError?.message ?? "Podaj poprawny adres e-mail oraz hasło spełniające wymagania.",
        }),
        { status: 400, headers: jsonHeaders }
      );
    }
    return new Response(
      JSON.stringify({
        error: "Podaj poprawny adres e-mail oraz hasło spełniające wymagania.",
      }),
      { status: 400, headers: jsonHeaders }
    );
  }

  const supabase = createSupabaseServerInstance({
    headers: request.headers,
    cookies,
  });

  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
  });

  if (error) {
    return new Response(
      JSON.stringify({
        error:
          error.message === "User already registered"
            ? "Użytkownik o podanym adresie e-mail już istnieje."
            : "Nie udało się utworzyć konta. Spróbuj ponownie.",
      }),
      { status: 400, headers: jsonHeaders }
    );
  }

  // Supabase sends confirmation email if email confirmation is enabled
  // In that case, user.session will be null
  if (!data.session) {
    return new Response(
      JSON.stringify({
        success: true,
        requiresConfirmation: true,
        message:
          "Konto zostało utworzone. Sprawdź swoją skrzynkę e-mail i kliknij link weryfikacyjny, aby aktywować konto.",
      }),
      { status: 200, headers: jsonHeaders }
    );
  }

  // If email confirmation is disabled, user is automatically logged in
  if (!data.user) {
    return new Response(
      JSON.stringify({
        error: "Nie udało się utworzyć konta. Spróbuj ponownie.",
      }),
      { status: 500, headers: jsonHeaders }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      requiresConfirmation: false,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    }),
    { status: 200, headers: jsonHeaders }
  );
};

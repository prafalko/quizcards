import type { APIRoute } from "astro";
import { z } from "zod";

import { createSupabaseServerInstance } from "@/db/supabase.client";

const loginSchema = z.object({
  email: z.string({ required_error: "Adres e-mail jest wymagany." }).email("Adres e-mail jest nieprawidłowy."),
  password: z.string({ required_error: "Hasło jest wymagane." }).min(1, "Hasło jest wymagane."),
});

const jsonHeaders = {
  "Content-Type": "application/json",
};

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  let payload: z.infer<typeof loginSchema>;

  try {
    payload = loginSchema.parse(await request.json());
  } catch {
    return new Response(
      JSON.stringify({
        error: "Podaj poprawny adres e-mail oraz hasło.",
      }),
      { status: 400, headers: jsonHeaders }
    );
  }

  const supabase = createSupabaseServerInstance({
    headers: request.headers,
    cookies,
  });

  const { data, error } = await supabase.auth.signInWithPassword(payload);

  if (error || !data.session) {
    return new Response(
      JSON.stringify({
        error: "Nieprawidłowy e-mail lub hasło.",
      }),
      { status: 401, headers: jsonHeaders }
    );
  }

  return new Response(
    JSON.stringify({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    }),
    { status: 200, headers: jsonHeaders }
  );
};

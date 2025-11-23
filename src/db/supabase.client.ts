import type { AstroCookies } from "astro";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";

import type { Database } from "../db/database.types.ts";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

// Global Supabase client for server-side operations without session context
// WARNING: Only use this in non-authenticated contexts (e.g., public endpoints)
// For authenticated API routes, always use the request-specific client from apiContext.locals.supabase
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Type export for use in dependency injection
export type SupabaseClient = ReturnType<typeof createServerClient<Database>>;

export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  // Set secure to true only in production (HTTPS), false in development (HTTP localhost)
  // In development, secure: true would prevent cookies from being set over HTTP
  secure: import.meta.env.PROD,
  httpOnly: true,
  sameSite: "lax",
};

function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader) {
    return [];
  }

  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

export const createSupabaseServerInstance = (context: { headers: Headers; cookies: AstroCookies }) => {
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          context.cookies.set(name, value, options);
        });
      },
    },
  });
};

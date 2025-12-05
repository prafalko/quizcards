import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client.ts";

// Public paths - Auth pages & Auth API endpoints
// These routes are accessible without authentication
const PUBLIC_PATHS = [
  // Auth pages
  "/login",
  "/register",
  "/recover",
  // Auth API endpoints
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
];

// Routes that should only be accessible to authenticated users
// If an authenticated user tries to access these, redirect to dashboard
const AUTH_ONLY_ROUTES = ["/login", "/register", "/recover"];

const isPublicPath = (pathname: string): boolean => {
  return PUBLIC_PATHS.includes(pathname);
};

export const onRequest = defineMiddleware(async ({ locals, cookies, request, url, redirect }, next) => {
  const pathname = url.pathname;

  // Skip auth check for public paths
  if (isPublicPath(pathname)) {
    return next();
  }

  // Create Supabase instance for authenticated routes
  const supabase = createSupabaseServerInstance({
    headers: request.headers,
    cookies,
  });

  // Store Supabase instance in locals for use in API routes
  locals.supabase = supabase;

  // IMPORTANT: Always get user session first before any other operations
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    locals.user = {
      email: user.email ?? null,
      id: user.id,
    };
  } else {
    // User is not authenticated and trying to access protected route
    // Redirect to login with error message
    const params = new URLSearchParams({
      status: "error",
      message: "Musisz być zalogowany, aby uzyskać dostęp do tej strony.",
    });
    return redirect(`/login?${params.toString()}`);
  }

  // If authenticated user tries to access auth-only routes (login/register/recover),
  // redirect them to dashboard
  if (AUTH_ONLY_ROUTES.includes(pathname)) {
    return redirect("/");
  }

  return next();
});

import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client.ts";

const PUBLIC_ROUTES = ["/login", "/register", "/recover"];
const PUBLIC_API_PREFIXES = ["/api/auth/"];

const isPublicRoute = (pathname: string) =>
  PUBLIC_ROUTES.includes(pathname) || PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const AUTH_ONLY_ROUTES = ["/login", "/register", "/recover"];

export const onRequest = defineMiddleware(async ({ locals, cookies, request, url, redirect }, next) => {
  const supabase = createSupabaseServerInstance({
    headers: request.headers,
    cookies,
  });

  locals.supabase = supabase;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    locals.user = {
      email: user.email ?? null,
      id: user.id,
    };
  }

  const pathname = url.pathname;
  const userIsAuthenticated = Boolean(locals.user);

  if (!userIsAuthenticated && !isPublicRoute(pathname)) {
    const params = new URLSearchParams({
      status: "error",
      message: "Twoja sesja wygasła. Zaloguj się ponownie.",
    });
    return redirect(`/login?${params.toString()}`);
  }

  if (userIsAuthenticated && AUTH_ONLY_ROUTES.includes(pathname)) {
    return redirect("/");
  }

  return next();
});

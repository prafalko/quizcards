/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./db/database.types.ts";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly SUPABASE_DEFAULT_USER_ID: string;
  readonly GEMINI_API_KEY: string;
  readonly QUIZLET_COOKIE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

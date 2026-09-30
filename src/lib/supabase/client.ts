"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./config";

/**
 * Browser-side Supabase client. Safe to use in Client Components — it only
 * ever holds the anon key, so every read it makes is filtered by RLS.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}

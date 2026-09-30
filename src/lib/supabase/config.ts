/**
 * Shared Supabase env plumbing.
 *
 * The owner provisions the Supabase project manually, so these values may be
 * missing on a fresh checkout. Client construction must never throw at
 * module-eval time (it would break `next build`), so we fall back to inert
 * placeholders and expose `isSupabaseConfigured` for pages/routes to show a
 * calm "not configured yet" state instead of a stack trace.
 */

const PLACEHOLDER_URL = "http://127.0.0.1:54321";
const PLACEHOLDER_KEY = "placeholder-anon-key";

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL;
}

export function supabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY;
}

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

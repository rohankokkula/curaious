import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./config";

/**
 * ⚠️  SERVICE-ROLE CLIENT — BYPASSES ROW LEVEL SECURITY ENTIRELY.
 *
 * NEVER import this module from a Client Component, or from any module that a
 * Client Component imports. It must only ever be used inside `route.ts` files
 * (Route Handlers) running on the server. Leaking SUPABASE_SERVICE_ROLE_KEY to
 * the browser would hand every visitor full read/write on the database.
 *
 * Use it only where a business rule needs to be enforced above RLS: the
 * invite-gated login check, claiming a slot, approving/rejecting a talk,
 * anonymized rating aggregation, and signed deck URLs.
 */

export const DECKS_BUCKET =
  process.env.SUPABASE_STORAGE_DECKS_BUCKET || "decks";

export const hasServiceRoleKey = Boolean(
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export function createSupabaseAdminClient() {
  return createClient(
    supabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

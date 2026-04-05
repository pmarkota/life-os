import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client using the service role key.
 * This bypasses RLS and is used exclusively by MCP tool handlers,
 * where requests come from Claude (bearer token auth) rather than
 * a browser session with cookies.
 *
 * NEVER expose this client to the frontend.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars"
    );
  }

  return createClient(url, key);
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    // Helpful runtime diagnostic when env vars are missing or malformed
    // (e.g. leading space in .env caused the key to be invalid)
    // Keep the message generic to avoid printing secrets.
    // Restart the dev server after fixing .env so Next picks up changes.
    // See .env for NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
    // Example: NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx (no surrounding spaces)
    // eslint-disable-next-line no-console
    console.error("[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY (check .env)");
    return null;
  }
  if (!browserClient) {
    // Create and log a non-sensitive diagnostic so we can confirm client initialization
    // without printing secrets. This helps diagnose missing 'apikey' header issues.
    // eslint-disable-next-line no-console
    console.debug("[supabase] creating browser client (url present, anon key present)");
    browserClient = createClient(url, key);
  }
  return browserClient;
}

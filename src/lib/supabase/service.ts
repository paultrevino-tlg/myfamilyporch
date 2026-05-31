// SERVICE-ROLE client. Bypasses RLS. SERVER-ONLY.
// Never import this into a client component or expose the key to the browser.
// Used by api/storyteller/* (after validating a storyteller token) and by cron.
import { createClient } from "@supabase/supabase-js";

export function supabaseService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

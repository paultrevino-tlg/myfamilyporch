// The member's own name (auth user_metadata.full_name). It signs the texts the
// storyteller receives ("Hi Dad, it's Paul"), so it is asked for, never guessed
// from the email address.
import type { SupabaseClient, User } from "@supabase/supabase-js";

const MAX_NAME = 40;

// Trim, collapse inner whitespace, drop control characters; null if empty.
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME)
    .trim();
  return name || null;
}

export function myName(user: User | null): string {
  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  return cleanName(meta?.full_name) ?? "";
}

// Save the signed-in member's name to their own auth profile. Pass the caller's
// SSR client — updateUser only ever touches the session's own user.
export async function saveMyName(
  sb: Pick<SupabaseClient, "auth">,
  raw: unknown,
): Promise<boolean> {
  const full_name = cleanName(raw);
  if (!full_name) return false;
  const { error } = await sb.auth.updateUser({ data: { full_name } });
  if (error) throw error;
  return true;
}

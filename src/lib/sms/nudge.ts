// Storyteller SMS nudge (TODO 4.3). Composes the localized "tap here to tell me
// a story" text in the storyteller's language, attaches a working magic-link
// deep link, and sends it via Twilio. SERVER-ONLY (service role + app secret).
//
// This is the reusable unit: the weekly cron (TODO 6.1) and the Schedule
// "ask now" control (TODO 5.4) both call sendStorytellerNudge. The send itself
// fails soft — no phone, no Twilio config, or no token secret → it records why
// and returns rather than throwing, so a scheduler loop never dies on one row.
import { supabaseService } from "@/lib/supabase/service";
import { decryptToken } from "@/lib/storyteller/crypto";
import { mintStorytellerToken } from "@/lib/storyteller/token";
import { sendSms } from "@/lib/sms/twilio";
import { t, type Lang } from "@/lib/i18n";

export type NudgeResult =
  | { status: "sent" }
  | { status: "skipped"; reason: "no-phone" | "no-link" };

// Build the SMS body: the localized line + the deep link on its own line. The
// URL is appended (never interpolated into the translated string) so it can't
// be mangled by token substitution. Drops the "it's {interviewer}" clause when
// no interviewer name resolved.
export function buildNudge(
  lang: Lang,
  vars: { address: string; interviewer?: string; url: string },
): string {
  const key = vars.interviewer ? "sms_nudge" : "sms_nudge_no_interviewer";
  const line = t(lang, key, {
    address: vars.address,
    interviewer: vars.interviewer ?? "",
  });
  return `${line}\n${vars.url}`;
}

// Resolve the interviewer's display name from auth metadata (full_name / name,
// else the email local-part). Falls back to the relationship's asker_relation
// ("your son"), else undefined → the no-interviewer copy is used.
async function resolveInterviewerName(
  db: ReturnType<typeof supabaseService>,
  userId: string | null,
  askerRelation: string | null,
): Promise<string | undefined> {
  if (userId) {
    const { data } = await db.auth.admin.getUserById(userId);
    const meta = data?.user?.user_metadata as Record<string, unknown> | undefined;
    const metaName =
      (typeof meta?.full_name === "string" && meta.full_name) ||
      (typeof meta?.name === "string" && meta.name) ||
      "";
    if (metaName.trim()) return metaName.trim().split(/\s+/)[0]; // first name
    const email = data?.user?.email ?? "";
    if (email.includes("@")) return email.split("@")[0];
  }
  return askerRelation?.trim() || undefined;
}

// Resolve a usable /s/<token> deep link for a storyteller: reuse the newest
// un-revoked, re-displayable token, else mint a fresh one. Returns null only if
// the token secret is unset (mint fails closed).
async function resolveDeepLink(
  db: ReturnType<typeof supabaseService>,
  storytellerId: string,
  familyId: string,
): Promise<string | null> {
  const base = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");

  const { data: rows } = await db
    .from("storyteller_tokens")
    .select("token_enc")
    .eq("storyteller_id", storytellerId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  for (const r of rows ?? []) {
    if (!r.token_enc) continue;
    const raw = await decryptToken(r.token_enc);
    if (raw) return `${base}/s/${raw}`;
  }

  // No re-displayable active link (none minted, or legacy rows only) → mint one.
  const raw = await mintStorytellerToken(storytellerId, familyId);
  if (!raw) return null;
  return `${base}/s/${raw}`;
}

// Send a localized story nudge to one storyteller. Caller is responsible for
// authorizing the request (admin of the owning family) before calling.
export async function sendStorytellerNudge(
  storytellerId: string,
  familyId: string,
): Promise<NudgeResult> {
  const db = supabaseService();

  const { data: st } = await db
    .from("storytellers")
    .select("name, language, phone")
    .eq("id", storytellerId)
    .eq("family_id", familyId)
    .maybeSingle();
  if (!st?.phone?.trim()) return { status: "skipped", reason: "no-phone" };

  const lang: Lang = st.language === "es" ? "es" : "en";

  // Interviewer edge → address term + who the text is from. Prefer the member
  // flagged as interviewer; otherwise any relationship row (mirrors assembly).
  const { data: rels } = await db
    .from("storyteller_relationships")
    .select("address_term, asker_relation, user_id, is_interviewer")
    .eq("storyteller_id", storytellerId)
    .order("is_interviewer", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1);
  const rel = rels?.[0] ?? null;

  const address = (rel?.address_term ?? st.name) || st.name;
  const interviewer = await resolveInterviewerName(
    db,
    rel?.user_id ?? null,
    rel?.asker_relation ?? null,
  );

  const url = await resolveDeepLink(db, storytellerId, familyId);
  if (!url) return { status: "skipped", reason: "no-link" };

  const body = buildNudge(lang, { address, interviewer, url });
  await sendSms(st.phone.trim(), body);
  return { status: "sent" };
}

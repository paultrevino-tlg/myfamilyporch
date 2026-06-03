"use server";

// Schedule actions (TODO 5.4). Admin-only; RLS (sch_write = admin) is the real
// boundary. saveSchedule upserts the one-per-storyteller schedule row; askNow
// reuses the 4.3 nudge unit to send a story prompt right away. The weekly cron
// (TODO 6.1) consumes the same rows.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import { sendStorytellerNudge } from "@/lib/sms/nudge";
import { DAY_CODES, type DayCode } from "@/lib/schedule";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// "HH:MM" → "HH:MM" if valid, else the fallback. Postgres `time` accepts it.
function cleanTime(raw: string, fallback: string): string {
  return HHMM_RE.test(raw) ? raw : fallback;
}

export async function saveSchedule(formData: FormData) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;

  const storytellerId = String(formData.get("storyteller_id") ?? "");
  if (!UUID_RE.test(storytellerId)) return;

  const sb = await supabaseServer();
  // Confirm the storyteller is in the active family before writing (RLS would
  // also refuse, but fail fast and clearly).
  const { data: st } = await sb
    .from("storytellers")
    .select("id")
    .eq("id", storytellerId)
    .eq("family_id", active.family_id)
    .maybeSingle();
  if (!st) return;

  // Days: keep only recognized codes, in canonical Sun→Sat order.
  const picked = new Set(formData.getAll("days").map(String));
  const days: DayCode[] = DAY_CODES.filter((d) => picked.has(d));

  const sendTimeLocal = cleanTime(String(formData.get("send_time_local") ?? ""), "10:00");

  const quietRaw = String(formData.get("quiet_after") ?? "").trim();
  const quietAfter = HHMM_RE.test(quietRaw) ? quietRaw : null; // blank = no cutoff

  const qpRaw = Number(formData.get("questions_per"));
  const questionsPer = qpRaw === 1 ? 1 : 2; // kept to 1–2 per the prototype

  const paused = formData.get("paused") != null;

  await sb.from("schedules").upsert(
    {
      family_id: active.family_id,
      storyteller_id: storytellerId,
      days_of_week: days,
      send_time_local: sendTimeLocal,
      questions_per: questionsPer,
      quiet_after: quietAfter,
      paused,
    },
    { onConflict: "storyteller_id" },
  );

  revalidatePath("/schedule");
  redirect("/schedule?saved=1");
}

// "Ask now" — send a story nudge immediately, reusing the 4.3 unit. Same
// authorize-then-send pattern as the Storytellers "Send a nudge" button.
export async function askNow(formData: FormData) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;

  const storytellerId = String(formData.get("storyteller_id") ?? "");
  if (!UUID_RE.test(storytellerId)) return;

  const sb = await supabaseServer();
  const { data: st } = await sb
    .from("storytellers")
    .select("id")
    .eq("id", storytellerId)
    .eq("family_id", active.family_id)
    .maybeSingle();
  if (!st) return; // not visible to this admin → refuse

  let flag = "asked";
  try {
    const result = await sendStorytellerNudge(storytellerId, active.family_id);
    flag = result.status === "sent" ? "asked" : `asked_${result.reason}`;
  } catch (e) {
    console.error("[schedule/askNow] send failed", e);
    flag = "asked_failed";
  }

  revalidatePath("/schedule");
  redirect(`/schedule?sent=${flag}`);
}

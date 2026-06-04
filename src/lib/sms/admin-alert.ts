// Best-effort SMS to a family's admins (TODO 6.x signals). SERVER-ONLY.
//
// Resolves every owner/admin in the family who set a failure-alert number in
// Settings (memberships.alert_phone, TODO 5.5), dedupes, and texts each. Fully
// fail-soft: any send error is swallowed so the caller's primary work (recording
// a signal, running the cron) never depends on delivery. Shared by the mic-failed
// route (2.4/5.5) and the schedule-suggestion / engagement-drop signals (6.3/6.4).
import type { supabaseService } from "@/lib/supabase/service";
import { sendSms } from "@/lib/sms/twilio";

export async function alertFamilyAdmins(
  db: ReturnType<typeof supabaseService>,
  familyId: string,
  message: string,
): Promise<void> {
  try {
    const { data: admins } = await db
      .from("memberships")
      .select("alert_phone, role")
      .eq("family_id", familyId)
      .in("role", ["owner", "admin"])
      .not("alert_phone", "is", null);

    const numbers = Array.from(
      new Set(
        (admins ?? [])
          .map((m) => m.alert_phone?.trim())
          .filter((p): p is string => !!p),
      ),
    );

    await Promise.all(
      numbers.map((to) =>
        sendSms(to, message).catch((e) =>
          console.error("[admin-alert] SMS failed", e),
        ),
      ),
    );
  } catch (e) {
    console.error("[admin-alert] lookup failed", e);
  }
}

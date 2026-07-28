// Best-effort SMS to a family's admins (TODO 6.x signals). SERVER-ONLY.
//
// Resolves every owner/admin in the family who asked for failure alerts
// (memberships.alert_on_failure, migration 0016) and texts their ONE consented
// number (memberships.sms_phone). Fully fail-soft: any send error is swallowed
// so the caller's primary work (recording a signal, running the cron) never
// depends on delivery. Shared by the mic-failed route (2.4/5.5) and the
// schedule-suggestion / engagement-drop signals (6.3/6.4).
//
// Every send goes through the universal pre-send gate. Before 0016 this path
// read a second, ungated `alert_phone` column and would happily text someone who
// had already replied STOP — the exact carrier opt-out violation that can cost
// an approved A2P campaign.
import type { supabaseService } from "@/lib/supabase/service";
import { sendSms } from "@/lib/sms/twilio";
import { preSendGate } from "./gate";

export async function alertFamilyAdmins(
  db: ReturnType<typeof supabaseService>,
  familyId: string,
  message: string,
): Promise<void> {
  try {
    const { data: admins } = await db
      .from("memberships")
      .select("sms_phone, consent_state, role")
      .eq("family_id", familyId)
      .in("role", ["owner", "admin"])
      .eq("alert_on_failure", true)
      .not("sms_phone", "is", null);

    // A2P 10DLC: every recurring message carries opt-out language (matches the
    // registered campaign's admin-alert sample). Admin alerts are English-only
    // today — the dashboard surface they mirror is too.
    const body = `${message}\nReply STOP to opt out`;

    // Gate per recipient, then dedupe: one number can back admins in more than
    // one family, and we must not text the same handset twice for one event.
    const sendable = new Set<string>();
    for (const m of admins ?? []) {
      const phone = m.sms_phone?.trim();
      if (!phone) continue;
      const gate = await preSendGate(db, { consentState: m.consent_state, phone });
      if (!gate.ok) {
        console.warn(`[admin-alert] skipping send — ${gate.reason}`);
        continue;
      }
      sendable.add(phone);
    }

    await Promise.all(
      Array.from(sendable).map((to) =>
        sendSms(to, body).catch((e) =>
          console.error("[admin-alert] SMS failed", e),
        ),
      ),
    );
  } catch (e) {
    console.error("[admin-alert] lookup failed", e);
  }
}

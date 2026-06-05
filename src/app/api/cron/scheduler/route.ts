import { NextResponse } from "next/server";
import { runScheduler } from "@/lib/scheduler/run";
import { runScheduleSuggestions } from "@/lib/signals/schedule-suggestion";
import { runEngagementDrop } from "@/lib/signals/engagement-drop";
import { runExportMaintenance } from "@/lib/export/run";

// Weekly cron Worker entrypoint (TODO 6.1). The Cloudflare cron trigger only
// invokes scheduled() (see worker.ts), which fires one in-process call here with
// the shared CRON_SECRET in x-cron-secret. Keeping the work in this route means
// it runs inside the normal Next runtime (env + libs intact) and stays callable
// by hand for testing. Sends the story nudges due now in each storyteller's
// timezone, then computes the throttled schedule-suggestion (TODO 6.3) and
// engaging-less (TODO 6.4) signals, then backstops the async export jobs
// (TODO 7.6 — finish queued/stuck jobs + clean up expired ZIPs).
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const presented = req.headers.get("x-cron-secret");
  // Fail closed: no secret configured, or a mismatch → refuse rather than run open.
  if (!secret || presented !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const nudges = await runScheduler();
  const suggestions = await runScheduleSuggestions();
  const drops = await runEngagementDrop();
  // Backstop the async export jobs (TODO 7.6): finish any queued/stuck job and
  // clean up expired ZIPs.
  const exports = await runExportMaintenance();
  return NextResponse.json({ ok: true, nudges, suggestions, drops, exports });
}

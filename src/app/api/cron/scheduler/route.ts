import { NextResponse } from "next/server";
import { runScheduler } from "@/lib/scheduler/run";
import { runScheduleSuggestions } from "@/lib/signals/schedule-suggestion";

// Weekly cron Worker entrypoint (TODO 6.1). The Cloudflare cron trigger only
// invokes scheduled() (see worker.ts), which fires one in-process call here with
// the shared CRON_SECRET in x-cron-secret. Keeping the work in this route means
// it runs inside the normal Next runtime (env + libs intact) and stays callable
// by hand for testing. Sends the story nudges due now in each storyteller's
// timezone, then computes the throttled schedule-suggestion signal (TODO 6.3).
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
  return NextResponse.json({ ok: true, nudges, suggestions });
}

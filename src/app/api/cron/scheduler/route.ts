import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

// Weekly Cloudflare cron Worker. Sends nudges and runs the three signals:
//  - mic-failed (surfaced from the storyteller app),
//  - schedule suggestion (engages at a different hour),
//  - engaging-less (sustained drop vs personal baseline).
// Plain arithmetic over session events; throttled; pause-aware. TODO Phase 6.
export async function POST() {
  const _db = supabaseService();
  // TODO 6.1: due nudges. 6.3/6.4: compute signals, write insights, send SMS.
  return NextResponse.json({ ok: false, todo: "scheduler" }, { status: 501 });
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Admin/cron-driven session lifecycle. RLS via the member's session.
export async function POST(_req: NextRequest) {
  const _sb = await supabaseServer();
  // TODO 2/6: create or advance a session for a storyteller.
  return NextResponse.json({ ok: false, todo: "sessions" }, { status: 501 });
}

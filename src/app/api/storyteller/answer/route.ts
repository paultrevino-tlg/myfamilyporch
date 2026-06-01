import { NextRequest, NextResponse } from "next/server";
import { validateStorytellerToken } from "@/lib/storyteller/token";

// Storyteller writes. Validate the magic-link token, THEN write via service role.
// This is the only place storyteller data is written. No Supabase Auth here.
export async function POST(req: NextRequest) {
  const { token, ...payload } = await req.json();

  // The token resolves the storyteller + family this request may write to.
  const session = await validateStorytellerToken(String(token ?? ""));
  if (!session) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  // TODO 2.5: insert into answers (audio_path, transcript, ...) scoped to
  // session.storyteller_id / session.family_id via the service role.
  void payload;
  return NextResponse.json({ ok: false, todo: "storyteller answer" }, { status: 501 });
}

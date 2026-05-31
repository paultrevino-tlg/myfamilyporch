import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

// Storyteller writes. Validate the magic-link token, THEN write via service role.
// This is the only place storyteller data is written. No Supabase Auth here.
export async function POST(req: NextRequest) {
  const { token, ...payload } = await req.json();

  // TODO 2.2: validate `token` (HMAC, lookup storyteller_tokens.token_hash,
  // check not revoked). Reject if invalid.
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 });

  const _db = supabaseService();
  // TODO 2.5: insert into answers (audio_path, transcript, ...) scoped to the
  // storyteller + family resolved from the token.
  void payload;
  return NextResponse.json({ ok: false, todo: "storyteller answer" }, { status: 501 });
}

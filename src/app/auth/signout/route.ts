import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Clears the family member's session and returns to the public site.
// POST-only so a link prefetch can't sign the user out.
export async function POST(req: Request) {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}

import { NextResponse } from "next/server";
import { verifyTwilioRequest } from "@/lib/sms/signature";
import { applyStatus } from "@/lib/sms/outbound";

// Twilio delivery-status callback (TODO 4.5). Each tracked nudge is sent with
// StatusCallback pointing here; Twilio posts queued → sent → delivered (or
// undelivered/failed) and we mirror it onto the sms_outbound row so the
// storyteller page can show whether the request actually arrived.
//
// SERVER-ONLY. No session — authenticity is the X-Twilio-Signature, which fails
// closed. Always answers 200 to a valid request (even for an unknown SID) so
// Twilio doesn't retry something we deliberately ignore.
export const dynamic = "force-dynamic";

const SID_RE = /^(SM|MM)[0-9a-f]{32}$/i;

export async function POST(req: Request) {
  const params = new URLSearchParams(await req.text());
  if (!(await verifyTwilioRequest(req, "/api/sms/status", params))) {
    return NextResponse.json({ ok: false, error: "bad signature" }, { status: 403 });
  }

  const sid = params.get("MessageSid") ?? "";
  const status = (params.get("MessageStatus") ?? "").toLowerCase();
  const code = Number.parseInt(params.get("ErrorCode") ?? "", 10);
  if (SID_RE.test(sid) && status) {
    await applyStatus(sid, status, Number.isFinite(code) ? code : null);
  }
  return new Response(null, { status: 204 });
}

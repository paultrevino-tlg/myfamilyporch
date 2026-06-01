import { NextRequest, NextResponse } from "next/server";
import { validateStorytellerToken } from "@/lib/storyteller/token";
import { supabaseService } from "@/lib/supabase/service";

// Storyteller writes (TODO 2.5). The ONLY place storyteller answers are written.
// Validate the magic-link token, THEN upload the audio + insert the answer row
// via the service role. No Supabase Auth here; family_id/storyteller_id come
// straight from the validated token, never from the client.
//
// Seams kept intact: transcript stays null (STT → 3.4); question_text is the
// asked text the surface showed (real prompt resolution → 3.1/3.2); admin
// playback mints signed URLs after a membership check (→ 5.2).

const BUCKET = "story-audio";

// Map the recorder's content-type to a file extension for the object key.
function extFor(contentType: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("webm")) return "webm";
  if (ct.includes("mp4") || ct.includes("m4a")) return "mp4";
  if (ct.includes("ogg")) return "ogg";
  if (ct.includes("mpeg") || ct.includes("mp3")) return "mp3";
  return "webm";
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "expected multipart form" }, { status: 400 });
  }

  // The token resolves the storyteller + family this request may write to.
  const session = await validateStorytellerToken(String(form.get("token") ?? ""));
  if (!session) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "missing audio" }, { status: 400 });
  }

  const isFollowup = String(form.get("is_followup") ?? "") === "true";
  const isFinal = String(form.get("final") ?? "") === "true";
  const parentAnswerId = (form.get("parent_answer_id") as string) || null;
  const questionText = (form.get("question_text") as string) || null;
  const lang = (form.get("lang") as string) || session.language || "en";
  const durationRaw = parseInt(String(form.get("duration_sec") ?? ""), 10);
  const durationSec = Number.isFinite(durationRaw) ? durationRaw : null;
  let sessionId = (form.get("session_id") as string) || null;

  const db = supabaseService();

  // Lazily ground the answers in a session. The first answer of a flow creates
  // it (in_progress); later answers pass the id back so the thread stays intact.
  if (!sessionId) {
    const nowIso = new Date().toISOString();
    const { data: ses, error: sesErr } = await db
      .from("sessions")
      .insert({
        family_id: session.family_id,
        storyteller_id: session.storyteller_id,
        status: "in_progress",
        started_at: nowIso,
      })
      .select("id")
      .single();
    if (sesErr || !ses) {
      console.error("[storyteller/answer] session create failed", sesErr);
      return NextResponse.json({ error: "could not start session" }, { status: 500 });
    }
    sessionId = ses.id;
  }

  // Upload the audio to the private bucket, namespaced by tenant + session.
  const contentType = audio.type || "audio/webm";
  const ext = extFor(contentType);
  const objectKey = `${session.family_id}/${session.storyteller_id}/${sessionId}/${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await audio.arrayBuffer());

  const { error: upErr } = await db.storage
    .from(BUCKET)
    .upload(objectKey, bytes, { contentType, upsert: false });
  if (upErr) {
    console.error("[storyteller/answer] audio upload failed", upErr);
    return NextResponse.json({ error: "could not save audio" }, { status: 500 });
  }

  // Persist the answer. transcript is deliberately null until STT (3.4).
  const { data: ans, error: ansErr } = await db
    .from("answers")
    .insert({
      family_id: session.family_id,
      storyteller_id: session.storyteller_id,
      session_id: sessionId,
      parent_answer_id: parentAnswerId,
      is_followup: isFollowup,
      question_text: questionText,
      lang,
      audio_path: objectKey,
      duration_sec: durationSec,
    })
    .select("id")
    .single();
  if (ansErr || !ans) {
    console.error("[storyteller/answer] answer insert failed", ansErr);
    // The audio is saved but unlinked; surface the failure rather than lie.
    return NextResponse.json({ error: "could not save answer" }, { status: 500 });
  }

  // Last answer of the flow closes out the session.
  if (isFinal) {
    await db
      .from("sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", sessionId);
  }

  return NextResponse.json({ ok: true, answer_id: ans.id, session_id: sessionId });
}

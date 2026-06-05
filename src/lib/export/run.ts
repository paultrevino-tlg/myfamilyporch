// "Download everything" archive worker (TODO 7.6). SERVER-ONLY, SERVICE ROLE.
//
// A request inserts an exports row (status='queued') through RLS; this module
// does the heavy lifting in the background (kicked off via ctx.waitUntil from
// the request, with the cron as a reliability backstop). It gathers the
// storyteller's whole archive from Storage, builds README + manifest +
// per-story transcripts, renders the latest book PDF (7.3), zips it all with
// fflate, uploads to the private family-exports bucket, and flips the row to
// 'ready' with a path + 7-day expiry. The row IS the in-app status; an email
// links to the login-gated download route.
//
// Failure contract: this is a background job, so it NEVER throws to a caller —
// any failure is recorded on the row (status='failed', error) and the email is
// best-effort (a send miss never fails the export). Known v1 limit: fflate
// builds the ZIP in memory, so a very large archive can hit the Worker memory
// ceiling; rate-limiting + streaming-zip are the documented future hardening
// (EXPORT_FEATURE.md §7).
import { zipSync, strToU8 } from "fflate";
import { supabaseService } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email/emailjs";
import { renderBookPdf } from "@/lib/book/pdf";
import {
  planStoryFiles,
  buildTranscriptText,
  buildManifestCsv,
  buildReadmeHtml,
  isoDate,
  type ExportStory,
  type StoryFiles,
} from "@/lib/export/build";

const AUDIO_BUCKET = "story-audio";
const EXPORT_BUCKET = "family-exports";
const RETENTION_DAYS = 7; // object retention + download-link validity
const STUCK_AFTER_MS = 15 * 60_000; // a 'preparing' job older than this is retried

// fflate entry: [bytes, options]. Store (level 0) already-compressed audio/PDF
// to save CPU; deflate (level 6) the text files. Literal levels keep fflate's
// ZipOptions.level (0|1|…|9) happy.
type ZipEntry = [Uint8Array, { level: 0 | 6 }];
const STORE: { level: 0 } = { level: 0 };
const DEFLATE: { level: 6 } = { level: 6 };
type ZipFiles = Record<string, ZipEntry>;

// File extension of a stored recording key ("…/uuid.webm" -> "webm").
function extOf(path: string | null): string | null {
  if (!path) return null;
  const ext = path.split(".").pop()?.toLowerCase();
  return ext && ext.length <= 5 && /^[a-z0-9]+$/.test(ext) ? ext : null;
}

// Friendly ZIP object/download name: "MyFamilyPorch-<Name>-<YYYY-MM-DD>.zip".
function zipFilename(storytellerName: string, dateStr: string): string {
  const clean = storytellerName.replace(/[^\p{L}\p{N} _-]/gu, "").trim().replace(/\s+/g, "-") || "Family";
  return `MyFamilyPorch-${clean}-${dateStr}.zip`;
}

// Gather every top-level story (regardless of in_book — this is the whole
// archive) for one storyteller, with its follow-up thread, as ExportStory[].
async function gatherStories(
  svc: ReturnType<typeof supabaseService>,
  familyId: string,
  storytellerId: string,
): Promise<ExportStory[]> {
  const { data } = await svc
    .from("answers")
    .select(
      "id, question_text, transcript, audio_path, created_at, in_book, " +
        "prompt:prompts(category), " +
        "followups:answers!parent_answer_id(id, question_text, transcript, audio_path, created_at)",
    )
    .eq("family_id", familyId)
    .eq("storyteller_id", storytellerId)
    .eq("is_followup", false)
    .order("created_at", { ascending: true });

  type Follow = {
    question_text: string | null;
    transcript: string | null;
    audio_path: string | null;
    created_at: string;
  };
  type Row = {
    id: string;
    question_text: string | null;
    transcript: string | null;
    audio_path: string | null;
    created_at: string;
    in_book: boolean;
    prompt: unknown;
    followups: Follow[] | null;
  };

  return ((data ?? []) as unknown as Row[]).map((a) => {
    const prompt = Array.isArray(a.prompt) ? a.prompt[0] : a.prompt;
    const category = (prompt as { category?: string } | null)?.category ?? "Other";
    const followUps = (a.followups ?? [])
      .slice()
      .sort((x, y) => x.created_at.localeCompare(y.created_at))
      .map((f) => ({
        question: f.question_text ?? null,
        transcript: f.transcript ?? null,
        audioExt: extOf(f.audio_path),
      }));
    return {
      id: a.id,
      title: a.question_text ?? null,
      transcript: a.transcript ?? null,
      audioExt: extOf(a.audio_path),
      category,
      createdAt: a.created_at,
      inBook: a.in_book,
      followUps,
    };
  });
}

// Fetch one recording's bytes from the private bucket via the service role.
// A miss (deleted object, transient error) returns null — the file is dropped
// from the ZIP and the README/manifest note it as having no audio.
async function fetchAudioBytes(
  svc: ReturnType<typeof supabaseService>,
  path: string,
): Promise<Uint8Array | null> {
  try {
    const { data, error } = await svc.storage.from(AUDIO_BUCKET).download(path);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
  } catch (err) {
    console.error("[export/run] audio fetch failed", path, err);
    return null;
  }
}

// Re-fetch the original audio_path for a story/follow-up so we can pull bytes
// (gatherStories only kept the extension). One scoped query per export.
async function pathsByExt(
  svc: ReturnType<typeof supabaseService>,
  familyId: string,
  storytellerId: string,
): Promise<Map<string, string>> {
  const { data } = await svc
    .from("answers")
    .select("id, audio_path")
    .eq("family_id", familyId)
    .eq("storyteller_id", storytellerId);
  const map = new Map<string, string>();
  for (const r of data ?? []) if (r.audio_path) map.set(r.id, r.audio_path);
  return map;
}

// Build the in-memory ZIP for a storyteller. Returns the bytes + story count.
async function buildZip(
  svc: ReturnType<typeof supabaseService>,
  familyId: string,
  storytellerId: string,
  storytellerName: string,
  familyName: string,
): Promise<{ bytes: Uint8Array; storyCount: number }> {
  // idToPath maps EVERY answer id (top-level + follow-ups) to its audio key.
  const [stories, pdf, idToPath] = await Promise.all([
    gatherStories(svc, familyId, storytellerId),
    renderBookPdf(familyId, storytellerId).catch((err) => {
      console.error("[export/run] book PDF render failed (omitting)", err);
      return null;
    }),
    pathsByExt(svc, familyId, storytellerId),
  ]);

  const plans: StoryFiles[] = planStoryFiles(stories);

  const files: ZipFiles = {};

  for (const plan of plans) {
    // transcript (.txt) — always present, even when audio is missing
    files[plan.transcriptName] = [strToU8(buildTranscriptText(plan)), DEFLATE];

    // opening audio
    if (plan.audioName) {
      const path = idToPath.get(plan.story.id);
      const bytes = path ? await fetchAudioBytes(svc, path) : null;
      if (bytes) files[plan.audioName] = [bytes, STORE];
    }
  }

  // Follow-up audio: the child id isn't carried on StoryFiles, so resolve it by
  // re-walking the thread (chronological order matches the plan) and matching
  // each child to its planned follow-up audio name.
  await addFollowUpAudio(svc, familyId, storytellerId, plans, idToPath, files);

  const exportDate = isoDate(new Date().toISOString());
  files["README.html"] = [
    strToU8(
      buildReadmeHtml({ storytellerName, familyName, exportDate, hasBookPdf: !!pdf, plans }),
    ),
    DEFLATE,
  ];
  files["manifest.csv"] = [strToU8(buildManifestCsv(plans)), DEFLATE];
  if (pdf) files["book.pdf"] = [pdf, STORE];

  const bytes = zipSync(files, {});
  return { bytes, storyCount: plans.length };
}

// Resolve + add follow-up recordings by re-loading the thread with ids in order
// and matching them to each story's planned follow-up audio names.
async function addFollowUpAudio(
  svc: ReturnType<typeof supabaseService>,
  familyId: string,
  storytellerId: string,
  plans: StoryFiles[],
  idToPath: Map<string, string>,
  files: ZipFiles,
): Promise<void> {
  const { data } = await svc
    .from("answers")
    .select("id, parent_answer_id, created_at")
    .eq("family_id", familyId)
    .eq("storyteller_id", storytellerId)
    .eq("is_followup", true)
    .order("created_at", { ascending: true });

  // Group child ids by parent, in chronological order (matches plan ordering).
  const childrenByParent = new Map<string, string[]>();
  for (const r of data ?? []) {
    if (!r.parent_answer_id) continue;
    const list = childrenByParent.get(r.parent_answer_id) ?? [];
    list.push(r.id);
    childrenByParent.set(r.parent_answer_id, list);
  }

  for (const plan of plans) {
    const childIds = childrenByParent.get(plan.story.id) ?? [];
    for (let i = 0; i < plan.followUpAudioNames.length; i++) {
      const name = plan.followUpAudioNames[i];
      const childId = childIds[i];
      if (!name || !childId) continue;
      const path = idToPath.get(childId);
      if (!path) continue;
      const bytes = await fetchAudioBytes(svc, path);
      if (bytes) files[name] = [bytes, STORE];
    }
  }
}

// Process one export job. Claims it atomically (queued -> preparing) so the
// waitUntil call and the cron backstop never double-run the same job.
export async function processExport(jobId: string): Promise<void> {
  const svc = supabaseService();

  // Atomic claim: only the runner that flips queued -> preparing proceeds.
  const { data: claimed } = await svc
    .from("exports")
    .update({ status: "preparing" })
    .eq("id", jobId)
    .eq("status", "queued")
    .select("id, family_id, storyteller_id, requested_email");
  const job = claimed?.[0];
  if (!job) return; // already claimed/processed by another runner

  try {
    const [{ data: st }, { data: fam }] = await Promise.all([
      svc.from("storytellers").select("name").eq("id", job.storyteller_id).maybeSingle(),
      svc.from("families").select("name").eq("id", job.family_id).maybeSingle(),
    ]);
    const storytellerName = st?.name ?? "Family";
    const familyName = fam?.name ?? "Family";

    const { bytes, storyCount } = await buildZip(
      svc,
      job.family_id,
      job.storyteller_id,
      storytellerName,
      familyName,
    );

    const exportDate = isoDate(new Date().toISOString());
    const filename = zipFilename(storytellerName, exportDate);
    const zipPath = `${job.family_id}/${job.id}/${filename}`;

    const { error: upErr } = await svc.storage
      .from(EXPORT_BUCKET)
      .upload(zipPath, new Blob([bytes as unknown as BlobPart], { type: "application/zip" }), {
        contentType: "application/zip",
        upsert: true,
      });
    if (upErr) throw upErr;

    const expiresAt = new Date(Date.now() + RETENTION_DAYS * 86_400_000).toISOString();
    await svc
      .from("exports")
      .update({
        status: "ready",
        zip_path: zipPath,
        story_count: storyCount,
        ready_at: new Date().toISOString(),
        expires_at: expiresAt,
        error: null,
      })
      .eq("id", job.id);

    // Best-effort "ready" email (fail-soft — never fails the export).
    if (job.requested_email) {
      const base = process.env.APP_BASE_URL ?? "";
      try {
        await sendEmail({
          to_email: job.requested_email,
          subject: `${storytellerName}'s recordings are ready to download`,
          headline: "Your download is ready",
          message_html: `<p>We’ve packaged up everything you’ve recorded with <strong>${storytellerName}</strong> — audio, transcripts, and your keepsake book — into a single download. It’s yours to keep, forever.</p><p>The link below works for the next ${RETENTION_DAYS} days; you can always request a fresh one any time.</p>`,
          button_label: "Download everything",
          button_url: base ? `${base}/api/export/download?job=${job.id}` : "",
          footnote: "My Family Porch — your stories are always yours.",
        });
      } catch (mailErr) {
        console.error("[export/run] ready email failed (export still ready)", mailErr);
      }
    }
  } catch (err) {
    console.error("[export/run] export failed", job.id, err);
    await svc
      .from("exports")
      .update({ status: "failed", error: String((err as Error)?.message ?? err).slice(0, 500) })
      .eq("id", job.id);
  }
}

// Cron backstop (wired into api/cron/scheduler): pick up any job still queued
// (the waitUntil never ran / was killed) or stuck in 'preparing' past the
// threshold, and delete expired ZIP objects. Returns a small summary for logs.
export async function runExportMaintenance(
  now: Date = new Date(),
): Promise<{ processed: number; expired: number }> {
  const svc = supabaseService();

  // 1) Re-queue stuck 'preparing' jobs (older than STUCK_AFTER_MS) back to queued
  //    so processExport's atomic claim can pick them up cleanly.
  const stuckBefore = new Date(now.getTime() - STUCK_AFTER_MS).toISOString();
  await svc
    .from("exports")
    .update({ status: "queued" })
    .eq("status", "preparing")
    .lt("updated_at", stuckBefore);

  // 2) Process all queued jobs.
  const { data: queued } = await svc
    .from("exports")
    .select("id")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(20);
  let processed = 0;
  for (const j of queued ?? []) {
    await processExport(j.id);
    processed++;
  }

  // 3) Clean up expired ZIPs: remove the object, mark the row so the UI stops
  //    offering a stale download (re-request regenerates a fresh one).
  const { data: expired } = await svc
    .from("exports")
    .select("id, zip_path")
    .eq("status", "ready")
    .not("zip_path", "is", null)
    .lt("expires_at", now.toISOString())
    .limit(100);
  let expiredCount = 0;
  for (const e of expired ?? []) {
    if (e.zip_path) {
      const { error } = await svc.storage.from(EXPORT_BUCKET).remove([e.zip_path]);
      if (error) {
        console.error("[export/run] expired cleanup failed", e.zip_path, error);
        continue;
      }
    }
    await svc.from("exports").update({ zip_path: null }).eq("id", e.id);
    expiredCount++;
  }

  return { processed, expired: expiredCount };
}

// Collect export ZIP object keys for a family/storyteller — used by the deletion
// cleanup path so removing a storyteller erases their export archives too.
export async function collectStorytellerExportPaths(
  familyId: string,
  storytellerId: string,
): Promise<string[]> {
  const svc = supabaseService();
  const { data } = await svc
    .from("exports")
    .select("zip_path")
    .eq("family_id", familyId)
    .eq("storyteller_id", storytellerId);
  return (data ?? []).map((e) => e.zip_path).filter((p): p is string => !!p);
}

// Remove export ZIP objects (best-effort; THROWS on error like the other
// cleanup helpers so a storage failure aborts the row delete).
export async function removeExportObjects(paths: (string | null | undefined)[]): Promise<void> {
  const keys = Array.from(new Set(paths.filter((p): p is string => !!p)));
  if (keys.length === 0) return;
  const svc = supabaseService();
  const { error } = await svc.storage.from(EXPORT_BUCKET).remove(keys);
  if (error) {
    console.error("[export/run] failed to remove export objects", error);
    throw error;
  }
}

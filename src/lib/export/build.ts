// Pure helpers for the "Download everything" archive (TODO 7.6). No I/O, no
// Supabase, no Workers APIs — just the deterministic shaping of filenames,
// transcripts, the manifest CSV, and the README. Kept separate from run.ts so
// the naming/formatting rules can be unit-tested without a runtime.
//
// Filename rule (the whole point — names must be meaningful OUTSIDE the app):
//   <YYYY-MM-DD>_<Story-Title>   (title sanitized, spaces -> hyphens)

// One story as the export sees it. Mirrors a top-level answer plus its thread.
export type ExportFollowUp = {
  question: string | null;
  transcript: string | null;
  audioExt: string | null; // file extension of the recording, if any
};
export type ExportStory = {
  id: string;
  title: string | null; // question_text
  transcript: string | null;
  audioExt: string | null;
  category: string;
  createdAt: string; // ISO
  inBook: boolean;
  followUps: ExportFollowUp[];
};

// What a built story resolves to inside the ZIP (used by run.ts + README/CSV).
export type StoryFiles = {
  story: ExportStory;
  base: string; // "2026-03-14_How-Grandpa-met-Grandma"
  audioName: string | null; // "audio/<base>.<ext>" or null
  followUpAudioNames: (string | null)[]; // parallel to story.followUps
  transcriptName: string; // "transcripts/<base>.txt"
  title: string; // display title (never empty)
};

// "2026-03-14" from an ISO timestamp, in UTC (stable regardless of server TZ).
export function isoDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "0000-00-00";
  return d.toISOString().slice(0, 10);
}

// Sanitize a story title into a filename-safe slug: keep letters/numbers/spaces/
// hyphens (Unicode letters allowed so accented Spanish titles survive), collapse
// whitespace to single hyphens, trim, cap length. Empty -> "Untitled-story".
export function slugifyTitle(title: string | null): string {
  const cleaned = (title ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(/[^\p{L}\p{N} -]/gu, "") // drop characters illegal/awkward in filenames
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const slug = cleaned.slice(0, 60).replace(/-+$/g, "");
  return slug || "Untitled-story";
}

// Build the per-story file plan, de-duplicating bases (same date + title) by
// appending -2, -3, … so no two entries collide inside the ZIP.
export function planStoryFiles(stories: ExportStory[]): StoryFiles[] {
  const usedBases = new Set<string>();
  return stories.map((story) => {
    const title = (story.title ?? "").trim() || "Untitled story";
    let base = `${isoDate(story.createdAt)}_${slugifyTitle(story.title)}`;
    if (usedBases.has(base)) {
      let n = 2;
      while (usedBases.has(`${base}-${n}`)) n++;
      base = `${base}-${n}`;
    }
    usedBases.add(base);

    const audioName = story.audioExt ? `audio/${base}.${story.audioExt}` : null;
    const followUpAudioNames = story.followUps.map((f, i) =>
      f.audioExt ? `audio/${base}_followup-${i + 1}.${f.audioExt}` : null,
    );
    return {
      story,
      base,
      audioName,
      followUpAudioNames,
      transcriptName: `transcripts/${base}.txt`,
      title,
    };
  });
}

// The plain-text transcript for one story: the opening question + answer, then
// the follow-up thread. Reads as the full conversation, not just the opener.
export function buildTranscriptText(plan: StoryFiles): string {
  const s = plan.story;
  const lines: string[] = [];
  lines.push(plan.title);
  lines.push(`Recorded ${isoDate(s.createdAt)}${s.category ? ` · ${s.category}` : ""}`);
  lines.push("");
  lines.push(s.transcript?.trim() || "(No transcript available for this recording.)");
  for (const f of s.followUps) {
    lines.push("");
    if (f.question?.trim()) lines.push(`Q: ${f.question.trim()}`);
    lines.push(f.transcript?.trim() || "(No transcript available for this recording.)");
  }
  return lines.join("\n") + "\n";
}

function csvCell(value: string): string {
  // Always quote; escape embedded quotes by doubling (RFC 4180).
  return `"${value.replace(/"/g, '""')}"`;
}

// manifest.csv — machine-readable index a technical relative can re-import.
// Columns: story_title, date_recorded, chapter, audio_file, transcript_file, in_book
export function buildManifestCsv(plans: StoryFiles[]): string {
  const header = [
    "story_title",
    "date_recorded",
    "chapter",
    "audio_file",
    "transcript_file",
    "in_book",
  ];
  const rows = plans.map((p) =>
    [
      p.title,
      isoDate(p.story.createdAt),
      p.story.category,
      p.audioName ?? "",
      p.transcriptName,
      p.story.inBook ? "Y" : "N",
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.map(csvCell).join(","), ...rows].join("\r\n") + "\r\n";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// README.html — the friendly landing file. Storyteller name, export date, story
// count, and a clickable list linking each entry to its audio + transcript.
export function buildReadmeHtml(opts: {
  storytellerName: string;
  familyName: string;
  exportDate: string; // YYYY-MM-DD
  hasBookPdf: boolean;
  plans: StoryFiles[];
}): string {
  const { storytellerName, familyName, exportDate, hasBookPdf, plans } = opts;
  const name = escapeHtml(storytellerName);
  const items = plans
    .map((p) => {
      const audio = p.audioName
        ? `<a href="${escapeHtml(p.audioName)}">audio</a>`
        : `<span class="muted">no audio</span>`;
      const transcript = `<a href="${escapeHtml(p.transcriptName)}">transcript</a>`;
      const date = isoDate(p.story.createdAt);
      return `<li><span class="t">${escapeHtml(p.title)}</span>
        <span class="meta">${date}${
          p.story.category ? ` · ${escapeHtml(p.story.category)}` : ""
        } — ${audio} · ${transcript}</span></li>`;
    })
    .join("\n");

  const bookLine = hasBookPdf
    ? `<p>📖 Your keepsake book is included as <a href="book.pdf">book.pdf</a> (with voice QR codes).</p>`
    : `<p class="muted">No keepsake book has been compiled yet — once you mark stories “in the book,” it’ll be included here.</p>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${name} — My Family Porch archive</title>
<style>
  body { font-family: -apple-system, system-ui, "Segoe UI", Roboto, sans-serif;
    max-width: 720px; margin: 2.5rem auto; padding: 0 1.25rem; color: #2b2722; line-height: 1.55; }
  h1 { font-size: 1.6rem; margin-bottom: .25rem; }
  .sub { color: #6b6258; margin-top: 0; }
  ul { list-style: none; padding: 0; }
  li { padding: .7rem 0; border-bottom: 1px solid #ece7df; }
  .t { display: block; font-weight: 600; }
  .meta { color: #6b6258; font-size: .9rem; }
  .muted { color: #9a9088; }
  a { color: #a35b3a; }
  footer { margin-top: 2rem; color: #9a9088; font-size: .85rem; }
</style>
</head>
<body>
  <h1>${name}’s stories</h1>
  <p class="sub">From the ${escapeHtml(familyName)} family · exported ${escapeHtml(exportDate)} · ${plans.length} ${
    plans.length === 1 ? "story" : "stories"
  }</p>
  ${bookLine}
  <p>Everything here is yours to keep, forever. Open <code>book.pdf</code> to read the keepsake, play any recording from the <code>audio/</code> folder, or read along in <code>transcripts/</code>. <code>manifest.csv</code> lists every story.</p>
  <h2>Stories</h2>
  <ul>
${items || '<li class="muted">No stories recorded yet.</li>'}
  </ul>
  <footer>My Family Porch — myfamilyporch.net</footer>
</body>
</html>
`;
}

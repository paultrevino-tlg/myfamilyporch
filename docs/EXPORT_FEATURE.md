# MyFamilyPorch — "Download Everything" Export Spec

> **Purpose:** Source-of-truth spec for the full-content export feature. Hand
> this to Claude Code alongside `PRICING.md`. It defines what the export
> contains, how it behaves, the UX, and the technical shape. Items marked
> `TODO:` need a decision before build.

---

## 1. Why this exists (read first)

MyFamilyPorch's core promise is **"you own it forever."** That promise is only
real if there's a button that actually hands the family their files. This
feature is that button. It is the demonstrable proof of the differentiator,
not a nice-to-have.

**Hard rule:** This feature is **universal across every tier**, including the
$99 Keepsake tier and the Lifetime plan. Never gate a family's ability to
download their own recordings behind a paywall or an upsell. Printed books and
extra copies are the upsell — ownership of their own content is not.

---

## 2. What the export contains

A single downloadable **ZIP archive** containing everything the family has
created. Internal structure:

```
MyFamilyPorch-<StorytellerName>-<YYYY-MM-DD>.zip
├── README.html              # friendly index, opens in any browser
├── manifest.csv             # machine-readable list of every story
├── book.pdf                 # latest compiled keepsake book (with voice QR)
├── audio/
│   ├── 2026-03-14_How-Grandpa-met-Grandma.mp3
│   ├── 2026-03-21_The-summer-on-the-farm.mp3
│   └── ...
└── transcripts/
    ├── 2026-03-14_How-Grandpa-met-Grandma.txt
    ├── 2026-03-21_The-summer-on-the-farm.txt
    └── ...
```

**Contents in detail:**
- **Audio:** one MP3 per story. `TODO: confirm MP3 vs original-format/quality;
  MP3 is the portable default.`
- **Transcripts:** one plain-text file per story, matching the audio filename.
- **book.pdf:** the most recently compiled keepsake book, including voice QR
  codes. If no book has been compiled yet, omit and note in README.
- **README.html:** human-friendly landing file — storyteller name, export date,
  story count, and a clickable list linking each entry to its audio + transcript.
- **manifest.csv:** columns = `story_title, date_recorded, chapter, audio_file,
  transcript_file, in_book (Y/N)`. Lets a technical relative re-import or
  re-organize later.

**Filename rule:** `<YYYY-MM-DD>_<Story-Title>` with the title sanitized
(spaces → hyphens, strip characters illegal in filenames). Filenames must be
meaningful *outside* the app — this is the whole point.

---

## 3. Behavior

- **Available any time** from the dashboard — not only on cancellation.
  "It's yours whenever you want it" beats "it's yours if you leave."
- **Available after cancellation too.** A cancelled family retains read/export
  access to everything they recorded. `TODO: confirm retention window — recommend
  indefinite, consistent with the forever-access promise.`
- **Scope selector** (for Family tier / multiple storytellers): let the user
  export one storyteller or all of them. Single-storyteller plans skip this.
- **Always reflects current state:** the export is generated fresh on request so
  it includes the latest stories, edits, and most recent book PDF.

---

## 4. Generation flow (async — do NOT do this synchronously)

A chatty storyteller can produce a large library, so a synchronous download
will time out. Build it as a background job:

1. User clicks **Download everything** → confirm scope (if applicable) → submit.
2. Enqueue an export job (story list, audio refs, transcripts, latest PDF).
3. Worker gathers files from storage, generates README + manifest, streams them
   into a ZIP, uploads the ZIP to temp object storage.
4. Generate a **signed, expiring download URL**. `TODO: confirm expiry —
   suggest 7 days; allow re-generation any time.`
5. Notify the user the export is ready: **in-app notification + email** with the
   download link.
6. UI states: `Idle → Preparing your export… → Ready (download)`. Show progress
   or at least a "we'll email you when it's ready" message for large archives.

**Security/privacy:**
- Signed URLs only; never expose raw storage paths.
- Do not put storyteller names or any personal data in query strings.
- Link is per-request and expires; re-request regenerates a fresh link.

---

## 5. UX placement & copy

**Entry point:** Settings or a dedicated "Your data" / "Download" area in the
dashboard. Also surface it on the cancellation flow as reassurance.

- Button label: `Download everything`
- Sub-label: `Audio, transcripts, and your book — all yours to keep.`
- Preparing state: `Preparing your download… we'll email you when it's ready.`
- Ready state: `Your download is ready.` + `Download` button.
- Cancellation-flow note: `Before you go — you can download all your recordings,
  transcripts, and book any time. They're yours to keep, forever.`

---

## 6. Pricing-page integration

Add to `PRICING.md` artifacts:

- **Feature matrix:** new row, ● across **all three tiers**.
  `| Download everything (audio + transcripts + book) | ● | ● | ● |`
- **FAQ entry:**
  - Q: *Can I download all the recordings?*
  - A: *Yes — any time, on every plan. One click gives you a ZIP with every
    audio recording, transcripts, and your book. If you ever cancel, it's all
    still yours to download and keep.*

---

## 7. Open decisions (`TODO`)

- MP3 vs. original audio format/quality in the export.
- Retention window after cancellation (recommend indefinite).
- Signed-URL expiry length (recommend 7 days, re-generable).
- Whether Family-tier export bundles all storytellers into one ZIP or one ZIP
  per storyteller.
- Rate limiting on export requests to control storage/compute cost.

---

*This is a product/engineering spec. Numbers and windows marked TODO are
recommendations to confirm, not final.*

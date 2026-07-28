# MyFamilyPorch — Pricing Spec

> **Purpose:** Source-of-truth spec for building the public pricing page(s).
> Hand this to Claude Code. It defines tiers, à-la-carte items, exact copy,
> page structure, and a feature matrix. Items marked `TODO:` must be confirmed
> against real cost/margin data before going live — do not ship placeholder
> prices as final.
>
> **v2 — revised 2026-07-28.** Prices were re-derived against modelled unit
> economics (§6). The v1 numbers had three structural faults: the Family tier
> undercut its own à-la-carte storyteller price, Lifetime broke even only after
> ~5.6 years, and the book tier's upgrade margin was ~28%. See §8 for the full
> before/after and the reasoning. The implementation lives in
> `src/lib/pricing.ts` — change prices there and here together.

---

## 1. Product context (for whoever/whatever builds the page)

MyFamilyPorch is a voice-first memory keepsake service. Families invite an
elderly relative (the **storyteller**) to record life stories by phone/SMS —
no app install. Stories are transcribed, organized into chapters, and can be
compiled into a **keepsake book**. The printed book carries **voice QR codes**
that link to the original audio, so a relative's actual voice lives inside the
physical book.

**Two positioning pillars the pricing page must reinforce:**

1. **You own it forever.** If a family cancels, they keep all stories, audio,
   and exports. No paywall, no read-only lockout. This is the category's #1
   pain point and our primary differentiator — state it explicitly on the page.
2. **A voice inside a book.** Text-only memoir competitors cannot put a
   grandmother's voice in a printed book. The voice-QR printed book is the
   emotional payoff and the reason to upgrade to a paid book tier.

---

## 2. Tiers (subscription-led)

Three subscription tiers + a one-time prepaid **gift**. All prices in USD.
Billed annually; monthly is offered on Tier 1 only.

> Remaining open input: the **print-on-demand quote** (§6). Every book-bearing
> price assumes ~$36 landed for a ~100pp color hardcover incl. shipping.

### Tier 1 — Keepsake — $99 / year
- **Tagline:** Everything, kept forever.
- One storyteller.
- Unlimited stories and recordings.
- Full voice-nudge / scheduling experience.
- **Digital book** (PDF) with bundled audio + voice QR codes.
- Forever access on cancellation.
- **Printed book NOT included** — available as an add-on (see §3).
- Monthly option: **$14/mo** (≈41% over annual — deliberate; it also has to
  absorb the higher churn and per-charge fees of monthly billing).
- Held at $99 on purpose: it is the acquisition/anchor tier against StoryWorth
  and Remento at the same price, and still clears ~69% gross margin (§6).

### Tier 2 — Keepsake + Book — $189 / year  ⭐ Most popular
- **Tagline:** The book with their voice in it.
- Everything in Keepsake, plus:
- **One printed hardcover color book, included in the first year.**
- Voice QR codes printed in the book.
- New editions and extra copies at à-la-carte prices thereafter.
- Mark this tier as the highlighted / recommended card.
- **Why $189, not $149:** the upgrade over Tier 1 is now $90 against a ~$36
  book (~60% incremental margin) and it no longer sells the same hardcover for
  $50 inside the tier that we sell for $79 outside it.
- **Why first-year only:** a year-2 book costs the same to print but carries one
  year of new stories. Families want one beautiful book, not one per year;
  shipping one annually was pure margin leakage against a weaker product.

### Tier 3 — Family — $299 / year
- **Tagline:** For the whole family.
- Everything in Keepsake + Book, plus:
- Up to **3 storytellers**.
- Priority support.
- One printed book included (first year) — **not one per storyteller**. Extra
  copies are à la carte.
- **Why $299, not $199:** at $199 this tier handed over two extra storytellers
  for $50 that cost $158 à la carte and ~$56/yr to actually serve — a 37% gross
  margin, worse than the tiers beneath it, and an arbitrage every multi-elder
  family would take. The ladder is now internally consistent: buying up from
  Tier 2 à la carte is $189 + $79 + $79 = $347 vs $299, a sane ~14% multi-seat
  discount.

### The Gift — $199 one-time (the one-time path)
- **Tagline:** One price, prepaid. Nothing to renew.
- 12 months of recording + **one printed hardcover included**, for one
  storyteller. Never auto-renews; no card left on file.
- Present as a separate band, NOT a 4th column.
- Gifting is a primary purchase motion (birthdays, Mother's/Father's Day,
  holidays). Gift buyers convert on a fixed price and won't sign a recipient up
  for a recurring charge.
- Checkout + redeemable code is Phase 9.7; the landing page is `/gift`.

### Lifetime — REMOVED (was $199 one-time)
Retired in v2. Reasons, kept here so it isn't re-proposed:
1. **Break-even ~5.6 years.** $199 − ~$36 book − ~$6 fees = $157 contribution
   against ~$28/yr of marginal cost, forever, plus a permanent storage and
   export obligation we promise in writing.
2. **Adverse selection.** It beat the $189/yr book tier for anyone staying past
   ~13 months — i.e. precisely the high-LTV customers, and only them.
3. **It sold a benefit we already give away.** "Cancel anytime and keep
   everything, forever" already means a cancelled family keeps every recording,
   transcript, and the digital book. Charging $199 for permanence contradicted
   the page's own headline promise.

If it is ever revived, the only defensible shape is **$599 = lifetime access,
playback and export + 24 months of active interviewing, then ~$49/yr to keep
recording** — because "lifetime" must bound the *active* cost, not just the
storage cost.

---

## 3. À la carte add-ons (display below the tier cards)

| Item | Price | COGS assumption | Notes |
|---|---|---|---|
| Extra printed copy — softcover | `$59` | ~$20 landed | ~66% margin |
| Extra printed copy — hardcover | `$79` | ~$36 landed | ~54% margin |
| Additional storyteller (annual plans) | `+$79 / yr` | ~$28/yr serving cost | ~65% margin; aligned with the Family tier |
| New edition — hardcover | `$89` | ~$36 landed + layout | Replaces the v1 `$39 reprint`, which did not clear print COGS and read to buyers as a whole printed book for $39 |

Frame extra copies around the real use case: *"Each adult child can have their
own copy."*

**Printed-book eligibility gate.** Printed books (bundled or à la carte) ship
immediately on any annual plan; on the monthly plan they can be ordered after
**6 paid months** (`PRINTED_BOOK_ELIGIBILITY` in `src/lib/pricing.ts`, enforced
at order time in Phase 9.5). Without this, one $14 charge extracts a ~$36
hardcover. This gate covers **printed books only** — downloading one's own
audio, transcripts and digital book stays free and ungated from day one on
every plan, because that is the brand promise (`docs/EXPORT_FEATURE.md`).

---

## 4. Feature comparison matrix

Render as a comparison table beneath the cards. ● = included.

| Feature | Keepsake $99 | Keepsake + Book $189 | Family $299 |
|---|:---:|:---:|:---:|
| Storytellers | 1 | 1 | up to 3 |
| Unlimited stories & recordings | ● | ● | ● |
| Voice nudges & smart scheduling | ● | ● | ● |
| Digital book (PDF) | ● | ● | ● |
| Voice QR codes | ● | ● | ● |
| **Download everything** (audio + transcripts + book, one click) | ● | ● | ● |
| **Forever access on cancel** | ● | ● | ● |
| Printed hardcover color book (first year) | — | 1 | 1 |
| Extra copies & new editions | add-on | add-on | add-on |
| Priority support | — | — | ● |

---

## 5. Page copy

**Hero**
- H1: `Their stories, in their own voice — kept forever.`
- Sub: `MyFamilyPorch helps your family capture an elder's life stories by
  phone. No app to install. You keep everything, always.`

**Forever-access callout** (a band above or below the cards)
- H2: `Cancel anytime. Keep everything, forever.`
- Body: `Unlike other services, your stories, recordings, and book never get
  locked behind a paywall. Download all of it — every audio recording,
  transcript, and your book — any time, in one click. If you ever stop, it's
  still yours to keep.`

**Book differentiator callout**
- H2: `A book you can actually hear.`
- Body: `Every printed book includes voice QR codes — scan a page and hear the
  story in their own voice. No one else does this.`

**Card CTAs**
- Keepsake: `Start recording`
- Keepsake + Book: `Get the book` (primary/highlighted button)
- Family: `Set up the family`
- The Gift: `Give it as a gift` → `/gift`

**Add-on footnote** (under the à-la-carte table — states the one gate honestly)
- `Printed books ship right away on any yearly plan. On the monthly plan, they
  can be ordered after six months. Downloading your own recordings is always
  free, on every plan, from day one.`

**FAQ** (include these Q&As)
- *What happens if I cancel?* — You keep all stories, audio, and your digital
  book. Nothing is deleted or locked.
- *Do I get a new printed book every year?* — The first printed book is included
  on Keepsake + Book and Family. After that, order a new edition whenever it's
  worth printing again ($89). Most families print one beautiful book, not one a
  year.
- *Is there a lifetime plan?* — You already have the part that matters: every
  plan keeps everything forever, even after cancelling. If you'd rather pay
  once, The Gift is prepaid for a year and never auto-renews. (This answer turns
  the retired SKU into a restatement of the #1 differentiator — keep it.)
- *Yearly or monthly?* — Yearly is better value and the printed book ships right
  away; monthly is $14 and books can be ordered after six months. Downloads are
  free from day one either way.
- *Can more than one person record?* — Yes, on the Family plan, or add a
  storyteller to any annual plan.
- *Can I download all the recordings?* — Yes — any time, on every plan. One
  click gives you a ZIP with every audio recording, the transcripts, and your
  book. If you ever cancel, it's all still yours to download and keep.
- *Can I order more printed copies?* — Yes, any time, softcover or hardcover.
- *Does the storyteller need a smartphone or app?* — No. It works over a normal
  phone with SMS.
- *What are the voice QR codes?* — Printed codes in the book that play the
  original recording when scanned.

---

## 6. Unit economics (BUILD-TIME NOTES — not for the public page)

### 6.1 Modelled cost per active storyteller / year

Basis: the shipped default schedule (`TU,FR` → 104 sessions/yr, 2 questions
each — `src/lib/schedule.ts` `DEFAULTS`), ~6 min of elder speech per session,
~900 spoken characters per session. **These are list-price estimates, not vendor
invoices** — revisit after the first month of real traffic.

| Line | Est. / yr | Driver |
|---|---:|---|
| ElevenLabs TTS (~94k chars/yr — the largest variable cost) | **$19** | at 1 credit/char; **~$9 since 2026-07-28**, when the default became `eleven_turbo_v2_5` at 0.5 credits/char (§6.3). Table left at the higher figure so the margins below stay conservative |
| STT (~624 min/yr) | $3.75 | elder speech volume |
| Anthropic Sonnet (~3 calls/session, 200 max_tokens) | $3.75 | follow-up generation |
| Twilio SMS (~150 msgs: nudges, alerts, opt-in) | $1.65 | |
| Storage + export egress | ~$0.10 yr 1, **cumulative forever** | ~250 MB/yr audio |
| **Total variable** | **≈ $28** (range $20–60) | |

Plus a fixed platform floor of roughly **$130/mo** (Supabase Pro, ElevenLabs,
Cloudflare, Twilio number + A2P fees) — about **35–40 paying families** just to
cover fixed costs before any contribution.

**Book COGS:** ~100pp color hardcover + shipping assumed at **$36 landed**
(range $28–45). `TODO: get a real quote from the chosen POD provider (Lulu /
Blurb / Peecho).` **This is the last unconfirmed input** and every book-bearing
price moves ±$15 with it.

### 6.2 Resulting margins (at $36 book, $28 serving, Stripe 2.9%+30¢)

| SKU | Price | COGS | Gross | Margin |
|---|---:|---:|---:|---:|
| Keepsake | $99 | ~$31 | $68 | 69% |
| Keepsake + Book (yr 1) | $189 | ~$70 | $119 | 63% |
| Keepsake + Book (yr 2+, no book) | $189 | ~$34 | $155 | 82% |
| Family (3 storytellers, yr 1) | $299 | ~$129 | $170 | 57% |
| The Gift | $199 | ~$70 | $129 | 65% |

### 6.3 Cost controls

- ~~**Cheaper TTS.**~~ **Done 2026-07-28.** Synthesis defaults to
  `eleven_turbo_v2_5` (0.5 credits/char) instead of `eleven_multilingual_v2`
  (1 credit/char), halving the largest variable line: **~$19/yr → ~$9/yr** per
  storyteller, taking the modelled total from ~$28 to **~$18/yr**. Turbo rather
  than flash: same price, but flash trades prosody for latency we don't need.
  Revertible via `ELEVENLABS_TTS_MODEL` without a deploy. The margin tables in
  §6.2 are NOT restated for this — they stay on the conservative ~$28 figure.
- ~~**`askNow` has no throttle.**~~ **Done 2026-07-28.** Both manual send paths
  ("Ask now" on Schedule and "Send a nudge" on the storyteller hub) now share a
  cap of `MANUAL_NUDGE_DAILY_CAP` = 3 per storyteller per **local** day, claimed
  atomically in Postgres (migration 0018). The cron path stays uncapped — it is
  already bounded by `days_of_week`.
- **Audio caching — the bigger remaining win.** `api/storyteller/voice` sets
  `Cache-Control: no-store` and nothing caches synthesized speech, so every
  replay of the same question re-bills. That makes the ~$9/yr TTS figure a
  **floor**, not a ceiling. The fixed-copy screens (welcome, "your turn", done,
  consent read-aloud) are identical text per language+voice across every family
  and are the obvious first cache. `TODO: cache fixed-copy TTS.`
- **Export / retention cost.** Audio is kept in durable storage
  **indefinitely**, including for **cancelled** accounts that generate no
  recurring revenue, plus ZIP-generation compute and egress on each export.
  Per-account it is small but permanent and grows with the install base. It
  belongs in COGS and is a standing argument against any perpetual-license SKU.
  `TODO: add export rate limiting.` See `EXPORT_FEATURE.md`.
- **"Unlimited stories"** is honest today because the scheduler caps outreach at
  the family's chosen days. If a self-serve "record as much as you like" path is
  ever added, this pricing needs a fair-use ceiling.

### 6.4 Open decisions (not implemented — need an owner call)

1. **Front-loaded renewal pricing.** Because we deliberately gave up lock-in
   (forever access), revenue can only come from year 1 and the book. A
   first-year/renewal split — e.g. $189 year 1 with book → ~$89/yr to keep
   recording — would match where value is actually delivered and blunt the
   year-2 churn that hits every memoir subscription once the book is done. Not
   implemented: it needs a second price per tier and complicates the cards.
2. **Tier naming.** "Keepsake" ($99) does not include the keepsake. Renaming is
   free right now (no Stripe products exist yet) and expensive later. Suggested:
   Keepsake → **Voices** or **Porch**, with the book tier keeping "Keepsake".

---

## 7. Design / build notes for the page

- 3 tier cards in a row (stack on mobile); highlight **Keepsake + Book** as the
  recommended card (badge: "Most popular").
- **The Gift** as a separate band, not a 4th card. It carries both the price and
  the emotional gifting pitch, and its CTA goes to `/gift`.
- À-la-carte add-ons in a simple table or list below the cards, with the
  printed-book eligibility footnote (§3) directly underneath.
- Feature matrix below that.
- Forever-access and voice-QR callouts as visually distinct bands — these are
  the conversion levers, give them room.
- Annual/monthly toggle on the cards if monthly is offered (§2 Tier 1).
- Keep the storyteller-facing tone warm and non-technical; the buyer is usually
  the adult child, not the elder.

---

## 8. Change log

### v2 — 2026-07-28 (repriced against §6 unit economics)

| Item | v1 | v2 | Why |
|---|---|---|---|
| Keepsake | $99/yr | **$99/yr** (unchanged) | 69% margin; it's the anchor against $99 competitors |
| Keepsake monthly | $11/mo | **$14/mo** | $11 + a free full export + an orderable book was an escape hatch |
| Keepsake + Book | $149/yr | **$189/yr** | +$50 bought a ~$36 book (28% incremental) and undercut our own $79 hardcover |
| Book cadence | one per year | **first year only** | year-2 book: same cost, less new content; reprints are an add-on |
| Family | $199/yr | **$299/yr** | $199 gave away $158 of à-la-carte storytellers for $50 at 37% margin |
| Additional storyteller | $89/yr | **$79/yr** | makes the Family discount coherent ($347 à la carte vs $299) |
| Reprint | $39 | **$89 new-edition hardcover** | $39 did not clear print COGS |
| Lifetime | $199 one-time | **removed** | ~5.6yr break-even, adverse selection, and it sold a benefit we give away free |
| — | — | **The Gift $199 one-time** | fills the one-time slot with a prepaid, finite SKU that carries no perpetual cost |
| — | — | **Printed-book eligibility gate** | 6 paid months on monthly; downloads stay free from day one |

Not changed, deliberately: the forever-access promise, free unlimited export,
and the voice-QR book — those are the differentiators the pricing exists to
monetize, not levers to tighten.

---

*Prices and inclusions are recommendations and must be confirmed against actual
costs. The print-on-demand quote (§6.1) is the one input still outstanding.
This is a product/marketing spec, not financial advice.*

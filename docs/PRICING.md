# MyFamilyPorch — Pricing Spec

> **Purpose:** Source-of-truth spec for building the public pricing page(s).
> Hand this to Claude Code. It defines tiers, à-la-carte items, exact copy,
> page structure, and a feature matrix. Items marked `TODO:` must be confirmed
> against real cost/margin data before going live — do not ship placeholder
> prices as final.

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

Three subscription tiers + a one-time lifetime alternative. All prices in USD.
Billed annually; show an optional monthly equivalent where noted.

> `TODO: Confirm all prices against loaded COGS before launch.` See §6.

### Tier 1 — Keepsake — $99 / year
- **Tagline:** Everything, kept forever.
- One storyteller.
- Unlimited stories and recordings.
- Full voice-nudge / scheduling experience.
- **Digital book** (PDF) with bundled audio + voice QR codes.
- Forever access on cancellation.
- **Physical book NOT included** — available as an add-on (see §3).
- Monthly option: `$11/mo` `TODO: confirm monthly maps to ~$99/yr intent`.

### Tier 2 — Keepsake + Book — $149 / year  ⭐ Most popular
- **Tagline:** The book with their voice in it.
- Everything in Keepsake, plus:
- **One printed hardcover color book** shipped per year.
- Voice QR codes printed in the book.
- Mark this tier as the highlighted / recommended card.

### Tier 3 — Family — $199 / year
- **Tagline:** For the whole family.
- Everything in Keepsake + Book, plus:
- Up to **3 storytellers** `TODO: confirm storyteller cap`.
- Priority support.
- `TODO: decide whether Family includes >1 printed copy or just multi-storyteller.`

### Lifetime — $199 one-time (alternative path)
- **Tagline:** Own it outright. No subscription.
- One storyteller, lifetime access, one printed book included.
- Present as a separate option (toggle or secondary section), NOT a 4th column,
  so it doesn't muddy the annual comparison.
- `TODO: define ongoing-cost guardrail — cap on active prompting and/or a
  low-cost "keep recording" renewal. Lifetime must cover indefinite marginal
  costs (SMS, transcription, storage).`

---

## 3. À la carte add-ons (display below the tier cards)

| Item | Price | Notes |
|---|---|---|
| Extra printed copy — softcover | `$59` | `TODO: confirm > COGS` |
| Extra printed copy — hardcover | `$79` | `TODO: confirm > COGS` |
| Additional storyteller (annual plans) | `+$89 / yr` | `TODO: confirm` |
| New edition / reprint (a year of new stories) | `$39` | One-time reprint fee `TODO: confirm` |

Frame extra copies around the real use case: *"Each adult child can have their
own copy."*

---

## 4. Feature comparison matrix

Render as a comparison table beneath the cards. ● = included.

| Feature | Keepsake $99 | Keepsake + Book $149 | Family $199 |
|---|:---:|:---:|:---:|
| Storytellers | 1 | 1 | up to 3 |
| Unlimited stories & recordings | ● | ● | ● |
| Voice nudges & smart scheduling | ● | ● | ● |
| Digital book (PDF) | ● | ● | ● |
| Voice QR codes | ● | ● | ● |
| **Download everything** (audio + transcripts + book, one click) | ● | ● | ● |
| **Forever access on cancel** | ● | ● | ● |
| Printed hardcover color book / yr | — | 1 | 1 |
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
- Lifetime: `Buy it once`

**FAQ** (include these Q&As)
- *What happens if I cancel?* — You keep all stories, audio, and your digital
  book. Nothing is deleted or locked.
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

## 6. Margin guardrails (BUILD-TIME NOTES — not for the public page)

These are assumptions, **not confirmed facts**. Validate before launch.

- Hardcover color book (~100pp) + shipping ≈ `$25–45` `TODO: get real quote
  from chosen POD provider (Lulu / Blurb / Peecho)`.
- Per-storyteller software cost/yr (Twilio SMS + transcription + any voice
  generation + storage) ≈ `$30–80`, scales with how much the elder records.
  `TODO: confirm actual cost per active storyteller.`
- **Decision this affects:** whether a printed book can live in the $99 tier or
  must stay an add-on. As specced, book is add-on at $99 and included at $149.
  If loaded book COGS + software cost exceeds ~$50, the $149 tier margin is thin
  — revisit the $50 gap.
- Lifetime $199 must cover indefinite marginal cost. Do not launch Lifetime
  without the prompting cap / renewal guardrail defined.
- **Export / retention cost (from the "Download everything" feature):** audio is
  kept in durable storage **indefinitely**, including for **cancelled** and
  **Lifetime** accounts that generate no recurring revenue, plus ZIP-generation
  compute and egress bandwidth on each export. Per-account this is small (audio
  storage is cheap) but it is permanent and grows with the install base. It
  belongs in COGS and sets a floor under the Lifetime price. `TODO: estimate
  per-account lifetime storage + egress; add export rate limiting.` See
  `EXPORT_FEATURE.md`.

---

## 7. Design / build notes for the page

- 3 tier cards in a row (stack on mobile); highlight **Keepsake + Book** as the
  recommended card (badge: "Most popular").
- Lifetime as a separate toggle or band, not a 4th card.
- À-la-carte add-ons in a simple table or list below the cards.
- Feature matrix below that.
- Forever-access and voice-QR callouts as visually distinct bands — these are
  the conversion levers, give them room.
- Annual/monthly toggle on the cards if monthly is offered (§2 Tier 1).
- Keep the storyteller-facing tone warm and non-technical; the buyer is usually
  the adult child, not the elder.

---

*Prices and inclusions are recommendations and must be confirmed against actual
costs. This is a product/marketing spec, not financial advice.*

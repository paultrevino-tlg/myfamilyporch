# Build Brief: My Family Porch — Marketing Website (myfamilyporch.net)

> **Paste this whole file into Claude Code as your instruction.** This is for the **public marketing site** at `myfamilyporch.net` — NOT the app itself. The app (the Cloudflare Worker, prompt/recording/transcription flow) already exists in this repo.
>
> **FIRST STEP for Claude Code:** Read `CLAUDE.md`, `SPEC.md`, `package.json`, and `wrangler.jsonc` before doing anything. Reuse any existing brand tokens, colors, fonts, name, and `APP_BASE_URL` from the app so the marketing site and the app feel like one product. If brand tokens already exist, use them; if not, use the direction in §5 below and report what you chose.

---

## 1. PRODUCT BRIEF

| Field | Detail |
|---|---|
| **Name** | My Family Porch |
| **Domain** | myfamilyporch.net |
| **What it is** | A voice-first service that captures a loved one's life stories. The relative receives gentle prompts (via SMS/phone), speaks their answers, and those recordings are transcribed and preserved as a lasting keepsake — voice + written story + photos. |
| **Value proposition** | Capture your parents' and grandparents' stories — in their own voice — before they're gone. |
| **Primary audience** | Adult children, roughly 35–60, who want to preserve an aging parent's or grandparent's memories. Often the tech-comfortable family member setting it up for a less tech-comfortable elder. |
| **Secondary audience** | Gift-givers (birthdays, Mother's/Father's Day, holidays, milestone anniversaries). |
| **Emotional core** | Warmth, legacy, "don't let the stories disappear," the comfort of a front porch conversation. Heartfelt but never saccharine or morbid. |
| **Primary goal of the site** | Get visitors to start / sign up (or gift) — link out to the app signup at `APP_BASE_URL`. |
| **Secondary goals** | Email capture for people not ready to buy; explain how it works to remove doubt. |

> Things I (the human) still need to confirm — mark these as `// TODO: confirm` rather than inventing them: exact pricing/tiers, prompt cadence (e.g. weekly), gift-flow details, and whether output is a printed book, digital archive, or both.

---

## 2. TECH STACK (Cloudflare-native, to match the app)

- **Framework:** **Astro** (content-focused, ships almost no JS — ideal for a fast marketing site). Add a few interactive islands only where needed (mobile nav, FAQ accordion, pricing toggle).
- **Styling:** Tailwind CSS with shared design tokens.
- **Deployment:** **Cloudflare Pages** (keeps everything in the same Cloudflare account/infra as the worker). Confirm with me whether the marketing site should be a separate Pages project at the apex domain with the app on a subdomain (e.g. `app.myfamilyporch.net`), or served by the existing worker. Default to **separate Cloudflare Pages project at the apex, app on a subdomain.**
- **Icons:** lucide.
- **Fonts:** self-hosted, no layout shift.
- **Forms:** email capture posts to a Cloudflare Pages Function / Worker route. Read any keys from env; never hardcode secrets. Provide `.dev.vars.example`.

> Don't introduce React/Next or a second framework if it's not already in the repo. Keep the marketing site lightweight and consistent with the existing toolchain.

---

## 3. THE SITE SHELL ("wrapper")

One layout wrapper used by every page:

- **Header:** logo left; links (How it works, Pricing, Stories, FAQ); a warm primary CTA ("Start your porch" / "Get started" — match app copy). Sticky with subtle background on scroll. Accessible mobile hamburger menu.
- **Footer:** logo + tagline, link columns (Product, Company, Help, Legal), a short reassurance line about privacy of family memories, copyright.
- **Container + spacing tokens** reused everywhere.
- **Centralized SEO/meta wrapper** (see §8) and a skip-to-content link.
- Every CTA links to the real app entry point (`APP_BASE_URL`) or the email-capture form — no dead buttons.

---

## 4. PAGES & SECTIONS

**Home (`/`)**
1. **Hero** — warm headline + subhead + primary CTA + secondary ("See how it works"). Visual: a warm porch scene / a phone showing a recording prompt / a finished keepsake. Example headline direction: *"Your family's stories, kept in their own voice."* Subhead names the fear it solves (losing the stories).
2. **The problem, gently** — a short, heartfelt section: the stories we mean to ask about and never do.
3. **How it works** — 3 steps: (1) Set it up for your loved one in minutes, (2) They get gentle prompts and just talk, (3) Their voice + stories become a keepsake you'll keep forever.
4. **Why voice matters** — the emotional differentiator: it's *their voice*, not just text. Works for non-tech-comfortable elders (answer a prompt, no app to learn).
5. **What you get** — the keepsake output (voice playback, written stories, photos) `// TODO: confirm format`.
6. **Social proof / testimonials** — 2–3 warm family quotes with name + relationship + avatar placeholder. `// TODO: real quotes`.
7. **Pricing** — tiers + gift option, recommended plan highlighted. `// TODO: confirm pricing`.
8. **FAQ** — accessible accordion: Does my parent need a smartphone? What if they're not techy? Is it private/secure? What do I receive at the end? Can I give it as a gift? How are the recordings stored?
9. **Final CTA band** — restate value + primary action, with a gentle line about not waiting.

**Other pages**
- `/how-it-works` (expanded version of the home section)
- `/pricing` (if not only on home) — include the gift flow
- `/stories` or `/about` — the brand story; why "the porch"
- `/gift` — gifting landing page (gifting is a major use case; give it its own page)
- `/contact` / `/help`
- `/privacy`, `/terms` — real placeholder copy, **emphasize how family recordings and data are protected** (this is a top buyer concern)
- Custom on-brand **404**

---

## 5. BRAND & DESIGN DIRECTION

*(Use the app's existing tokens if `CLAUDE.md`/`SPEC.md` define them. Otherwise use this.)*

- **Mood:** warm, nostalgic, trustworthy, unhurried. The feeling of a front porch at golden hour — not corporate, not clinical, not a cold tech startup.
- **Palette:** warm neutrals (cream, warm white, soft tan) + a grounded earthy accent (terracotta / dusty clay or warm honey) + a calm secondary (sage green or dusk blue). Generous warm whitespace. Support light mode primarily; tasteful dark mode optional.
- **Typography:** a warm, editorial **serif** for headings (humanist, friendly — not stiff) + a clean, highly readable **sans-serif** for body. Slightly larger body text and generous line-height (audience skews older; legibility matters).
- **Imagery:** porch/home warmth, hands, generations together, golden light. Prefer crafted SVG/illustration accents (porch silhouette, rocking chair, sound-wave-as-keepsake motif) over stock-photo clichés. If photos are used, warm and authentic, with `alt` text and a `// TODO: replace asset`.
- **Signature element:** tie a "porch" motif through the site (e.g. a soft porch-light glow on CTAs, or a sound-wave that doubles as a porch railing). One distinctive, ownable detail — avoid generic AI/startup gradients.
- **Motion:** gentle, slow, fade/rise on scroll; respect `prefers-reduced-motion`.
- **Accessibility note:** because of the older/secondary audience, hold to large tap targets, AA+ contrast, and clear focus states.

Build a real design system (tokens + reusable components: Button, Card, Section, Container, Accordion, Nav, Footer) **before** building pages.

---

## 6. GRAPHICS & ASSETS

- **Logo / wordmark:** "My Family Porch" wordmark in the heading serif + a small porch/house/chair/porch-light mark. Deliver as SVG.
- **Favicon set:** `favicon.ico`, `apple-touch-icon.png`, SVG icon, web manifest.
- **OG / social share image** (1200×630): warm, on-brand, e.g. the wordmark over a soft porch scene with the value-prop line. Generate it; add Twitter card meta. (Gifting + sharing means this image will travel — make it lovely.)
- **Hero & section visuals:** crafted SVG/illustration in the palette; a tasteful phone-mockup showing a prompt + record button; a keepsake mockup.
- **Icons:** lucide, themed to the palette.
- Optimize all assets; size every image to prevent layout shift.

---

## 7. FORMS & CONVERSION

- **Primary CTA** → app signup at `APP_BASE_URL` (read from config; don't hardcode).
- **Email capture** (for not-ready visitors): name + email, zod-style validation, loading + success + error states, honeypot. Posts to a Pages Function/Worker route; log + `// TODO: connect to [email provider]` if no provider is given.
- **Gift CTA** → gift flow / `/gift` page.
- No secrets in code; provide `.dev.vars.example`.

---

## 8. SEO

- Per-page title + meta description (Astro). Lead with the emotional + keyword angle ("preserve your parents' life stories in their voice").
- OG + Twitter cards; `sitemap.xml`; `robots.txt`.
- One `h1` per page, semantic structure.
- JSON-LD: Organization on home; FAQ schema on the FAQ; Product/Offer on pricing.
- Canonical URLs; descriptive slugs; meaningful `alt` text.

---

## 9. PERFORMANCE & QUALITY BARS

- **Lighthouse 90+** (Performance, Accessibility, Best Practices, SEO) on mobile.
- No layout shift; fonts + images sized; preload the hero/LCP image.
- Minimal JS — only the interactive islands need it.
- Works 320px → 1440px+; test common breakpoints.
- Keyboard-navigable; visible focus; WCAG AA contrast (lean AAA on body text given the audience); no console errors.

---

## 10. LEGAL & TRUST

- Privacy + Terms with real, editable placeholder copy, **specifically addressing how family voice recordings and personal data are stored, who can access them, and that they're never sold** — this is the #1 trust question for this product.
- Cookie/consent banner only if analytics/non-essential cookies are used; default to privacy-preserving.

---

## 11. BUILD SEQUENCE

1. Read `CLAUDE.md`, `SPEC.md`, `package.json`, `wrangler.jsonc`; report the brand tokens, name, and `APP_BASE_URL` you'll reuse.
2. Confirm site/app topology (apex marketing + app subdomain — default) and where CTAs should point.
3. Scaffold Astro + Tailwind + tokens + fonts.
4. Build the design system / components.
5. Build the site shell (header, footer, layout, SEO wrapper).
6. Build Home section by section.
7. Build remaining pages (how-it-works, pricing, gift, about/stories, contact, privacy, terms, 404).
8. Generate graphics (logo, favicon, OG, section visuals).
9. Wire CTAs to the app + email capture.
10. SEO, sitemap, structured data.
11. Accessibility + performance pass (§9).
12. Run the launch checklist (§12) and report pass/fail per item.

After each phase, summarize what you built and what's left. **Ask me before** adding any paid service, external API, or anything needing my credentials, and before pointing CTAs at a URL you're guessing.

---

## 12. LAUNCH CHECKLIST (report pass/fail)

- [ ] Reuses the app's brand/name/`APP_BASE_URL` — marketing site and app feel like one product
- [ ] All pages render with no errors at all breakpoints
- [ ] Every CTA links to the real app or gift/email flow — no dead buttons
- [ ] Email capture validates and shows success/error
- [ ] Favicon + OG image render correctly (test a share preview)
- [ ] Unique meta titles/descriptions per page; FAQ + Org JSON-LD present
- [ ] sitemap.xml, robots.txt, custom 404 present
- [ ] Lighthouse 90+ across the board (mobile)
- [ ] Body text large & legible; AA+ contrast; keyboard + screen-reader navigable
- [ ] Privacy/Terms address recording storage & data protection
- [ ] No hardcoded secrets; `.dev.vars.example` provided
- [ ] `README.md` with setup + Cloudflare Pages deploy steps
- [ ] Clean build, no type errors

---

## 13. DELIVERABLES

- Marketing site codebase (Astro + Tailwind), committed in logical steps
- All generated assets in `/public`
- `README.md` (setup, env, Cloudflare Pages deploy) + `.dev.vars.example`
- A short summary of design decisions and the open `// TODO`s I need to finish: confirm **pricing**, **prompt cadence**, **keepsake format**, real **testimonials**, real **photos**, **email provider**, and **final CTA destinations**.

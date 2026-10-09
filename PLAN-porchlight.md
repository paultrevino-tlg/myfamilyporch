# PLAN — Porchlight redesign (design direction 1, site-wide)

Source: `design-directions/direction-1-porchlight.html` (Kodachrome-era warm
photographic editorial; honors SPEC §5 brand brief). Approved 2026-10-09.

Architecture: master architecture file § Release flow — not applied; user chose
to ship each step straight to `main` (push == deploy). Prod will mix new tokens
with old marketing layouts between steps 1 and 3.

## Palette (contrast-corrected)
| Token role | Value | Notes |
|---|---|---|
| cream (page) | `#FBF6EC` | |
| paper (inset) | `#F3EADA` | |
| umber (ink) | `#2C221B` | 14.4:1 on cream |
| clay (brand) | `#9A4A30` | direction's `#B45B3E` is 4.33:1 — fails AA; deepened to 5.74:1 |
| honey (decor) | `#D9962F` | 2.33:1 — never as text |
| honey-ink (accent text) | `#8A5A12` | 5.49:1 on cream |

Status colors (emerald/amber/red) stay — they carry meaning.

## Steps (each its own Gate 2)
1. **Tokens + type + email** — retheme Tailwind tokens (names kept), drop blue
   gradients/themeColor, Atkinson Hyperlegible body site-wide, Fraunces display,
   pill buttons, hairline cards, clay focus ring, sky gradients → clay/honey;
   recolor the master email template (`lib/email/render.ts`); hardcoded blue hex
   in app/storyteller pages.
2. **Home page + header/footer** — full-bleed photo hero, listening slip, sticky
   header (scrim → solid), editorial sections, footer. Move the 3 direction-1
   images into `/public`.
3. **Remaining marketing pages** — about, how-it-works, why, gift, pricing, faq,
   contact (editorial layout); privacy/terms/sms (type + spacing). New imagery via
   CreativeClaw where a page needs it (prompts listed at Gate 2).

Also: update SPEC brand section + token comments.

## Testing (per step)
Typecheck, production build, screenshots at phone + desktop of affected pages,
contrast check of every text pairing.

## Progress
- [x] Step 1 — 2026-10-09: tokens, Atkinson site-wide, pills/hairline cards,
  hardcoded blues, email template, print book, SPEC section. tsc + next build
  clean; contrast table passes AA; screenshots (home, pricing, login, email,
  storyteller) at 1280/390. Dashboard not visually checked (needs a real login).
  Open: storyteller BigButton green / "Maybe later" red — decide in step 2.
- [ ] Step 2
- [ ] Step 3

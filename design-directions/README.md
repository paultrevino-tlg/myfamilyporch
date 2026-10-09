# Design directions — My Family Porch

Four **deliberately different** visual directions for the marketing site. Same real
content in every file (pulled from `src/app/(marketing)`, `src/lib/pricing.ts`,
`supabase/seed/prompts-seed.json`) — the *only* thing that changes between them is
the visual language.

Open any file directly in a browser. Each is a standalone HTML page: no build step,
no dependencies beyond Google Fonts and the CreativeClaw-hosted imagery.

| # | Direction | Lineage | Colour rule | Brand tokens |
|---|---|---|---|---|
| 1 | [Porchlight](direction-1-porchlight.html) | Kodachrome-era warm photographic editorial | Four warm pigments, zero blue | Honors the **written brief** (§5) |
| 2 | [The Archive](direction-2-the-archive.html) | Swiss / International typographic, as a finding aid | Paper + ink + one blue, flat only | Honors the **code tokens** exactly |
| 3 | [Kitchen Table](direction-3-kitchen-table.html) | Maximalist analog collage / family ephemera | Real materials only — kraft, ballpoint, stamp | Breaks from both |
| 4 | [Signal](direction-4-signal.html) | Neo-retro instrumentation / amber phosphor terminal | Black + amber + one green, no blue | Keeps only the porch-light amber |

These are **exploration files**, not production code. Nothing here is wired into the
Next app.

## Generated imagery

All photography, texture and duotone plates were generated with CreativeClaw and are
served from `cdn.creativeclaw.co`. If a direction is chosen, its images should be
re-generated at final crops and moved into `/public`.

# Storyline

AI-guided voice interviews that capture a family elder's life stories in a loved
one's cloned voice, and turn them into a keepsake. Multi-tenant: many families,
multiple storytellers across generations.

## Quick start
```bash
npm install
cp .env.example .env.local        # fill in Supabase + provider keys
cp .env.example .dev.vars         # for local Cloudflare runtime
npm run db:push                   # apply migration (or use the Supabase MCP)
npm run db:types
npm run seed:prompts              # load the bilingual prompt library
npm run dev                       # http://localhost:3000
```

## Deploy (Cloudflare)
Two options:
1. **Git integration (recommended):** connect this repo in the Cloudflare
   dashboard (Workers Builds). Build command `npm run build` is wrapped by the
   adapter; the worker entry is `.open-next/worker.js` per `wrangler.jsonc`.
2. **GitHub Action:** see `.github/workflows/deploy.yml`. Set repo secrets
   `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

Set runtime secrets with `wrangler secret put NAME` (mirror them in `.dev.vars`
for local dev).

## Where to start coding
Open in VS Code with Claude Code. It reads `CLAUDE.md` on startup, which points
it at `TODO.md`. Begin at **Phase 0**.

## Layout
See `CLAUDE.md` → "Repo map" and `docs/ARCHITECTURE.md`.

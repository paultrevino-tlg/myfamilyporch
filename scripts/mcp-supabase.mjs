#!/usr/bin/env node
// Local Supabase MCP launcher.
//
// Loads the account-wide Personal Access Token from the gitignored .dev.vars
// (so the secret lives in exactly one place, never in a committed config), then
// execs the Supabase MCP server pinned to this project's ref. Referenced by the
// committed .mcp.json. See ~/.claude/architecture.md → "Local-token MCP
// credentials (cache the PAT in .dev.vars)".
//
// Usage:
//   node scripts/mcp-supabase.mjs          # parse .dev.vars, exec the MCP server
//   node scripts/mcp-supabase.mjs --check   # validate token loads, print masked, exit 0

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_REF = 'pvavxajlbtdxyxaurioe';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, '..');
const devVarsPath = join(repoRoot, '.dev.vars');

// Minimal dotenv parse: KEY=value lines, ignore blanks/comments, strip one
// layer of surrounding quotes. Does not overwrite an already-set env var.
function loadDevVars(path) {
  let content;
  try {
    content = readFileSync(path, 'utf8');
  } catch (err) {
    console.error(`[mcp-supabase] could not read ${path}: ${err.message}`);
    return;
  }
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadDevVars(devVarsPath);

const token = process.env.SUPABASE_ACCESS_TOKEN;

if (process.argv.includes('--check')) {
  const masked = token
    ? `${token.slice(0, 7)}…${token.slice(-4)} (len ${token.length})`
    : '(missing)';
  console.error(`[mcp-supabase] SUPABASE_ACCESS_TOKEN: ${masked}`);
  console.error(`[mcp-supabase] --project-ref=${PROJECT_REF}`);
  process.exit(token ? 0 : 1);
}

if (!token) {
  console.error(
    `[mcp-supabase] SUPABASE_ACCESS_TOKEN not found in ${devVarsPath} or env. ` +
      `Add it to .dev.vars (gitignored).`
  );
  process.exit(1);
}

// Pass the full command as one shell string (not an args array): shell:true is
// required to launch npx.cmd on Windows, and using a single string avoids the
// DEP0190 unescaped-args warning. PROJECT_REF is a static constant — no injection.
const child = spawn(
  `npx -y @supabase/mcp-server-supabase@latest --project-ref=${PROJECT_REF}`,
  { stdio: 'inherit', shell: true, env: process.env }
);

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});

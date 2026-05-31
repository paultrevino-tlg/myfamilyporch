/**
 * Seed the GLOBAL prompt library (family_id = null) from the JSON files.
 * Uses the service role (server-only). Run: npm run seed:prompts
 */
import { createClient } from "@supabase/supabase-js";
import en from "./prompts-seed.json";
import es from "./prompts-seed-es.json";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

const db = createClient(url, key, { auth: { persistSession: false } });

type Row = {
  category: string; prompt: string; applies_to: string[];
  emotional_weight: string; photo_friendly: boolean; warm_up: boolean; follow_ups: string[];
};

async function main() {
  const rows = [
    ...(en.prompts as Row[]).map((p) => ({ ...p, lang: "en" })),
    ...(es.prompts as any[]).map((p) => ({
      category: p.category, prompt: p.prompt, applies_to: p.applies_to,
      emotional_weight: p.emotional_weight, photo_friendly: p.photo_friendly,
      warm_up: p.warm_up, follow_ups: p.follow_ups, lang: "es",
    })),
  ].map((p) => ({
    family_id: null,
    lang: p.lang,
    category: p.category,
    prompt: p.prompt,
    applies_to: p.applies_to,
    emotional_weight: p.emotional_weight,
    photo_friendly: p.photo_friendly,
    warm_up: p.warm_up,
    follow_ups: p.follow_ups,
  }));

  const { error } = await db.from("prompts").insert(rows);
  if (error) throw error;
  console.log(`Seeded ${rows.length} global prompts.`);
}
main().catch((e) => { console.error(e); process.exit(1); });

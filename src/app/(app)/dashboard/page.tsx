import { supabaseServer } from "@/lib/supabase/server";

// Overview. RLS scopes everything to the member's families automatically.
export default async function Dashboard() {
  const sb = await supabaseServer();
  const { data: storytellers } = await sb.from("storytellers").select("id,name,language");
  return (
    <main className="p-8">
      <h1 className="font-semibold text-2xl">How&apos;s everyone doing?</h1>
      {/* TODO 5.1: status cards + 3 signals + recent stories */}
      <pre className="mt-4 text-sm text-ink/60">{JSON.stringify(storytellers ?? [], null, 2)}</pre>
    </main>
  );
}

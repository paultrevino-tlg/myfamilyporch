import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

// Authenticated family/admin area. TODO 1.1: enforce auth + family context.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  return <div className="min-h-screen">{children}</div>;
}

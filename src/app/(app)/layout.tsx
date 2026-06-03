import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership, getFamilies } from "@/lib/auth";
import TopNav from "./TopNav";

// Authenticated family/admin area. Enforces auth, then renders the shared site
// nav (brand, sections, family switcher, account) above every page.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const [active, families] = await Promise.all([getActiveMembership(), getFamilies()]);

  return (
    <div className="min-h-screen">
      <TopNav
        families={families}
        activeFamilyId={active?.family_id ?? null}
        activeFamilyName={active?.name ?? null}
        email={user.email ?? ""}
      />
      {children}
    </div>
  );
}

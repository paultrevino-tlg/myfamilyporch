import { notFound, redirect } from "next/navigation";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import { loadMoveContext } from "@/lib/reassign";
import MoveStoryView from "./MoveStoryView";

// Move a story to a different question (TODO 5.9). Admin-only. Its own page
// rather than an inline picker on every story card: the library is ~70
// questions per language, and repeating it under each story would bloat
// /stories. This file guards and loads; MoveStoryView renders.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MoveStoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const active = await getActiveMembership();
  if (!active) redirect("/onboarding");
  if (!roleAtLeast(active.role, "admin")) redirect("/stories");

  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const move = await loadMoveContext(active.family_id, id);
  if (!move) notFound();
  const { error } = await searchParams;

  return <MoveStoryView move={move} error={error} />;
}

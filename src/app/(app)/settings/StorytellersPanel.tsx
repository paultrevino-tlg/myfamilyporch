import Link from "next/link";
import type { StorytellerStat } from "@/lib/overview";
import { Photo } from "@/components/Photo";
import StorytellerGrid from "../StorytellerGrid";

// My Settings' storyteller cards, set on the porch: the photograph fills the
// panel and the cards sit on it, covering it in parts. The top is darkened so
// the cream heading reads; the cards carry their own light surface.
export default function StorytellersPanel({
  stats,
  canManage,
}: {
  stats: StorytellerStat[];
  canManage: boolean;
}) {
  return (
    <section className="relative mt-7 overflow-hidden rounded-2xl">
      <Photo
        name="chairs"
        sizes="(min-width: 768px) 48rem, 100vw"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "35% 60%" }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-[rgba(44,34,27,.82)] via-[rgba(44,34,27,.3)] to-[rgba(44,34,27,.1)]"
      />
      <div className="relative p-4 sm:p-6">
        {/* on-dark: cream focus ring for the heading row only — the cards are light. */}
        <div className="on-dark mb-4 flex items-center justify-between px-1 [text-shadow:0_1px_8px_rgba(44,34,27,.7)]">
          <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-cream">Storytellers</h2>
          {canManage && (
            <Link href="/storytellers/new" className="text-sm font-semibold text-cream hover:underline">
              Add storyteller →
            </Link>
          )}
        </div>
        <StorytellerGrid stats={stats} canAdd={canManage} onPhoto />
      </div>
    </section>
  );
}

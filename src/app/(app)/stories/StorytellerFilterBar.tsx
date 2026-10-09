import Link from "next/link";
import type { StorytellerFilter } from "@/lib/stories";

// The storyteller filter on /stories (TODO 5.10): All + one pill per
// storyteller with a count. Links, not buttons — the filter lives in the URL
// (?storyteller=<id>), so it survives a reload and can be shared. Hidden when
// there is only one storyteller to choose.
export default function StorytellerFilterBar({
  filters,
  selected,
  total,
}: {
  filters: StorytellerFilter[];
  selected: string | null;
  total: number;
}) {
  if (filters.length < 2) return null;
  return (
    <nav aria-label="Filter by storyteller" className="mt-5 flex flex-wrap gap-2">
      <FilterPill href="/stories" current={!selected} label="All" count={total} />
      {filters.map((f) => (
        <FilterPill
          key={f.id}
          href={`/stories?storyteller=${f.id}`}
          current={selected === f.id}
          label={f.name}
          count={f.count}
        />
      ))}
    </nav>
  );
}

function FilterPill({
  href,
  current,
  label,
  count,
}: {
  href: string;
  current: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
        current ? "bg-brand text-white" : "border border-line bg-surface text-ink/75 hover:bg-surface2"
      }`}
    >
      {label} <span className={current ? "text-white/80" : "text-ink/70"}>· {count}</span>
    </Link>
  );
}

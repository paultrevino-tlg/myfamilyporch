import Link from "next/link";
import type { StorytellerStat } from "@/lib/overview";

// The dashboard's per-storyteller summary cards, extracted so both the
// Overview and My Settings can render the same grid. RLS-scoped data comes in
// via `stats` (loadStorytellerStats); each card links into that elder's hub.

// A calm relative day ("Today", "Fri", "12 days ago") — never a raw timestamp
// on the elder-adjacent surface.
function relDay(iso: string): string {
  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return then.toLocaleDateString("en-US", { weekday: "short" });
  return `${days} days ago`;
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Stable avatar gradient per storyteller, from a small blue-family palette.
const AVATARS = [
  "from-[#3B82F6] to-[#1D4ED8]",
  "from-[#0EA5E9] to-[#0369A1]",
  "from-[#6366F1] to-[#4338CA]",
  "from-[#22A6B3] to-[#0E7490]",
];
function avatarClass(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % AVATARS.length;
  return AVATARS[h];
}

// The card grid plus the empty state. Pages wrap this with their own heading.
export default function StorytellerGrid({ stats }: { stats: StorytellerStat[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {stats.map((s) => (
        <StorytellerBlock key={s.id} stat={s} />
      ))}
      {stats.length === 0 && (
        <p className="card col-span-full px-4 py-8 text-center text-sm text-ink/50">
          No storytellers yet.{" "}
          <Link href="/storytellers/new" className="link">
            Add one
          </Link>
          .
        </p>
      )}
    </div>
  );
}

// A small progress ring for "this week vs. target". `tone` colors the arc.
function Ring({ value, total, tone }: { value: number; total: number | null; tone: "ok" | "warn" }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const pct = total && total > 0 ? Math.min(1, value / total) : 0;
  const stroke = tone === "warn" ? "#B5791A" : "#2563EB";
  return (
    <div className="relative h-14 w-14 flex-none">
      <svg width="56" height="56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#E1E9F2" strokeWidth="6" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center text-sm font-bold leading-none">
        {value}
        {total != null && <small className="text-[9px] font-semibold text-ink/50">of {total}</small>}
      </div>
    </div>
  );
}

// One storyteller's card: avatar, name, status chip, a weekly progress ring,
// then the four status metrics. The whole card links into the hub.
function StorytellerBlock({ stat }: { stat: StorytellerStat }) {
  const quietDays = stat.lastSessionAt ? daysSince(stat.lastSessionAt) : null;
  const onTrack = stat.lastSessionFresh;
  const tone: "ok" | "warn" = onTrack ? "ok" : "warn";

  return (
    <Link href={`/storytellers/${stat.id}`} className="card p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-3.5">
        <div
          className={`grid h-12 w-12 flex-none place-items-center rounded-full bg-gradient-to-br ${avatarClass(stat.id)} text-base font-bold text-white`}
        >
          {initials(stat.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold tracking-tight">{stat.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="chip bg-surface2 text-ink/65 ring-1 ring-line">
              {stat.language === "es" ? "Español" : "English"}
            </span>
            {onTrack ? (
              <span className="chip bg-brand/10 text-brand">
                <span className="h-1.5 w-1.5 rounded-full bg-current" /> On track
              </span>
            ) : quietDays != null ? (
              <span className="chip bg-amber-100 text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-current" /> Quiet {quietDays}d
              </span>
            ) : (
              <span className="chip bg-surface2 text-ink/50 ring-1 ring-line">Not started</span>
            )}
          </div>
        </div>
        <Ring value={stat.thisWeekCount} total={stat.weeklyTarget} tone={tone} />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2.5">
        <Stat label="Last" value={stat.lastSessionAt ? relDay(stat.lastSessionAt) : "—"} good={onTrack} small />
        <Stat label="This week" value={String(stat.thisWeekCount)} sub={stat.weeklyTarget != null ? `/${stat.weeklyTarget}` : undefined} />
        <Stat label="Stories" value={String(stat.storiesSaved)} />
        <Stat label="Topics" value={String(stat.topicsTouched)} sub={stat.topicsTotal ? `/${stat.topicsTotal}` : undefined} />
      </div>
    </Link>
  );
}

function Stat({
  label,
  value,
  sub,
  good,
  small,
}: {
  label: string;
  value: string;
  sub?: string;
  good?: boolean;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface2 px-3 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-ink/45">{label}</div>
      <div className={`mt-1.5 font-medium leading-none tracking-tight ${small ? "text-base" : "text-2xl"} ${good ? "text-brand" : "text-ink"}`}>
        {value}
        {sub && <span className="ml-0.5 text-xs font-medium text-ink/35">{sub}</span>}
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import {
  loadSchedules,
  DAY_CODES,
  TIMEZONES,
  type DayCode,
  type StorytellerSchedule,
} from "@/lib/schedule";
import { saveSchedule, askNow } from "./actions";

// Schedule (TODO 5.4). "A gentle weekly rhythm — never more than this." Admins
// set the days/time/quiet-hours/pause and can ask right now; viewers see a
// calm read-only summary. RLS (sch_write = admin) is the real boundary.
export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; sent?: string }>;
}) {
  const active = await getActiveMembership();
  if (!active) redirect("/onboarding");

  const sp = await searchParams;
  const canManage = roleAtLeast(active.role, "admin");
  const storytellers = await loadSchedules(active.family_id);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl">When we reach out</h1>
          <p className="mt-1 text-sm text-ink/60">
            A gentle weekly rhythm — never more than this.
          </p>
        </div>
        <Link href="/dashboard" className="text-sm text-ink/60 underline">
          Back to overview
        </Link>
      </div>

      {sp.saved === "1" && (
        <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          Schedule saved. 🗓️
        </p>
      )}
      {sp.sent === "asked" && (
        <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          We sent the question. 💬
        </p>
      )}
      {sp.sent === "asked_no-phone" && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-ink/70">
          Nothing sent — that storyteller has no phone number on file. Add one in their details.
        </p>
      )}
      {sp.sent === "asked_no-link" && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-ink/70">
          Nothing sent — couldn&apos;t build a recording link. The storyteller-token secret may
          not be configured.
        </p>
      )}
      {sp.sent === "asked_failed" && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Couldn&apos;t send it. The SMS provider may not be configured.
        </p>
      )}

      {storytellers.length === 0 && (
        <p className="mt-8 rounded-2xl border bg-white/40 px-4 py-8 text-center text-sm text-ink/50">
          No storytellers yet.{" "}
          <Link href="/storytellers" className="underline">
            Add one
          </Link>
          .
        </p>
      )}

      {storytellers.map((st) => (
        <ScheduleBlock key={st.id} st={st} canManage={canManage} />
      ))}
    </main>
  );
}

const DAY_LABEL: Record<DayCode, string> = {
  SU: "Su",
  MO: "Mo",
  TU: "Tu",
  WE: "We",
  TH: "Th",
  FR: "Fr",
  SA: "Sa",
};

// "10:00" → "10:00 AM" for the read-only / pill display.
function prettyTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// Friendly label for a stored IANA zone; falls back to the raw id for any
// value not in the curated picker list.
function tzLabel(tz: string): string {
  return TIMEZONES.find((z) => z.value === tz)?.label ?? tz;
}

function daysSummary(days: DayCode[]): string {
  if (days.length === 0) return "No days set";
  if (days.length === 7) return "Every day";
  return DAY_CODES.filter((d) => days.includes(d))
    .map((d) => DAY_LABEL[d])
    .join(" · ");
}

function ScheduleBlock({
  st,
  canManage,
}: {
  st: StorytellerSchedule;
  canManage: boolean;
}) {
  const dayset = new Set(st.days);

  return (
    <section className="mt-8 rounded-2xl border bg-white/40 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium text-lg">{st.name}</h2>
        {st.paused && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
            Paused
          </span>
        )}
      </div>

      {!canManage ? (
        // Viewer: calm read-only summary.
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Days">{daysSummary(st.days)}</Row>
          <Row label="Time">{prettyTime(st.sendTimeLocal)}</Row>
          <Row label="Timezone">{tzLabel(st.timezone)}</Row>
          <Row label="Questions per session">{st.questionsPer === 1 ? "1" : "1–2"}</Row>
          <Row label="Quiet hours">
            {st.quietAfter ? `After ${prettyTime(st.quietAfter)}` : "Not set"}
          </Row>
        </dl>
      ) : (
        <form action={saveSchedule} className="mt-4 space-y-5">
          <input type="hidden" name="storyteller_id" value={st.id} />

          <div>
            <div className="font-medium text-sm">Days</div>
            <p className="text-xs text-ink/50">The text arrives these mornings.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DAY_CODES.map((d) => {
                const on = dayset.has(d);
                return (
                  <label
                    key={d}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                      on ? "border-ink bg-ink text-white" : "text-ink/60 hover:bg-ink/5"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="days"
                      value={d}
                      defaultChecked={on}
                      className="sr-only"
                    />
                    {DAY_LABEL[d]}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex flex-col text-sm">
              <span className="font-medium">Time</span>
              <span className="text-xs text-ink/50">In their local time.</span>
              <input
                type="time"
                name="send_time_local"
                defaultValue={st.sendTimeLocal}
                className="mt-1 rounded-lg border px-3 py-2 text-base"
              />
            </label>

            <label className="flex flex-col text-sm">
              <span className="font-medium">Timezone</span>
              <span className="text-xs text-ink/50">Where they are.</span>
              <select
                name="timezone"
                defaultValue={st.timezone}
                className="mt-1 rounded-lg border px-3 py-2 text-base"
              >
                {/* Keep an unknown stored zone selectable rather than silently swapping it. */}
                {!TIMEZONES.some((z) => z.value === st.timezone) && (
                  <option value={st.timezone}>{st.timezone}</option>
                )}
                {TIMEZONES.map((z) => (
                  <option key={z.value} value={z.value}>
                    {z.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col text-sm">
              <span className="font-medium">Questions per session</span>
              <span className="text-xs text-ink/50">Kept short on purpose.</span>
              <select
                name="questions_per"
                defaultValue={String(st.questionsPer)}
                className="mt-1 rounded-lg border px-3 py-2 text-base"
              >
                <option value="1">1</option>
                <option value="2">1–2</option>
              </select>
            </label>

            <label className="flex flex-col text-sm">
              <span className="font-medium">Quiet hours</span>
              <span className="text-xs text-ink/50">Never ring after this.</span>
              <input
                type="time"
                name="quiet_after"
                defaultValue={st.quietAfter ?? ""}
                className="mt-1 rounded-lg border px-3 py-2 text-base"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="paused"
              defaultChecked={st.paused}
              className="h-4 w-4 rounded border"
            />
            <span>
              <span className="font-medium">Pause everything</span>
              <span className="text-ink/50"> — if he&apos;s traveling or unwell.</span>
            </span>
          </label>

          <button
            type="submit"
            className="rounded-lg bg-ink px-4 py-2 font-medium text-white"
          >
            Save
          </button>
        </form>
      )}

      {canManage && (
        // "Ask now" sits outside the Save form so it posts on its own.
        <form action={askNow} className="mt-4 border-t pt-4">
          <input type="hidden" name="storyteller_id" value={st.id} />
          <button
            type="submit"
            className="rounded-full border border-ink px-4 py-1.5 text-sm hover:bg-ink/5"
          >
            Ask now
          </button>
          <span className="ml-3 text-xs text-ink/50">
            Send a question right away, outside the schedule.
          </span>
        </form>
      )}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink/50">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

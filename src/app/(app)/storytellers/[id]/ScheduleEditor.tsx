import { saveSchedule, askNow } from "../../schedule/actions";
import {
  DAY_CODES,
  DAY_LABEL,
  TIMEZONES,
  SENSITIVITY_LABEL,
  daysSummary,
  prettyTime,
  tzLabel,
  type StorytellerSchedule,
} from "@/lib/schedule";
import SaveButton from "./SaveButton";

// The storyteller schedule editor, extracted from the hub so the setup wizard
// renders the SAME form. Admins edit; viewers get the read-only list.
//
// This matters more than it looks: runScheduler only iterates rows in the
// schedules table, so a storyteller with no schedule is never considered and
// never nudged -- which is why the setup wizard makes this a required step
// rather than an optional one.
export default function ScheduleEditor({
  st,
  canManage,
  from,
}: {
  st: StorytellerSchedule;
  canManage: boolean;
  // Rendered inside the setup wizard: return there after saving, and hide
  // "Ask now" — the storyteller hasn't opted in yet, so the pre-send gate would
  // block it and offering the button would just confuse.
  from?: "setup";
}) {
  const dayset = new Set(st.days);

  if (!canManage) {
    return (
      <dl className="space-y-2 text-sm">
        <ScheduleRow label="Days">{daysSummary(st.days)}</ScheduleRow>
        <ScheduleRow label="Time">{prettyTime(st.sendTimeLocal)}</ScheduleRow>
        <ScheduleRow label="Timezone">{tzLabel(st.timezone)}</ScheduleRow>
        <ScheduleRow label="Questions per session">{st.questionsPer === 1 ? "1" : "1–2"}</ScheduleRow>
        <ScheduleRow label="Quiet hours">
          {st.quietAfter ? `After ${prettyTime(st.quietAfter)}` : "Not set"}
        </ScheduleRow>
        {st.paused && <ScheduleRow label="Status">Paused</ScheduleRow>}
        <ScheduleRow label="“Recording less” alert">
          {st.engagementEnabled ? `On · ${SENSITIVITY_LABEL[st.engagementSensitivity]}` : "Off"}
        </ScheduleRow>
        <ScheduleRow label="Better-time suggestion">
          {st.scheduleSuggestionEnabled ? "On" : "Off"}
        </ScheduleRow>
      </dl>
    );
  }

  return (
    <>
      <form action={saveSchedule} className="space-y-5">
        <input type="hidden" name="storyteller_id" value={st.id} />
        {from && <input type="hidden" name="from" value={from} />}

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
                  <input type="checkbox" name="days" value={d} defaultChecked={on} className="sr-only" />
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
              className="mt-1 input"
            />
          </label>

          <label className="flex flex-col text-sm">
            <span className="font-medium">Timezone</span>
            <span className="text-xs text-ink/50">Where they are.</span>
            <select
              name="timezone"
              defaultValue={st.timezone}
              className="mt-1 input"
            >
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
              className="mt-1 input"
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
              className="mt-1 input"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="paused" defaultChecked={st.paused} className="h-4 w-4 rounded border" />
          <span>
            <span className="font-medium">Pause everything</span>
            <span className="text-ink/50"> — if they&apos;re traveling or unwell.</span>
          </span>
        </label>

        {/* Check-in alerts (TODO 6.5) — the adaptive signals are opt-out/tunable;
            mic-failed always surfaces (it's an acute technical fault). */}
        <div className="border-t border-line pt-4">
          <div className="text-sm font-medium">Check-in alerts</div>
          <p className="text-xs text-ink/50">
            Quiet, optional heads-ups about how {st.name} is doing. Paused storytellers are
            never flagged.
          </p>

          <div className="mt-3 space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="signal_engagement_enabled"
                defaultChecked={st.engagementEnabled}
                className="mt-0.5 h-4 w-4 rounded border"
              />
              <span>
                <span className="font-medium">Tell me if they&apos;re recording less than usual</span>
                <span className="block text-ink/50">
                  A gentle nudge to reach out — compared only to their own pace, never a diagnosis.
                </span>
              </span>
            </label>

            <label className="ml-6 flex flex-col text-sm">
              <span className="font-medium">How sensitive</span>
              <span className="text-xs text-ink/50">
                Gentle flags only a big drop; sensitive flags a smaller one.
              </span>
              <select
                name="signal_engagement_sensitivity"
                defaultValue={st.engagementSensitivity}
                className="mt-1 input w-44"
              >
                <option value="gentle">Gentle</option>
                <option value="standard">Standard</option>
                <option value="sensitive">Sensitive</option>
              </select>
            </label>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="signal_schedule_suggestion_enabled"
                defaultChecked={st.scheduleSuggestionEnabled}
                className="mt-0.5 h-4 w-4 rounded border"
              />
              <span>
                <span className="font-medium">Suggest a better time</span>
                <span className="block text-ink/50">
                  If {st.name} tends to record at a different hour than we reach out.
                </span>
              </span>
            </label>
          </div>
        </div>

        <SaveButton />
      </form>

      {/* "Ask now" posts on its own, outside the Save form. Hidden during setup:
          the storyteller hasn't opted in yet, so preSendGate would block it. */}
      <form action={askNow} className={`mt-4 border-t border-line pt-4 ${from ? "hidden" : ""}`}>
        <input type="hidden" name="storyteller_id" value={st.id} />
        <button
          type="submit"
          className="rounded-full border border-ink px-4 py-1.5 text-sm font-semibold hover:bg-ink/5"
        >
          Ask now
        </button>
        <span className="ml-3 text-xs text-ink/50">
          Send a question right away, outside the schedule.
        </span>
      </form>
    </>
  );
}

function ScheduleRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink/50">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

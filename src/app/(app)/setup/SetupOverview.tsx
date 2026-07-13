import { t, type Lang } from "@/lib/i18n";

// The setup-overview graphic (consent-flow.md), rebuilt as responsive, localized
// HTML/CSS rather than a pasted SVG. Stacks vertically on phones (number + icon
// left, label + sub right), a single horizontal track on wider screens. Color
// carries MEANING, never alone: pine = "you do these" (1-4), slate = "your
// storyteller does these" (5-6), honey = the handoff. The whole thing has one
// descriptive aria-label; the decorative emoji are aria-hidden, so meaning lives
// in the numbers + text. No animation (respects prefers-reduced-motion by
// having none).
type Group = "you" | "them";
const STEPS: { n: number; emoji: string; group: Group }[] = [
  { n: 1, emoji: "✍️", group: "you" },
  { n: 2, emoji: "📱", group: "you" },
  { n: 3, emoji: "👵", group: "you" },
  { n: 4, emoji: "📨", group: "you" },
  { n: 5, emoji: "👍", group: "them" },
  { n: 6, emoji: "🎙️", group: "them" },
];

function circleClasses(group: Group, state: "done" | "active" | "upcoming"): string {
  const you = group === "you";
  if (state === "done") {
    return you
      ? "border-emerald-600 bg-emerald-600 text-white"
      : "border-sky-600 bg-sky-600 text-white";
  }
  const base = you
    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
    : "border-sky-500 bg-sky-50 text-sky-700";
  const ring = state === "active" ? (you ? " ring-4 ring-emerald-200" : " ring-4 ring-sky-200") : "";
  return base + ring;
}

function Step({
  n,
  emoji,
  group,
  lang,
  currentStep,
}: {
  n: number;
  emoji: string;
  group: Group;
  lang: Lang;
  currentStep: number;
}) {
  const state = n < currentStep ? "done" : n === currentStep ? "active" : "upcoming";
  const dim = state === "upcoming" ? " opacity-70" : "";
  return (
    <li className={`flex items-center gap-3 sm:flex-1 sm:flex-col sm:gap-2 sm:text-center${dim}`}>
      <div
        className={`grid h-12 w-12 flex-none place-items-center rounded-full border-2 text-lg font-bold ${circleClasses(
          group,
          state,
        )}`}
      >
        {state === "done" ? "✓" : n}
      </div>
      <div>
        <div className="font-semibold text-ink">
          <span aria-hidden>{emoji} </span>
          {t(lang, `setup_ov_${n}`)}
        </div>
        <div className="text-sm text-ink/55">{t(lang, `setup_ov_${n}_sub`)}</div>
      </div>
    </li>
  );
}

export default function SetupOverview({
  lang,
  currentStep,
}: {
  lang: Lang;
  currentStep: number;
}) {
  return (
    <section aria-label={t(lang, "setup_ov_aria")} lang={lang} className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-xl font-semibold">{t(lang, "setup_ov_header")}</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/60">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
            {t(lang, "setup_ov_legend_you")}
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-sky-600" />
            {t(lang, "setup_ov_legend_them")}
          </span>
        </div>
      </div>

      <ul className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-2">
        <Step {...STEPS[0]} lang={lang} currentStep={currentStep} />
        <Step {...STEPS[1]} lang={lang} currentStep={currentStep} />
        <Step {...STEPS[2]} lang={lang} currentStep={currentStep} />
        <Step {...STEPS[3]} lang={lang} currentStep={currentStep} />
        {/* Handoff (4 → 5): control passes to the storyteller's own phone. */}
        <li aria-hidden className="flex shrink-0 items-center justify-center sm:self-center">
          <span className="whitespace-nowrap rounded-full border border-dashed border-amber-400 px-3 py-1 text-xs font-semibold text-amber-600">
            {t(lang, "setup_ov_handoff")} →
          </span>
        </li>
        <Step {...STEPS[4]} lang={lang} currentStep={currentStep} />
        <Step {...STEPS[5]} lang={lang} currentStep={currentStep} />
      </ul>

      {/* Notification callout — the loop closes back to the member. */}
      <div className="mt-5 flex items-center gap-2.5 rounded-2xl bg-emerald-50 px-4 py-3">
        <span aria-hidden className="text-lg">
          🔔
        </span>
        <p className="text-sm font-medium text-emerald-900">{t(lang, "setup_ov_callout")}</p>
      </div>
    </section>
  );
}

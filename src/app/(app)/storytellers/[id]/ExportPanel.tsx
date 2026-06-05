"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { requestExport } from "../actions";

// "Download everything" panel (TODO 7.6). Shows the live state of the family's
// archive export for this storyteller and the button to (re)generate it. The
// export is async, so while a job is queued/preparing we quietly re-pull the
// server state (router.refresh re-runs the page's RLS-scoped read) so "Ready"
// appears on its own — the emailed link is the belt-and-braces notification.
// Available to EVERY member: downloading your own content is never gated.

export type ExportJob = {
  id: string;
  status: "queued" | "preparing" | "ready" | "failed";
  expiresAt: string | null;
} | null;

function RequestButton({
  storytellerId,
  label,
  className,
}: {
  storytellerId: string;
  label: string;
  className: string;
}) {
  return (
    <form action={requestExport}>
      <input type="hidden" name="storyteller_id" value={storytellerId} />
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}

export default function ExportPanel({
  storytellerId,
  job,
}: {
  storytellerId: string;
  job: ExportJob;
}) {
  const router = useRouter();
  const inProgress = job?.status === "queued" || job?.status === "preparing";
  const expired = !!job?.expiresAt && new Date(job.expiresAt).getTime() < Date.now();
  const ready = job?.status === "ready" && !expired;

  // While a job is building, poll the server state so "Ready" surfaces without
  // a manual refresh. Cleared as soon as it's no longer in progress.
  useEffect(() => {
    if (!inProgress) return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [inProgress, router]);

  return (
    <div className="text-sm">
      <p className="text-ink/60">
        Audio, transcripts, and your book — all yours to keep. One ZIP with every recording.
      </p>

      {ready && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="font-medium text-emerald-800">Your download is ready. ✅</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <a
              href={`/api/export/download?job=${job!.id}`}
              className="btn-primary"
              download
            >
              Download
            </a>
            <RequestButton
              storytellerId={storytellerId}
              label="Make a fresh copy"
              className="btn-ghost"
            />
          </div>
          <p className="mt-2 text-xs text-emerald-700/80">
            Includes the latest stories and book. The link works for a week — make a fresh copy
            any time.
          </p>
        </div>
      )}

      {inProgress && (
        <div className="mt-3 rounded-xl border border-line bg-surface2 p-3">
          <p className="font-medium text-ink/80">Preparing your download…</p>
          <p className="mt-1 text-xs text-ink/55">
            This can take a few minutes for a big archive — we’ll email you when it’s ready, and
            this page updates on its own.
          </p>
        </div>
      )}

      {!ready && !inProgress && (
        <div className="mt-3 flex flex-col gap-2">
          {job?.status === "failed" && (
            <p className="text-xs text-amber-800">
              The last export didn’t finish. You can try again.
            </p>
          )}
          {expired && (
            <p className="text-xs text-ink/55">
              Your previous download has expired — make a fresh one below.
            </p>
          )}
          <RequestButton
            storytellerId={storytellerId}
            label="Download everything"
            className="btn-primary w-fit"
          />
        </div>
      )}
    </div>
  );
}

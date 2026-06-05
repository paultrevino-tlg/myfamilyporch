"use client";

import { useState } from "react";

// Email capture for not-ready visitors (Phase 8.8, brief §7). The marketing
// site's second JS island (after MobileNav) — everything else stays static.
// Captures name + email and POSTs to the same-origin Worker route /api/subscribe
// (marketing + app are one apex deploy, so a relative URL needs no APP_BASE_URL
// and no CORS). States: idle → loading → success → error. A honeypot field
// ("website") is hidden off-screen; bots that fill it are silently accepted by
// the server. No dead button (marketing rule): a real route + email provider
// stand behind it.

type Status = "idle" | "loading" | "success" | "error";

export function EmailCapture() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "loading") return;

    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const website = String(data.get("website") ?? ""); // honeypot

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, website }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error || "Something went wrong.");
      }
      form.reset();
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  if (status === "success") {
    return (
      <div
        className="card mx-auto max-w-md p-8 text-center"
        role="status"
        aria-live="polite"
      >
        <p className="font-serif text-2xl font-semibold">Thank you.</p>
        <p className="mt-2 text-ink/70">
          We&apos;ll send you a gentle note when it&apos;s the right time. No
          spam — we&apos;ll only reach out about My Family Porch.
        </p>
      </div>
    );
  }

  const loading = status === "loading";

  return (
    <form onSubmit={onSubmit} className="card mx-auto max-w-md p-8" noValidate>
      <div className="space-y-4">
        <div>
          <label htmlFor="ec-name" className="block text-sm font-medium">
            Your name
          </label>
          <input
            id="ec-name"
            name="name"
            type="text"
            required
            maxLength={100}
            autoComplete="name"
            disabled={loading}
            className="input mt-1.5 w-full disabled:opacity-60"
          />
        </div>
        <div>
          <label htmlFor="ec-email" className="block text-sm font-medium">
            Email address
          </label>
          <input
            id="ec-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            disabled={loading}
            className="input mt-1.5 w-full disabled:opacity-60"
          />
        </div>

        {/* Honeypot — hidden from humans and assistive tech; bots fill it. */}
        <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="ec-website">Leave this field empty</label>
          <input
            id="ec-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full px-6 py-3 text-base disabled:opacity-70"
        >
          {loading ? "Sending…" : "Keep me posted"}
        </button>

        {status === "error" && (
          <p className="text-sm text-red-600" role="alert" aria-live="assertive">
            {message}
          </p>
        )}

        <p className="text-center text-xs text-ink/65">
          We&apos;ll only use your email to tell you about My Family Porch. Never
          sold.
        </p>
      </div>
    </form>
  );
}

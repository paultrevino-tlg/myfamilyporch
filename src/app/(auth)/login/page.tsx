"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

// Passwordless sign-in for family members. signInWithOtp triggers Supabase's
// "Send Email" hook, which routes through our EmailJS sender (api/auth/email-hook).
// The emailed link round-trips through Supabase /auth/v1/verify back to
// /auth/callback. Storytellers never use this surface.
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    // Carry a safe relative ?next through the magic link (e.g. /invite/<token>),
    // so an invited member lands back on the accept page after signing in.
    const next = new URLSearchParams(window.location.search).get("next");
    const safeNext = next && next.startsWith("/") ? next : null;
    const callback = `${window.location.origin}/auth/callback${
      safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""
    }`;
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback },
    });
    if (error) {
      setError(error.message);
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <main className="mx-auto max-w-md p-10">
        <h1 className="font-semibold text-2xl">Check your email</h1>
        <p className="mt-3 text-ink/70">
          We sent a sign-in link to <strong>{email}</strong>. Open it on this
          device to continue.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-10">
      <h1 className="font-semibold text-2xl">Sign in to My Family Porch</h1>
      <p className="mt-3 text-ink/70">
        Enter your email and we&apos;ll send a secure sign-in link — no password.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full rounded-lg border px-4 py-3 text-base"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full rounded-lg bg-ink px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Send sign-in link"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </main>
  );
}

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
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
        <div className="card p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-3xl">📬</div>
          <h1 className="mt-4 font-serif text-2xl font-semibold">Check your email</h1>
          <p className="mt-3 text-ink/65">
            We sent a sign-in link to <strong className="text-ink">{email}</strong>. Open it on this
            device to continue.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <div className="mb-6 flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand to-sky2 text-xl shadow-sm">🏡</span>
        <span className="font-bold tracking-tight">My Family Porch</span>
      </div>
      <div className="card p-8">
        <h1 className="font-serif text-2xl font-semibold">Welcome back</h1>
        <p className="mt-2 text-ink/65">
          Enter your email and we&apos;ll send a secure sign-in link — no password.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="input w-full"
          />
          <button type="submit" disabled={status === "sending"} className="btn-primary w-full py-3">
            {status === "sending" ? "Sending…" : "Send sign-in link"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </div>
    </main>
  );
}

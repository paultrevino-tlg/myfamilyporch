"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { requestMagicLink } from "./actions";

// Passwordless sign-in for family members. The server action (./actions) sends
// the link via Supabase's "Send Email" hook → our Resend sender
// (api/auth/email-hook); the link round-trips through /auth/v1/verify back to
// /auth/callback. It never creates accounts (TODO 9.0) — only existing members
// and invitees get a link, and the reply never says which. Storytellers never
// use this surface.
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  // The welcome email links here with ?email= so it's already filled in.
  useEffect(() => {
    const preset = new URLSearchParams(window.location.search).get("email");
    if (preset) setEmail(preset);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    // Carry ?next through the magic link (e.g. /invite/<token>), so an invited
    // member lands back on the accept page; the action keeps it relative-only.
    const next = new URLSearchParams(window.location.search).get("next");
    const res = await requestMagicLink(email, next);
    if (!res.ok) {
      setError(res.error);
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
            If <strong className="text-ink">{email}</strong> has a My Family Porch account, a
            sign-in link is on its way. Open it on this device to continue.
          </p>
          <p className="mt-5 text-sm text-ink/55">
            New here?{" "}
            <Link href="/signup" className="link">
              Get started
            </Link>
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

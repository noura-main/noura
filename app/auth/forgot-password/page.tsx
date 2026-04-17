"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError(
        "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
      );
      setLoading(false);
      return;
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL as string) || window.location.origin;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${appUrl}/auth/update-password`,
      }
    );

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSuccess("Password reset email sent. Check your inbox.");
  };

  return (
    <AuthShell variant="login">
      <h1 className="text-3xl font-bold tracking-tight text-black md:text-4xl">
        Forgot password
      </h1>
      <p className="mt-3 text-sm text-[#35515B]">
        Enter your email and we will send a password reset link.
      </p>

      <form onSubmit={handleResetRequest} className="mt-8 space-y-4">
        <input
          type="email"
          autoComplete="email"
          required
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-full border border-transparent bg-[#f0f2f4] px-4 py-3.5 text-[#0C2F3D] outline-none placeholder:text-[#8a9a9e] focus:border-[#0C5D6E]/30 focus:bg-white"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-black py-3.5 text-base font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
        >
          {loading ? "Sending link..." : "Send reset link"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-4 rounded-xl bg-[#e8f5d8] px-3 py-2 text-sm text-[#1e4d2a]">
          {success}
        </p>
      )}

      <Link
        href="/auth/login"
        className="mt-8 inline-flex text-sm font-medium text-[#35515B] underline-offset-4 hover:underline"
      >
        Back to login
      </Link>
    </AuthShell>
  );
}

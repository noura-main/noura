"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError(
        "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
      );
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Password updated. Redirecting to login...");
    window.setTimeout(() => {
      router.push("/auth/login");
      router.refresh();
    }, 1000);
  };

  return (
    <AuthShell variant="login">
      <h1 className="text-3xl font-bold tracking-tight text-black md:text-4xl">
        Update password
      </h1>
      <p className="mt-3 text-sm text-[#35515B]">
        Set a new password for your account.
      </p>

      <form onSubmit={handleUpdatePassword} className="mt-8 space-y-4">
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-full border border-transparent bg-[#f0f2f4] px-4 py-3.5 text-[#0C2F3D] outline-none placeholder:text-[#8a9a9e] focus:border-[#0C5D6E]/30 focus:bg-white"
        />
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-full border border-transparent bg-[#f0f2f4] px-4 py-3.5 text-[#0C2F3D] outline-none placeholder:text-[#8a9a9e] focus:border-[#0C5D6E]/30 focus:bg-white"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-black py-3.5 text-base font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
        >
          {loading ? "Updating..." : "Update password"}
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

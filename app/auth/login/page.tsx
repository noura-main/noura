"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { EyeIcon, LockIcon, UserIcon } from "@/components/auth/auth-icons";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const registeredBanner =
    searchParams.get("registered") === "1"
      ? "Sign up successful, please login to continue!"
      : null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError(
        "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
      );
      setLoading(false);
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-black md:text-4xl">
        Log in
      </h1>
      <form onSubmit={handleLogin} className="mt-8 space-y-4">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7c80]">
            <UserIcon className="h-5 w-5" />
          </span>
          <input
            type="email"
            autoComplete="email"
            required
            placeholder="Email Address"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            className="w-full rounded-full border border-transparent bg-[#f0f2f4] py-3.5 pl-12 pr-4 text-[#0C2F3D] outline-none ring-0 transition placeholder:text-[#8a9a9e] focus:border-[#0C5D6E]/30 focus:bg-white"
          />
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7c80]">
            <LockIcon className="h-5 w-5" />
          </span>
          <input
            type={showLoginPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            className="w-full rounded-full border border-transparent bg-[#f0f2f4] py-3.5 pl-12 pr-12 text-[#0C2F3D] outline-none placeholder:text-[#8a9a9e] focus:border-[#0C5D6E]/30 focus:bg-white"
          />
          <button
            type="button"
            onClick={() => setShowLoginPassword((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b7c80] hover:text-[#0C2F3D]"
            aria-label={
              showLoginPassword ? "Hide password" : "Show password"
            }
          >
            <EyeIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-[#35515B]">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded-full border-[#c5cdd0] text-[#0C2F3D] focus:ring-[#0C5D6E]"
            />
            Remember Me
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-[#6b7c80] hover:text-[#0C2F3D]"
          >
            Forgot Password?
          </Link>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-black py-3.5 text-base font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Log in"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {registeredBanner && (
        <p className="mt-4 rounded-xl bg-[#e8f5d8] px-3 py-2 text-sm text-[#1e4d2a]">
          {registeredBanner}
        </p>
      )}

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#dde2e4]" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-4 text-[#8a9a9e]">Or</span>
        </div>
      </div>

      <Link
        href="/auth/sign-up"
        className="flex w-full items-center justify-center rounded-full bg-[#f0f2f4] py-3.5 text-base font-semibold text-[#35515B] transition hover:bg-[#e4e7ea]"
      >
        Sign up
      </Link>
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthShell variant="login">
      <Suspense
        fallback={
          <p className="text-sm text-[#35515B]">Loading sign-in…</p>
        }
      >
        <LoginFormInner />
      </Suspense>
    </AuthShell>
  );
}

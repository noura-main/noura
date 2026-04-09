"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { EyeIcon } from "@/components/auth/auth-icons";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
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
    const { error: signUpError } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: {
          full_name: fullName,
          date_of_birth: dateOfBirth,
        },
      },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    router.push("/auth/login?registered=1");
  };

  return (
    <AuthShell variant="signup">
      <h1 className="text-3xl font-bold tracking-tight text-black md:text-4xl">
        Sign up
      </h1>
      <form onSubmit={handleSignup} className="mt-8 space-y-4">
        <input
          type="text"
          autoComplete="name"
          required
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-full border border-transparent bg-[#f0f2f4] py-3.5 px-4 text-[#0C2F3D] outline-none placeholder:text-[#8a9a9e] focus:border-[#0C5D6E]/30 focus:bg-white"
        />
        <input
          type="email"
          autoComplete="email"
          required
          placeholder="Email Address"
          value={signupEmail}
          onChange={(e) => setSignupEmail(e.target.value)}
          className="w-full rounded-full border border-transparent bg-[#f0f2f4] py-3.5 px-4 text-[#0C2F3D] outline-none placeholder:text-[#8a9a9e] focus:border-[#0C5D6E]/30 focus:bg-white"
        />
        <input
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          className="w-full rounded-full border border-transparent bg-[#f0f2f4] py-3.5 px-4 text-[#0C2F3D] outline-none focus:border-[#0C5D6E]/30 focus:bg-white"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="relative">
            <input
              type={showSignupPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              placeholder="Password"
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
              className="w-full rounded-full border border-transparent bg-[#f0f2f4] py-3.5 pl-4 pr-12 text-[#0C2F3D] outline-none placeholder:text-[#8a9a9e] focus:border-[#0C5D6E]/30 focus:bg-white"
            />
            <button
              type="button"
              onClick={() => setShowSignupPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b7c80]"
              aria-label="Toggle password visibility"
            >
              <EyeIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-full border border-transparent bg-[#f0f2f4] py-3.5 pl-4 pr-12 text-[#0C2F3D] outline-none placeholder:text-[#8a9a9e] focus:border-[#0C5D6E]/30 focus:bg-white"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b7c80]"
              aria-label="Toggle confirm password visibility"
            >
              <EyeIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-black py-3.5 text-base font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create Account"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
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
        href="/auth/login"
        className="flex w-full items-center justify-center rounded-full bg-[#f0f2f4] py-3.5 text-base font-semibold text-[#35515B] transition hover:bg-[#e4e7ea]"
      >
        Log in
      </Link>
    </AuthShell>
  );
}

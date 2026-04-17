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
  const [initLoading, setInitLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
      {loading ? (
        <p className="mt-4 text-sm text-[#35515B]">Checking recovery link...</p>
      ) : (
        <div className="mt-6 space-y-4">
          {initLoading ? (
            <p className="text-sm text-[#35515B]">Finalising recovery check...</p>
          ) : hasSession ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
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
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-[#35515B]">We couldn't find an active recovery session in this browser.</p>
              <p className="text-sm text-[#35515B]">To reset your password:</p>
              <ol className="list-decimal pl-5 text-sm text-[#35515B]">
                <li>Open the password reset email in the same browser where you click the link.</li>
                <li>Ensure the link's host matches your deployed app URL (set NEXT_PUBLIC_APP_URL).</li>
                <li>If the link opens on a different device, open it in this browser instead.</li>
              </ol>
              <p className="text-sm text-[#35515B]">If this continues, contact support or request a new reset link.</p>
            </div>
          )}

          {error && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        </div>
      )}
        if (typeof supabase.auth.getSessionFromUrl === "function") {
          const { data, error } = await supabase.auth.getSessionFromUrl();
          if (!error && data?.session) setHasSession(true);
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) setHasSession(true);
        }
      } catch (err) {
        // ignore
      } finally {
        setInitLoading(false);
      }
    }
    init();
  }, []);

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

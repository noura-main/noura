"use client";

import { useState, useEffect, useRef } from "react";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Camera,
  CheckCircle2,
  Shield,
  Save,
  X,
  AlertCircle,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useUserData } from "@/lib/context/user-data";

// ── Floating-label input ──────────────────────────────────────────────────────

interface FloatingInputProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
  disabled?: boolean;
  autoComplete?: string;
}

function FloatingInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  icon,
  suffix,
  disabled,
  autoComplete,
}: FloatingInputProps) {
  const [focused, setFocused] = useState(false);
  const floated = focused || value.length > 0;

  return (
    <div className="relative">
      <div
        className="group flex items-center gap-0 rounded-2xl border transition-all duration-200"
        style={{
          background: "rgba(255,255,255,0.60)",
          backdropFilter: "blur(12px)",
          borderColor: focused ? "#3D8489" : "rgba(61,132,137,0.20)",
          boxShadow: focused
            ? "0 0 0 3px rgba(61,132,137,0.12)"
            : "inset 0 1px 2px rgba(0,0,0,0.04)",
        }}
      >
        {/* Icon prefix */}
        {icon && (
          <span
            className="flex shrink-0 items-center justify-center pl-4 pr-1 transition-colors duration-200"
            style={{ color: focused ? "#3D8489" : "rgba(13,46,56,0.35)" }}
          >
            {icon}
          </span>
        )}

        {/* Input + floating label */}
        <div className="relative flex-1 px-3 py-1">
          <label
            htmlFor={id}
            className="pointer-events-none absolute left-0 origin-top-left transform select-none transition-all duration-200"
            style={{
              top: floated ? "6px" : "50%",
              transform: floated ? "translateY(0) scale(0.72)" : "translateY(-50%) scale(1)",
              color: focused ? "#3D8489" : "rgba(13,46,56,0.45)",
              fontWeight: 500,
              fontSize: "14px",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </label>
          <input
            id={id}
            type={type}
            value={value}
            autoComplete={autoComplete}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="w-full bg-transparent pb-2 pt-5 text-sm font-medium outline-none disabled:opacity-50"
            style={{ color: "#0d2e38", caretColor: "#3D8489" }}
          />
        </div>

        {/* Suffix (eye icon, verified badge etc.) */}
        {suffix && (
          <span className="flex shrink-0 items-center pr-4">{suffix}</span>
        )}
      </div>
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

function BentoCard({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-3xl p-6 ${className}`}
      style={{
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(61,132,137,0.13)",
        boxShadow: "0 4px 24px rgba(13,46,56,0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({
  type,
  message,
  onDismiss,
}: {
  type: "success" | "error";
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-4 shadow-2xl"
      style={{
        background: type === "success" ? "#063643" : "#7f1d1d",
        color: "#fff",
        minWidth: 280,
        animation: "slideUp 0.3s cubic-bezier(.22,1,.36,1)",
      }}
    >
      {type === "success" ? (
        <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
      ) : (
        <AlertCircle size={18} className="shrink-0 text-red-400" />
      )}
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onDismiss}
        className="ml-auto opacity-60 hover:opacity-100 transition-opacity"
      >
        <X size={14} />
      </button>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-4 text-[10px] font-black tracking-[0.22em]"
      style={{ color: "rgba(13,46,56,0.40)" }}
    >
      {children}
    </p>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AccountSettings() {
  const supabase = getSupabaseBrowserClient();
  const { refresh: refreshContext } = useUserData();

  // ── Profile fields ──
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [phone, setPhone]         = useState("");
  const [joinDate, setJoinDate]   = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId]       = useState<string | null>(null);

  // ── Password fields ──
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent]         = useState(false);
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);

  // ── UI state ──
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast]         = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load user on mount ──────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      setUserId(user.id);
      setEmail(user.email ?? "");
      setJoinDate(
        new Date(user.created_at).toLocaleDateString("en-US", {
          month: "long", year: "numeric",
        })
      );

      // Load profile row
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name,last_name,full_name,phone,avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        const first = profile.first_name ?? null;
        const last = profile.last_name ?? null;
        if (first || last) {
          setFirstName(first ?? "");
          setLastName(last ?? "");
        } else {
          const parts = (profile.full_name ?? "").split(" ");
          setFirstName(parts[0] ?? "");
          setLastName(parts.slice(1).join(" ") ?? "");
        }
        setPhone(profile.phone ?? "");
        setAvatarUrl(profile.avatar_url ?? null);
      }

      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Avatar upload ───────────────────────────────────────────────────────────

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !supabase || !userId) return;

    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/avatar.${ext}`;

    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      // Add cache-buster so the browser actually re-fetches
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      await supabase
        .from("profiles")
        .update({ avatar_url: urlWithCacheBust })
        .eq("id", userId);

      setAvatarUrl(urlWithCacheBust);
      refreshContext();
      setToast({ type: "success", message: "Profile photo updated!" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setToast({ type: "error", message: msg });
    } finally {
      setUploading(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ── Discard ─────────────────────────────────────────────────────────────────

  function handleDiscard() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setToast({ type: "success", message: "Changes discarded." });
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!supabase || !userId) return;
    setSaving(true);
    try {
      const f = firstName.trim();
      const l = lastName.trim();

      // Update profile row (store first + last separately)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ first_name: f || null, last_name: l || null, phone: phone.trim() })
        .eq("id", userId);
      if (profileError) throw profileError;

      // Update email if changed
      const { data: { user } } = await supabase.auth.getUser();
      if (user && email.trim() !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() });
        if (emailError) throw emailError;
      }

      // Password change (only if fields are filled)
      if (newPassword || currentPassword) {
        if (!currentPassword) throw new Error("Enter your current password to set a new one.");
        if (newPassword.length < 8)  throw new Error("New password must be at least 8 characters.");
        if (newPassword !== confirmPassword) throw new Error("Passwords don't match.");

        const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
        if (pwError) throw pwError;
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }

      setToast({ type: "success", message: "All changes saved successfully!" });
      refreshContext();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setToast({ type: "error", message: msg });
    } finally {
      setSaving(false);
    }
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col gap-4">
        {[1, 2, 3].map((k) => (
          <div
            key={k}
            className="animate-pulse rounded-3xl"
            style={{ height: k === 1 ? 120 : 220, background: "rgba(255,255,255,0.45)" }}
          />
        ))}
      </div>
    );
  }

  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "U";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

      {/* ── Hero header ── */}
      <div
        className="relative overflow-hidden rounded-3xl px-8 py-8 text-white"
        style={{ background: "#063643" }}
      >
        <div className="max-w-[55%]">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Account Settings
          </h1>
          <p className="mt-1 text-xl font-light opacity-70">
            Manage your profile, security & preferences
          </p>
        </div>

        {/* Decorative teal orbs */}
        <div
          className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #3D8489, transparent)" }}
        />
        <div
          className="pointer-events-none absolute bottom-0 right-32 h-32 w-32 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #3D8489, transparent)" }}
        />
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">

        {/* ── Profile hero card ── */}
        <BentoCard className="flex flex-col items-center justify-center gap-4 py-8">
          {/* Avatar */}
          <div className="relative">
            <div className="h-24 w-24 overflow-hidden rounded-full ring-4 ring-white shadow-xl">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="h-full w-full object-cover transition-opacity duration-300"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-2xl font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #063643, #3D8489)" }}
                >
                  {initials}
                </div>
              )}
            </div>

            {/* Camera overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-200 cursor-pointer"
              style={{ background: "rgba(6,54,67,0.70)", backdropFilter: "blur(4px)" }}
              title="Change photo"
            >
              {uploading ? (
                <span
                  className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin"
                />
              ) : (
                <>
                  <Camera size={18} className="text-white" />
                  <span className="text-[9px] font-bold tracking-wider text-white">
                    CHANGE
                  </span>
                </>
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Name + join date */}
          <div className="text-center">
            <p className="text-lg font-semibold" style={{ color: "#063643" }}>
              {firstName || lastName
                ? `${firstName} ${lastName}`.trim()
                : "Your Name"}
            </p>
            {joinDate && (
              <p className="mt-0.5 text-xs" style={{ color: "rgba(13,46,56,0.45)" }}>
                Member since {joinDate}
              </p>
            )}
          </div>

          {/* Email verified – simple checkmark only */}
          <div
            className="flex items-center justify-center h-7 w-7 rounded-full"
            style={{ background: "rgba(34,197,94,0.10)" }}
          >
            <CheckCircle2 size={14} strokeWidth={2.5} style={{ color: "#16a34a" }} />
          </div>
        </BentoCard>

        {/* ── Right column: personal info + security stacked ── */}
        <div className="flex flex-col gap-4">

          {/* ── Personal information ── */}
          <BentoCard>
            <SectionLabel>PERSONAL INFORMATION</SectionLabel>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FloatingInput
                id="firstName"
                label="First Name"
                value={firstName}
                onChange={setFirstName}
                autoComplete="given-name"
                icon={<User size={15} />}
              />
              <FloatingInput
                id="lastName"
                label="Last Name"
                value={lastName}
                onChange={setLastName}
                autoComplete="family-name"
                icon={<User size={15} />}
              />
              <FloatingInput
                id="email"
                label="Email Address"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                icon={<Mail size={15} />}
                suffix={
                  <CheckCircle2 size={14} strokeWidth={2.5} style={{ color: "#16a34a" }} />
                }
              />
              <FloatingInput
                id="phone"
                label="Mobile Number"
                type="tel"
                value={phone}
                onChange={setPhone}
                autoComplete="tel"
                icon={<Phone size={15} />}
              />
            </div>
          </BentoCard>

          {/* ── Security ── */}
          <BentoCard
            style={{
              background: "linear-gradient(135deg, rgba(6,54,67,0.04) 0%, rgba(61,132,137,0.06) 100%)",
              border: "1px solid rgba(61,132,137,0.18)",
            }}
          >
            <div className="mb-4 flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-xl"
                style={{ background: "rgba(6,54,67,0.08)" }}
              >
                <Shield size={14} style={{ color: "#063643" }} />
              </div>
              <SectionLabel>
                <span className="relative top-0">SECURITY & PASSWORD</span>
              </SectionLabel>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FloatingInput
                id="currentPassword"
                label="Current Password"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
                icon={<Lock size={15} />}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="transition-opacity hover:opacity-100"
                    style={{ color: "rgba(13,46,56,0.35)" }}
                  >
                    {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />
              <FloatingInput
                id="newPassword"
                label="New Password"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
                icon={<Lock size={15} />}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="transition-opacity hover:opacity-100"
                    style={{ color: "rgba(13,46,56,0.35)" }}
                  >
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />
              <FloatingInput
                id="confirmPassword"
                label="Confirm Password"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                icon={<Lock size={15} />}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="transition-opacity hover:opacity-100"
                    style={{ color: "rgba(13,46,56,0.35)" }}
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />
            </div>

            <a
              href="/auth/forgot-password"
              className="mt-3 inline-block text-xs font-semibold transition-opacity hover:opacity-70"
              style={{ color: "#3D8489" }}
            >
              Forgot password?
            </a>
          </BentoCard>

        </div>
      </div>

      {/* ── Action row ── */}
      <div className="flex items-center justify-end gap-3 pb-2">
        <button
          onClick={handleDiscard}
          disabled={saving}
          className="rounded-2xl border-2 px-6 py-3 text-sm font-bold tracking-wide transition-all duration-200 hover:bg-[#063643] hover:text-white disabled:opacity-40"
          style={{ borderColor: "#063643", color: "#063643" }}
        >
          Discard
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex min-w-[160px] items-center justify-center gap-2 rounded-2xl px-7 py-3 text-sm font-bold tracking-wide text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
          style={{ background: "#063643" }}
        >
          {saving ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save size={15} />
              Save All Changes
            </>
          )}
        </button>
      </div>

      {/* ── Toast notification ── */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}

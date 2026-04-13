"use client";

import { useEffect, useRef, useState } from "react";
import { X, Scale, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import type { SwapResponse, SwapSuggestion } from "@/app/api/ingredient-swap/route";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Props {
  onClose: () => void;
  /** Called when the user confirms a swap — gives parent the macro delta to apply */
  onApply?: (delta: { cal: number; protein_g: number; carb_g: number; fat_g: number; swappedName: string }) => void;
}

// ── Diff helpers ──────────────────────────────────────────────────────────────
function diff(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

function DiffChip({ label, value, unit = "", lowerIsBetter = false }: {
  label: string;
  value: number;
  unit?: string;
  lowerIsBetter?: boolean;
}) {
  const isGood = lowerIsBetter ? value <= 0 : value >= 0;
  const color = value === 0 ? "#9ca3af" : isGood ? "#16a34a" : "#FF7F50";
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-bold" style={{ color }}>
      {label} {diff(value)}{unit}
    </span>
  );
}

// ── Macro row helper ─────────────────────────────────────────────────────────
function MacroRow({ cal, protein, carbs, fat }: { cal: number; protein: number; carbs: number; fat: number }) {
  return (
    <div className="flex items-center gap-3 text-xs" style={{ color: "rgba(13,45,53,0.55)" }}>
      <span><b style={{ color: "#0D2D35" }}>{cal}</b> kcal</span>
      <span><b style={{ color: "#3D8489" }}>{protein}g</b> P</span>
      <span><b style={{ color: "#5a9e6f" }}>{carbs}g</b> C</span>
      <span><b style={{ color: "#d4a017" }}>{fat}g</b> F</span>
    </div>
  );
}

// ── Sub-option card ───────────────────────────────────────────────────────────
function SubCard({
  sub,
  origCal,
  origProtein,
  origCarb,
  origFat,
  selected,
  onSelect,
}: {
  sub: SwapSuggestion;
  origCal: number;
  origProtein: number;
  origCarb: number;
  origFat: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const dCal     = sub.est_cal       - origCal;
  const dProtein = sub.est_protein_g - origProtein;
  const dCarb    = sub.est_carb_g    - origCarb;
  const dFat     = sub.est_fat_g     - origFat;

  return (
    <button
      onClick={onSelect}
      className="w-full rounded-2xl p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3D8489]"
      style={{
        background: selected
          ? "linear-gradient(135deg,rgba(61,132,137,0.12),rgba(61,132,137,0.04))"
          : "rgba(255,255,255,0.70)",
        border: selected ? "2px solid #3D8489" : "1.5px solid rgba(61,132,137,0.18)",
        transform: selected ? "scale(1.01)" : "scale(1)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold" style={{ color: "#0D2D35" }}>{sub.sub_name}</p>
          <p className="mt-0.5 text-[10px]" style={{ color: "rgba(13,45,53,0.45)" }}>
            Ratio: {sub.usage_ratio}
          </p>
        </div>
        {selected && (
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" style={{ color: "#3D8489" }} />
        )}
      </div>

      {/* Macro shifts */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        <DiffChip label="🔥" value={dCal}     unit=" Cal" lowerIsBetter />
        <DiffChip label="💪" value={dProtein}  unit="g P"  lowerIsBetter={false} />
        <DiffChip label="🪫" value={dCarb}     unit="g C"  lowerIsBetter />
        <DiffChip label="💧" value={dFat}      unit="g F"  lowerIsBetter />
      </div>

      {/* Culinary tip */}
      <p
        className="mt-2 text-[11px] leading-snug"
        style={{ color: "rgba(13,45,53,0.55)" }}
      >
        {sub.culinary_reasoning}
      </p>
    </button>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function IngredientSwapModal({ onClose, onApply }: Props) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  const [query, setQuery]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [result, setResult]       = useState<SwapResponse | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [applying, setApplying]   = useState(false);

  // Escape to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    inputRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── Fetch swaps ────────────────────────────────────────────────────────────
  async function fetchSwaps() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedIdx(null);
    try {
      const res = await fetch("/api/ingredient-swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredient: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data: SwapResponse = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // ── Apply swap ─────────────────────────────────────────────────────────────
  function handleApply() {
    if (!result || selectedIdx === null) return;
    const orig = result.original;
    const sub  = result.substitutes[selectedIdx];
    const delta = {
      cal:       sub.est_cal       - orig.est_cal,
      protein_g: sub.est_protein_g - orig.est_protein_g,
      carb_g:    sub.est_carb_g    - orig.est_carb_g,
      fat_g:     sub.est_fat_g     - orig.est_fat_g,
      swappedName: sub.sub_name,
    };
    setApplying(true);
    onApply?.(delta);
    setTimeout(() => { setApplying(false); onClose(); }, 400);
  }

  // ── Derived: selected substitute ──────────────────────────────────────────
  const selectedSub = result && selectedIdx !== null ? result.substitutes[selectedIdx] : null;
  const impactCal   = selectedSub && result ? selectedSub.est_cal       - result.original.est_cal   : null;
  const impactFat   = selectedSub && result ? selectedSub.est_fat_g     - result.original.est_fat_g : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(6,54,67,0.65)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-3xl shadow-2xl"
        style={{
          background: "rgba(255,255,255,0.97)",
          border: "1px solid rgba(61,132,137,0.18)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="relative flex items-center justify-between px-6 py-5"
          style={{ background: "#0D2D35" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: "rgba(61,132,137,0.25)" }}
            >
              <Scale size={18} style={{ color: "#3D8489" }} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Missing an Ingredient?</h2>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>
                Let&apos;s find a swap that keeps you on track.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/15"
            style={{ color: "rgba(255,255,255,0.60)" }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="max-h-[80vh] overflow-y-auto p-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

          {/* ── Search row ── */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label
                htmlFor="swap-input"
                className="mb-1.5 block text-[10px] font-black tracking-[0.22em]"
                style={{ color: "rgba(13,45,53,0.40)" }}
              >
                I AM MISSING…
              </label>
              <input
                id="swap-input"
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") fetchSwaps(); }}
                placeholder="e.g. Butter, Eggs, Coconut Milk…"
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: "rgba(13,45,53,0.04)",
                  border: "1.5px solid rgba(61,132,137,0.25)",
                  color: "#0D2D35",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#3D8489")}
                onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(61,132,137,0.25)")}
              />
            </div>
            <button
              onClick={fetchSwaps}
              disabled={loading || !query.trim()}
              className="mt-6 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{ background: "#0D2D35" }}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : "Find Swaps"}
            </button>
          </div>

          {/* ── Error ── */}
          {error && (
            <p className="mt-4 rounded-xl px-4 py-3 text-sm font-medium" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.18)" }}>
              {error}
            </p>
          )}

          {/* ── Loading skeleton ── */}
          {loading && (
            <div className="mt-6 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl" style={{ background: "rgba(13,45,53,0.06)" }} />
              ))}
            </div>
          )}

          {/* ── Results ── */}
          {result && !loading && (
            <div className="mt-6">

              {/* Comparison grid: original | arrow | substitutes */}
              <div className="flex items-start gap-4">

                {/* Original card */}
                <div
                  className="w-40 shrink-0 rounded-2xl p-4"
                  style={{
                    background: "rgba(13,45,53,0.04)",
                    border: "1.5px solid rgba(13,45,53,0.10)",
                  }}
                >
                  <p
                    className="mb-2 text-[9px] font-black tracking-[0.20em]"
                    style={{ color: "rgba(13,45,53,0.35)" }}
                  >
                    MISSING
                  </p>
                  <p className="text-sm font-bold leading-snug" style={{ color: "#0D2D35" }}>
                    {result.original.name}
                  </p>
                  <div className="mt-3">
                    <MacroRow
                      cal={result.original.est_cal}
                      protein={result.original.est_protein_g}
                      carbs={result.original.est_carb_g}
                      fat={result.original.est_fat_g}
                    />
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex shrink-0 items-center self-center pt-2">
                  <ArrowRight size={24} style={{ color: "#3D8489" }} />
                </div>

                {/* Substitute cards */}
                <div className="flex flex-1 flex-col gap-3">
                  <p
                    className="text-[9px] font-black tracking-[0.20em]"
                    style={{ color: "rgba(13,45,53,0.35)" }}
                  >
                    SUBSTITUTE OPTIONS
                  </p>
                  {result.substitutes.map((sub, i) => (
                    <SubCard
                      key={sub.sub_name}
                      sub={sub}
                      origCal={result.original.est_cal}
                      origProtein={result.original.est_protein_g}
                      origCarb={result.original.est_carb_g}
                      origFat={result.original.est_fat_g}
                      selected={selectedIdx === i}
                      onSelect={() => setSelectedIdx(i)}
                    />
                  ))}
                </div>
              </div>

              {/* ── Impact banner ── */}
              <div
                className="mt-5 rounded-2xl px-5 py-4 transition-all duration-300"
                style={{
                  background: selectedSub
                    ? "linear-gradient(135deg,rgba(13,45,53,0.07),rgba(61,132,137,0.08))"
                    : "rgba(13,45,53,0.04)",
                  border: "1.5px solid rgba(61,132,137,0.18)",
                  minHeight: 56,
                }}
              >
                {selectedSub && impactCal !== null && impactFat !== null ? (
                  <p className="text-sm leading-relaxed" style={{ color: "#0D2D35" }}>
                    Selecting{" "}
                    <span className="font-bold">{selectedSub.sub_name}</span> will{" "}
                    <span className="font-bold" style={{ color: impactCal <= 0 ? "#16a34a" : "#FF7F50" }}>
                      {impactCal <= 0 ? `save you ${Math.abs(impactCal)} Calories` : `add ${impactCal} Calories`}
                    </span>{" "}
                    and{" "}
                    <span className="font-bold" style={{ color: impactFat <= 0 ? "#16a34a" : "#FF7F50" }}>
                      {impactFat <= 0 ? `remove ${Math.abs(impactFat)}g of Fat` : `add ${impactFat}g of Fat`}
                    </span>{" "}
                    from your total day.
                  </p>
                ) : (
                  <p className="text-sm" style={{ color: "rgba(13,45,53,0.40)" }}>
                    Select a substitute above to see its impact on your day.
                  </p>
                )}
              </div>

              {/* ── Action buttons ── */}
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  className="rounded-2xl border-2 px-5 py-2.5 text-sm font-bold transition-all hover:bg-[#0D2D35] hover:text-white"
                  style={{ borderColor: "#0D2D35", color: "#0D2D35" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={selectedIdx === null || applying}
                  className="flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold text-white transition-all disabled:opacity-50"
                  style={{ background: "#0D2D35" }}
                >
                  {applying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Apply Swap to Meal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

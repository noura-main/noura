"use client";

import { useEffect, useRef } from "react";
import {
  X,
  Zap,
  Dumbbell,
  CircleGauge,
  TrendingUp,
  Share2,
  FileDown,
} from "lucide-react";
import { useUserData } from "@/lib/context/user-data";

// ── Constants ─────────────────────────────────────────────────────────────────
const PROTEIN_GOAL_G = 50;   // daily reference value (g)
const HEAVY_CAL_THRESHOLD = 600;
const BALANCED_CAL_THRESHOLD = 300;
const HEAVY_FAT_THRESHOLD = 30;   // g

// ── Fullness Index ─────────────────────────────────────────────────────────────
/**
 * Calculates a qualitative "Fullness Index" from daily macro totals.
 *
 * Logic:
 *  - Protein contributes 4 kcal/g, Fat 9 kcal/g.
 *  - proteinEnergyShare = (protein * 4) / calories
 *  - fatEnergyShare     = (fat    * 9) / calories
 *
 *  High Satiety   → proteinEnergyShare ≥ 0.25  (protein covers ≥25% of calories)
 *  Energy Dense   → fatEnergyShare     ≥ 0.40  AND proteinEnergyShare < 0.20
 *  Balanced       → everything else
 */
function getFullnessIndex(calories: number, protein: number, fat: number): {
  label: string;
  sublabel: string;
  suggestion: string | null;
  color: string;
  bg: string;
} {
  if (calories <= 0) {
    return {
      label: "No data",
      sublabel: "Log meals to see your Fullness Index.",
      suggestion: null,
      color: "rgba(13,45,53,0.35)",
      bg: "transparent",
    };
  }

  const proteinShare = (protein * 4) / calories;
  const fatShare     = (fat    * 9) / calories;

  if (proteinShare >= 0.25) {
    return {
      label: "High Satiety",
      sublabel: `${Math.round(proteinShare * 100)}% of your calories come from protein — excellent for staying full.`,
      suggestion: null,
      color: "#16a34a",
      bg: "rgba(34,197,94,0.08)",
    };
  }

  if (fatShare >= 0.40 && proteinShare < 0.20) {
    return {
      label: "Energy Dense",
      sublabel: `Fat provides ${Math.round(fatShare * 100)}% of today's calories with relatively low protein.`,
      suggestion: "Try adding leafy greens or a protein source (e.g. tofu, chicken, legumes) to add volume without many extra calories.",
      color: "#d4a017",
      bg: "rgba(212,160,23,0.08)",
    };
  }

  return {
    label: "Balanced",
    sublabel: "Your protein-to-calorie ratio is in a healthy range — meals should keep you satisfied.",
    suggestion: null,
    color: "#3D8489",
    bg: "rgba(61,132,137,0.08)",
  };
}

// ── Gauge needle component ─────────────────────────────────────────────────────
function SatietyGauge({ calories, fat }: { calories: number; fat: number }) {
  const isHeavy    = calories >= HEAVY_CAL_THRESHOLD || fat >= HEAVY_FAT_THRESHOLD;
  const isBalanced = !isHeavy && calories >= BALANCED_CAL_THRESHOLD;
  const label      = isHeavy ? "Heavy" : isBalanced ? "Balanced" : "Light";
  // needle angle: Light=-55deg, Balanced=0deg, Heavy=55deg
  const angle      = isHeavy ? 55 : isBalanced ? 0 : -55;
  const labelColor = isHeavy ? "#ef4444" : isBalanced ? "#3D8489" : "#22c55e";

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Arc */}
      <div className="relative h-20 w-40 overflow-hidden">
        <svg viewBox="0 0 160 80" className="absolute inset-0 h-full w-full">
          {/* Background arc */}
          <path
            d="M 10 80 A 70 70 0 0 1 150 80"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Colored zones */}
          <path
            d="M 10 80 A 70 70 0 0 1 57 22"
            fill="none"
            stroke="#22c55e"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            d="M 57 22 A 70 70 0 0 1 103 22"
            fill="none"
            stroke="#3D8489"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            d="M 103 22 A 70 70 0 0 1 150 80"
            fill="none"
            stroke="#ef4444"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.7"
          />
          {/* Needle */}
          <g transform={`rotate(${angle}, 80, 80)`}>
            <line
              x1="80"
              y1="80"
              x2="80"
              y2="20"
              stroke="#0D2D35"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="80" cy="80" r="5" fill="#0D2D35" />
          </g>
        </svg>
      </div>
      {/* Zone labels */}
      <div className="flex w-40 justify-between px-1 text-[9px] font-bold tracking-wide">
        <span style={{ color: "#22c55e" }}>LIGHT</span>
        <span style={{ color: "#3D8489" }}>BALANCED</span>
        <span style={{ color: "#ef4444" }}>HEAVY</span>
      </div>
      <span
        className="mt-1 text-sm font-bold"
        style={{ color: labelColor }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────────
interface Props {
  onClose: () => void;
}

export default function HealthTrendsModal({ onClose }: Props) {
  const { calories, protein, fat, carbs, anyMealEaten } = useUserData();

  // Close on Escape
  const backdropRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const macroTotal = protein + fat + carbs;
  const proteinPct = macroTotal > 0 ? Math.round((protein / macroTotal) * 100) : 0;
  const fatPct     = macroTotal > 0 ? Math.round((fat     / macroTotal) * 100) : 0;
  const carbsPct   = macroTotal > 0 ? Math.round((carbs   / macroTotal) * 100) : 0;

  const carbsAreHighest = carbs >= protein && carbs >= fat;
  const proteinGoalMet  = protein >= PROTEIN_GOAL_G;
  const fullness        = getFullnessIndex(calories, protein, fat);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(6,54,67,0.65)", backdropFilter: "blur(6px)" }}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-3xl shadow-2xl"
        style={{
          background: "rgba(255,255,255,0.96)",
          border: "1px solid rgba(61,132,137,0.18)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="relative flex items-center justify-between px-6 py-5"
          style={{ background: "#0D2D35" }}
        >
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} style={{ color: "#3D8489" }} />
              <span
                className="text-[10px] font-black tracking-[0.22em]"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                DAILY REPORT
              </span>
            </div>
            <h2 className="mt-0.5 text-2xl font-bold text-white">
              Metabolic Performance
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/15"
            style={{ color: "rgba(255,255,255,0.60)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="max-h-[75vh] overflow-y-auto p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {!anyMealEaten ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <CircleGauge size={36} style={{ color: "rgba(13,45,53,0.20)" }} />
              <p className="text-base font-bold" style={{ color: "rgba(13,45,53,0.45)" }}>
                No meals eaten yet today
              </p>
              <p className="max-w-xs text-[12px] leading-relaxed" style={{ color: "rgba(13,45,53,0.35)" }}>
                Mark a meal as eaten on the Meal Plan page to see your metabolic insights here.
              </p>
            </div>
          ) : (
          <div className="flex flex-col gap-4">

            {/* ── Macro balance bar ── */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "linear-gradient(135deg,rgba(13,45,53,0.04),rgba(61,132,137,0.06))",
                border: "1px solid rgba(61,132,137,0.14)",
              }}
            >
              <p
                className="mb-3 text-[10px] font-black tracking-[0.22em]"
                style={{ color: "rgba(13,45,53,0.40)" }}
              >
                MACRO BALANCE
              </p>

              {macroTotal > 0 ? (
                <>
                  {/* Segmented bar */}
                  <div className="flex h-3 w-full overflow-hidden rounded-full">
                    <div
                      style={{ width: `${proteinPct}%`, background: "#3D8489" }}
                      title={`Protein ${proteinPct}%`}
                    />
                    <div
                      style={{ width: `${fatPct}%`, background: "#d4a017" }}
                      title={`Fat ${fatPct}%`}
                    />
                    <div
                      style={{ width: `${carbsPct}%`, background: "#5a9e6f" }}
                      title={`Carbs ${carbsPct}%`}
                    />
                  </div>

                  {/* Legend */}
                  <div className="mt-3 flex items-center justify-between">
                    {[
                      { label: "Protein", pct: proteinPct, val: protein, color: "#3D8489" },
                      { label: "Fats",    pct: fatPct,     val: fat,     color: "#d4a017" },
                      { label: "Carbs",   pct: carbsPct,   val: carbs,   color: "#5a9e6f" },
                    ].map(({ label, pct, val, color }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: color }}
                        />
                        <div>
                          <span
                            className="text-xs font-bold"
                            style={{ color: "#0D2D35" }}
                          >
                            {label}
                          </span>
                          <span
                            className="ml-1 text-xs"
                            style={{ color: "rgba(13,45,53,0.50)" }}
                          >
                            {val}g · {pct}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm" style={{ color: "rgba(13,45,53,0.40)" }}>
                  No macro data logged today.
                </p>
              )}
            </div>

            {/* ── Bento 2-up row ── */}
            <div className="grid grid-cols-2 gap-4">

              {/* Energy Stability */}
              <div
                className="rounded-2xl p-4"
                style={{
                  background: carbsAreHighest
                    ? "linear-gradient(135deg,rgba(90,158,111,0.10),rgba(90,158,111,0.04))"
                    : "rgba(255,255,255,0.70)",
                  border: `1px solid ${carbsAreHighest ? "rgba(90,158,111,0.25)" : "rgba(61,132,137,0.12)"}`,
                }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-xl"
                    style={{ background: "rgba(90,158,111,0.12)" }}
                  >
                    <Zap size={14} style={{ color: "#5a9e6f" }} />
                  </div>
                  <span
                    className="text-[9px] font-black tracking-[0.18em]"
                    style={{ color: "rgba(13,45,53,0.40)" }}
                  >
                    ENERGY
                  </span>
                </div>
                <p
                  className="text-sm font-bold leading-snug"
                  style={{ color: "#0D2D35" }}
                >
                  {carbsAreHighest
                    ? "Energy Outlook: High"
                    : carbs > 0
                    ? "Energy: Moderate"
                    : "No carbs logged"}
                </p>
                {carbsAreHighest && (
                  <p
                    className="mt-1 text-[11px] leading-snug"
                    style={{ color: "rgba(13,45,53,0.55)" }}
                  >
                    Pair with fiber for steady release.
                  </p>
                )}
              </div>

              {/* Muscle Maintenance */}
              <div
                className="rounded-2xl p-4"
                style={{
                  background: proteinGoalMet
                    ? "linear-gradient(135deg,rgba(61,132,137,0.12),rgba(61,132,137,0.04))"
                    : "rgba(255,255,255,0.70)",
                  border: `1px solid ${proteinGoalMet ? "rgba(61,132,137,0.28)" : "rgba(61,132,137,0.12)"}`,
                }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-xl"
                    style={{ background: "rgba(61,132,137,0.12)" }}
                  >
                    <Dumbbell size={14} style={{ color: "#3D8489" }} />
                  </div>
                  <span
                    className="text-[9px] font-black tracking-[0.18em]"
                    style={{ color: "rgba(13,45,53,0.40)" }}
                  >
                    MUSCLE
                  </span>
                </div>
                {proteinGoalMet ? (
                  <>
                    <div
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: "rgba(61,132,137,0.15)", color: "#3D8489" }}
                    >
                      ✓ Recovery Optimized
                    </div>
                    <p
                      className="mt-1.5 text-[11px] leading-snug"
                      style={{ color: "rgba(13,45,53,0.55)" }}
                    >
                      {protein}g protein — daily goal met.
                    </p>
                  </>
                ) : (
                  <>
                    <p
                      className="text-sm font-bold"
                      style={{ color: "#0D2D35" }}
                    >
                      {protein}g / {PROTEIN_GOAL_G}g
                    </p>
                    <p
                      className="mt-1 text-[11px]"
                      style={{ color: "rgba(13,45,53,0.50)" }}
                    >
                      {PROTEIN_GOAL_G - protein}g to reach goal.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* ── Satiety gauge ── */}
            <div
              className="rounded-2xl p-5"
              style={{
                border: "1px solid rgba(61,132,137,0.14)",
                background: "rgba(255,255,255,0.70)",
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-xl"
                  style={{ background: "rgba(13,45,53,0.07)" }}
                >
                  <CircleGauge size={14} style={{ color: "#0D2D35" }} />
                </div>
                <p
                  className="text-[10px] font-black tracking-[0.22em]"
                  style={{ color: "rgba(13,45,53,0.40)" }}
                >
                  SATIETY GAUGE
                </p>
              </div>

              <div className="flex items-start justify-between gap-4">
                {/* Left: Fullness Index */}
                <div className="flex-1">
                  <div
                    className="mb-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-bold"
                    style={{ background: fullness.bg, color: fullness.color }}
                  >
                    {fullness.label}
                  </div>
                  <p
                    className="text-[11px] leading-snug"
                    style={{ color: "rgba(13,45,53,0.55)" }}
                  >
                    {fullness.sublabel}
                  </p>
                  {fullness.suggestion && (
                    <p
                      className="mt-2 rounded-xl px-3 py-2 text-[11px] leading-snug"
                      style={{
                        background: "rgba(212,160,23,0.08)",
                        color: "rgba(13,45,53,0.65)",
                        border: "1px solid rgba(212,160,23,0.18)",
                      }}
                    >
                      💡 {fullness.suggestion}
                    </p>
                  )}
                </div>
                {/* Right: visual arc gauge */}
                <SatietyGauge calories={calories} fat={fat} />
              </div>
            </div>

            {/* ── Calorie summary strip ── */}
            <div
              className="flex items-center justify-between rounded-2xl px-5 py-3"
              style={{ background: "#0D2D35" }}
            >
              {[
                { label: "Calories", val: `${calories} kcal`, color: "#ffffff" },
                { label: "Protein",  val: `${protein}g`,      color: "#3D8489" },
                { label: "Fats",     val: `${fat}g`,          color: "#d4a017" },
                { label: "Carbs",    val: `${carbs}g`,        color: "#5a9e6f" },
              ].map(({ label, val, color }) => (
                <div key={label} className="text-center">
                  <p
                    className="text-[9px] font-black tracking-[0.20em] opacity-50"
                    style={{ color: "#fff" }}
                  >
                    {label.toUpperCase()}
                  </p>
                  <p className="mt-0.5 text-base font-bold" style={{ color }}>
                    {val}
                  </p>
                </div>
              ))}
            </div>

          </div>
          )}

          {/* ── Action buttons ── */}
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-2xl border-2 px-4 py-2.5 text-xs font-bold tracking-wide transition-all duration-200 hover:bg-[#0D2D35] hover:text-white"
              style={{ borderColor: "#0D2D35", color: "#0D2D35" }}
            >
              <FileDown size={13} />
              Save to PDF
            </button>
            <button
              onClick={() => {
                if (typeof navigator.share === "function") {
                  navigator.share({
                    title: "My Metabolic Performance",
                    text: `Calories: ${calories} | Protein: ${protein}g | Fats: ${fat}g | Carbs: ${carbs}g`,
                  }).catch(() => {});
                }
              }}
              className="flex items-center gap-2 rounded-2xl border-2 px-4 py-2.5 text-xs font-bold tracking-wide transition-all duration-200 hover:bg-[#0D2D35] hover:text-white"
              style={{ borderColor: "#0D2D35", color: "#0D2D35" }}
            >
              <Share2 size={13} />
              Share Insights
            </button>
          </div>

          {/* ── Disclaimer ── */}
          <p
            className="mt-4 text-center text-[10px]"
            style={{ color: "rgba(13,45,53,0.35)" }}
          >
            Insights based on daily macronutrient distribution.
          </p>
        </div>
      </div>
    </div>
  );
}

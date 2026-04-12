"use client";

import { useState } from "react";
import { Flame, Clock, Trash2, CheckCircle2, Circle } from "lucide-react";

export interface MealCardProps {
  category: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  dishName: string;
  summary: string;
  ingredients: string[];
  calories?: number;
  /** Cook/prep time in minutes */
  prepTime?: number;
  image?: string;
  instructions?: string;
  isEaten?: boolean;
  onDelete?: () => Promise<void> | void;
  onMarkEaten?: () => Promise<void> | void;
}

export default function MealCard({
  category,
  dishName,
  summary,
  ingredients,
  calories,
  prepTime,
  image,
  instructions,
  isEaten = false,
  onDelete,
  onMarkEaten,
}: MealCardProps) {
  const prepTimeLabel = prepTime
    ? prepTime >= 60
      ? `${Math.floor(prepTime / 60)}h ${prepTime % 60 > 0 ? `${prepTime % 60}m` : ""}`.trim()
      : `${prepTime} min`
    : null;
  const [eaten, setEaten] = useState(isEaten);
  const [confirmEaten, setConfirmEaten] = useState(false);
  const [showCookModal, setShowCookModal] = useState(false);

  // extract parenthetical substitution notes from the summary/description
  const substitutionMatches = Array.from((summary || "").matchAll(/\(([^)]+)\)/g)).map(
    (m) => m[1]
  );

  const cleanSub = (s: string) =>
    s.replace(/sub(stitute)?s?\s*(for)?/i, "").replace(/use instead of/i, "").trim();

  return (
    <>
    <div
      className="flex flex-col h-full justify-between rounded-3xl p-8 text-white shadow-xl transition-all duration-300" // rounded-[28px]
      style={{
        background: "#063643",
        opacity: eaten ? 0.72 : 1,
      }}
    >
      {/* ── Top row: category + mark-as-eaten ── */}
      <div className="mb-4 flex items-center justify-between">
        <span
          className="text-[10px] font-black tracking-[0.22em]"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          {category}
        </span>
        {eaten ? (
          <span
            className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide"
            style={{ color: "#6ee7b7" }}
          >
            <CheckCircle2 size={15} strokeWidth={2.5} />
            Eaten
          </span>
        ) : confirmEaten ? (
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                setConfirmEaten(false);
                try {
                  await onMarkEaten?.();
                } catch (err) {
                  console.error("[MealCard] mark eaten error", err);
                }
                setEaten(true);
              }}
              className="text-[10px] font-bold tracking-wide transition-colors"
              style={{ color: "#6ee7b7" }}
            >
              ✓ Confirm
            </button>
            <span style={{ color: "rgba(255,255,255,0.25)" }}>·</span>
            <button
              onClick={() => setConfirmEaten(false)}
              className="text-[10px] font-semibold tracking-wide transition-opacity hover:opacity-100"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmEaten(true)}
            className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide transition-opacity hover:opacity-100"
            style={{ color: "rgba(255,255,255,0.45)" }}
            aria-label="Mark as eaten"
          >
            <Circle size={15} strokeWidth={2} />
            Mark as Eaten
          </button>
        )}
      </div>

      {/* ── Dish name + summary ── */}
      <h3 className="mb-1.5 text-2xl font-bold leading-snug">{dishName}</h3>
      <p
        className="mb-5 text-xs leading-relaxed"
        style={{ color: "rgba(255,255,255,0.60)" }}
      >
        {summary}
      </p>

      {/* ── Nutritional snippet ── */}
      {(calories != null || prepTimeLabel) && (
        <div className="mb-6 flex items-center gap-3">
        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{ background: "rgba(255,255,255,0.10)" }}
        >
          <Flame size={13} className="text-orange-400" />
          {calories} kcal
        </div>
        <div
          className="h-3 w-px"
          style={{ background: "rgba(255,255,255,0.15)" }}
        />
        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{ background: "rgba(255,255,255,0.10)" }}
        >
          <Clock size={13} style={{ color: "rgba(255,255,255,0.70)" }} />
          {prepTimeLabel}
        </div>
      </div>
      )}

      {/* ── Ingredients ── */}
      <div className="mb-7 flex-1">
        <p
          className="mb-3 text-[9px] font-black tracking-[0.25em]"
          style={{ color: "rgba(255,255,255,0.40)" }}
        >
          INGREDIENTS
        </p>
        <ul className="space-y-2">
          {ingredients.map((ing, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-xs font-light leading-snug"
              style={{ color: "rgba(255,255,255,0.82)" }}
            >
              <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
              {ing}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3">
        {/* Delete meal */}
        <button
          onClick={async () => {
            if (!onDelete) return;
            if (!confirm("Delete this meal from your plan?")) return;
            try {
              await onDelete();
            } catch (err) {
              console.error("[MealCard] delete error", err);
            }
          }}
          className="flex items-center gap-1.5 rounded-2xl px-4 py-3 text-[10px] font-bold tracking-widest uppercase transition-all duration-200 hover:bg-white/20"
          style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.70)" }}
        >
          <Trash2 size={13} strokeWidth={2.5} />
          Delete
        </button>

        {/* Let's Cook pill */}
        <button
          className="flex-1 rounded-full border-2 py-3 text-xs font-bold tracking-widest uppercase transition-all duration-200 hover:text-[#063643]"
          style={{
            borderColor: "#ffffff",
            color: "#ffffff",
          }}
          onClick={() => {
            console.log("[MealCard] opening cook modal", { image, instructions });
            setShowCookModal(true);
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#ffffff";
            (e.currentTarget as HTMLButtonElement).style.color = "#063643";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "#ffffff";
          }}
        >
          Let&apos;s Cook!
        </button>
      </div>
    </div>

    {showCookModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(6,54,67,0.6)", backdropFilter: "blur(4px)" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowCookModal(false);
        }}
      >
        <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between">
            <div className="pr-4">
              <h2 className="text-2xl font-extrabold text-[#063643]">{dishName}</h2>
              <p className="mt-2 text-sm text-[#4b6068]">{summary}</p>
            </div>
            <button
              onClick={() => setShowCookModal(false)}
              className="rounded-full p-1.5 transition-colors hover:bg-gray-100"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

            <div className="mt-4 flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold bg-gray-100 text-[#063643]">
                <Flame size={14} className="text-orange-400" /> {calories ?? "—"} kcal
              </div>
              <div className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold bg-gray-100 text-[#063643]">
                <Clock size={14} /> {prepTimeLabel ?? "—"}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-bold text-[#063643]">Ingredients</h3>
            <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-[#334e52]">
              {ingredients.map((ing, i) => {
                // match substitutions to this ingredient if possible
                const ingLower = ing.toLowerCase();
                const matched = substitutionMatches.filter((s) => {
                  const cleaned = cleanSub(s).toLowerCase();
                  return cleaned.split(/[^a-z0-9]+/).some((tk) => tk && ingLower.includes(tk));
                });
                return (
                  <li key={i}>
                    <div>{ing}</div>
                    {matched.length > 0 && (
                      <div className="mt-1 text-xs text-[#647d7f]">Substitution: {matched.map(cleanSub).join("; ")}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* show any substitutions not matched to an ingredient */}
          {substitutionMatches.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-[#063643]">Substitutions</h4>
              <ul className="mt-2 text-sm text-[#334e52] space-y-1">
                {substitutionMatches.map((s, i) => (
                  <li key={i}>• {cleanSub(s)}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-sm font-bold text-[#063643]">Instructions</h3>
            <ol className="mt-3 space-y-3 text-sm text-[#334e52]">
              {instructions
                ? instructions
                    // handle literal \n escape sequences AND real newlines
                    .replace(/\\n/g, "\n")
                    // split on newlines or on "Step N:" boundaries
                    .split(/\n|(?=Step\s+\d+:)/i)
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((step, i) => (
                      <li key={i} className="flex gap-2 leading-relaxed">
                        {step}
                      </li>
                    ))
                : <li>No instructions available.</li>}
            </ol>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

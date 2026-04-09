"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Bot, ClipboardList, Coins, SquareChartGantt, Target } from "lucide-react";

type SmartTool = {
  label: string;
  icon: LucideIcon;
};

const SMART_TOOLS: SmartTool[] = [
  { label: "AI Assistant", icon: Bot },
  { label: "Health Insight", icon: SquareChartGantt },
  { label: "Scan Receipt", icon: ClipboardList },
  { label: "Smart Swaps", icon: Coins },
  { label: "Goal Tracker", icon: Target },
];

export function SmartTools() {
  const [activeTool, setActiveTool] = useState<string>("AI Assistant");
  const [openTool, setOpenTool] = useState<string | null>(null);

  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const activeIndex = useMemo(
    () => Math.max(0, SMART_TOOLS.findIndex((tool) => tool.label === activeTool)),
    [activeTool]
  );

  useEffect(() => {
    if (!openTool) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenTool(null);
    };

    window.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openTool]);

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {SMART_TOOLS.map(({ label, icon: Icon }, index) => {
          const isActive = index === activeIndex;

          return (
            <button
              key={label}
              type="button"
              onClick={() => {
                setActiveTool(label);
                setOpenTool(label);
              }}
              aria-pressed={isActive}
              aria-haspopup="dialog"
              className={`flex min-h-[120px] w-[152px] flex-col justify-between rounded-3xl p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b4a5d]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#eceef0] ${
                isActive
                  ? "bg-[#0b4a5d] text-white"
                  : "bg-white text-[#0d2e38] shadow-sm hover:bg-[#f7fafb]"
              }`}
            >
              <Icon className="h-8 w-8" />
              <p className="text-lg font-medium leading-tight">{label}</p>
            </button>
          );
        })}
      </div>

      {openTool ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpenTool(null);
          }}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-lg rounded-3xl bg-white p-6 text-[#0d2e38] shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#6a7f87]">
                  Smart Tool
                </p>
                <h3 id={titleId} className="mt-1 text-2xl font-semibold">
                  {openTool}
                </h3>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpenTool(null)}
                className="rounded-full bg-[#0d2e38] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b4a5d]/40 focus-visible:ring-offset-2"
              >
                Close
              </button>
            </div>

            <p className="mt-4 text-sm leading-7 text-[#35515B]">
              This is a placeholder modal for <span className="font-semibold">{openTool}</span>.
              We can wire this up to the real tool flow next.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}


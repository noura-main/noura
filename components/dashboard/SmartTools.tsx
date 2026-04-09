"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

type SmartTool = {
  label: string;
  icon: string;
};

const SMART_TOOLS: SmartTool[] = [
  { label: "AI Assistant", icon: "/dashboard/robot.png" },
  { label: "Health Insight", icon: "/dashboard/analytics.png" },
  { label: "Scan Receipt", icon: "/dashboard/receipt.png" },
  { label: "Smart Swaps", icon: "/dashboard/swap.png" },
  { label: "Goal Tracker", icon: "/dashboard/target.png" },
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
      <div className="flex flex-wrap gap-3 justify-center">
        {SMART_TOOLS.map(({ label, icon }, index) => {
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
              className={`flex min-h-[165px] w-[160px] flex-col flex justify-center gap-y-4 rounded-3xl p-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b4a5d]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#eceef0] ${
                isActive
                  ? "bg-[#063643] text-white"
                  : "bg-white text-[#0d2e38] shadow-sm hover:bg-[#f7fafb]"
              }`}
            >
              <img src={icon} className="h-40 w-40"/>
              <p className="text-xl font-semibold leading-tight">{label}</p>
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


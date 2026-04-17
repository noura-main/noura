"use client";

import { useEffect, useState } from "react";

export default function DashboardIntroModal() {
  const STORAGE_KEY = "noura_dashboard_hide_intro";
  const [visible, setVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    try {
      const hidden = localStorage.getItem(STORAGE_KEY);
      if (!hidden) setVisible(true);
    } catch (e) {
      // ignore storage errors
      setVisible(true);
    }
  }, []);

  function handleClose() {
    setVisible(false);
  }

  function handleDontShow() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch (e) {
      // ignore
    }
    setVisible(false);
    setDontShowAgain(true);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(6,54,67,0.65)", backdropFilter: "blur(6px)" }}
      role="presentation"
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl shadow-2xl bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">Welcome to Noura !!</h2>
            <p className="mt-2 text-lg text-[#2f5b60]">Here's a quick guide to get you started.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <p className="text-lg">1) Add items to your pantry: Go to the "My Kitchen" tab and add all your ingredients so Noura knows what you have.</p>
          <p className="text-lg">2) Set your preferences: Go to the "Preferences" tab to set your dietary goals, allergies, taste preferences and more to create meals that are just right.</p>
          <p className="text-lg">3) Generate meal plans and recipes: Go to the "Recipes" tab and generate the recipes made just for you. After generation, you can freely hope between different meals (breakfast, lunch, dinner, snacks). Click "Add to Meal Plan" to save the recipes you love.</p>
          <p className="text-lg">4) View favorites and refine: Go to the "Meal Plan" tab to view your personal plan. Cook and log your recipes daily.</p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={handleDontShow} className="rounded-full border px-4 py-2 text-sm">Don't Show Again</button>
          <button onClick={handleClose} className="rounded-full bg-[#0D2D35] px-4 py-2 text-sm font-bold text-white">Got it</button>
        </div>
      </div>
    </div>
  );
}

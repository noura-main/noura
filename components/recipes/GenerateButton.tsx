"use client";

import { Sparkles, Loader2 } from "lucide-react";

interface GenerateButtonProps {
  onClick?: () => void;
  isLoading?: boolean;
}

export default function GenerateButton({ onClick, isLoading = false }: GenerateButtonProps) {
  return (
    <div className="flex justify-center">
      <button
        onClick={onClick}
        disabled={isLoading}
        className="mt-2 flex items-center gap-2 rounded-full bg-[#063643] px-8 py-3 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? (
          <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
        ) : (
          <Sparkles size={16} strokeWidth={2.5} />
        )}
        {isLoading ? "Generating…" : "Generate Recipes"}
      </button>
    </div>
  );
}

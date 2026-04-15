"use client";

import { useCallback, useState } from "react";
import { Lightbulb, RefreshCw } from "lucide-react";
import { formatUsd } from "@/lib/budget/format";

const INSIGHTS: { tip: string; save: number }[] = [
  { tip: "Make iced coffee at home instead of buying daily", save: 3 },
  { tip: "Use a reusable water bottle instead of buying bottled drinks", save: 2 },
  { tip: "Buy generic milk instead of premium brands", save: 4 },
  { tip: "Choose whole chicken over pre-cut pieces", save: 6 },
  { tip: "Cook pasta meals at home instead of ordering takeout", save: 12 },
  { tip: "Buy generic milk instead of premium brands", save: 1 },
  { tip: "Get bread from the bakery clearance rack", save: 2 },
  { tip: "Make smoothies at home instead of buying them", save: 5 },
  { tip: "Buy large tubs of yogurt instead of single servings", save: 3 },
  { tip: "Use coupons or digital deals for weekly groceries", save: 5 },
  { tip: "Buy cheese in blocks and shred it yourself", save: 2 },
  { tip: "Choose seasonal fruits instead of imported ones", save: 3 },
  { tip: "Buy dried beans instead of canned beans", save: 2 },
  { tip: "Make breakfast at home instead of fast food", save: 6 },
  { tip: "Purchase family-size cereal instead of individual boxes", save: 3 },
  { tip: "Cook stir fry at home instead of ordering Chinese takeout", save: 10 },
  { tip: "Buy store-brand snacks instead of name brands", save: 2 },
  { tip: "Make pizza at home instead of delivery", save: 8 },
  { tip: "Freeze leftovers instead of letting food go to waste", save: 6 },
  { tip: "Buy potatoes in bulk instead of individually", save: 2 },
  { tip: "Make your own salad instead of buying pre-made kits", save: 4 },
  { tip: "Choose water at restaurants instead of soda", save: 3 },
  { tip: "Buy lunch meat in bulk instead of pre-packaged portions", save: 3 },
  { tip: "Use cashback apps for grocery purchases", save: 4 },
  { tip: "Cook large meals and eat leftovers the next day", save: 10 },
  { tip: "Buy eggs in larger cartons instead of smaller ones", save: 2 },
  { tip: "Skip add-ons like guac or extras when eating out", save: 2 },
  { tip: "Make your own sandwiches instead of buying deli sandwiches", save: 6 },
  { tip: "Choose tap water instead of sparkling bottled water", save: 2 },
  { tip: "Buy frozen berries instead of fresh out of season", save: 4 },
  { tip: "Plan meals ahead to avoid last-minute takeout", save: 15 },
  { tip: "Use loyalty rewards programs at grocery stores", save: 3 },
  { tip: "Buy pasta sauce in jars instead of single-serve cups", save: 2 },
  { tip: "Make popcorn at home instead of buying packaged snacks", save: 3 },
  { tip: "Cook pasta meals at home instead of ordering takeout", save: 7 },
  { tip: "Buy tortillas instead of sandwich bread for versatility", save: 2 },
  { tip: "Avoid convenience store snacks and buy from grocery stores", save: 4 },
  { tip: "Make tea at home instead of buying bottled tea", save: 3 },
  { tip: "Split large restaurant portions into two meals", save: 8 },
  { tip: "Shop with a list to avoid impulse purchases", save: 10 },
];

function pickTwoInsights() {
  // Shuffles the array and takes the first two to ensure they are unique
  const shuffled = [...INSIGHTS].sort(() => 0.5 - Math.random());
  return [shuffled[0], shuffled[1], shuffled[2]];
}

export function SmartInsightsCard() {
  // State now holds an array of two tips
  const [currentInsights, setInsights] = useState(() => pickTwoInsights());

  const refresh = useCallback(() => {
    setInsights(pickTwoInsights());
  }, []);

  return (
    <section className="rounded-3xl bg-[#063643] p-6 text-white shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Lightbulb className="h-5 w-5 text-amber-200" />
          </div>
          <h2 className="text-lg font-semibold">Smart Insights</h2>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="New tips"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {currentInsights.map((insight, index) => (
          <div key={index} className={index === 0 ? "border-b border-white/10 pb-4" : ""}>
            <p className="text-sm leading-relaxed text-white/90">{insight.tip}</p>
            <p className="mt-1 text-xs font-semibold text-amber-200/95">
              Save {formatUsd(insight.save)} more
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
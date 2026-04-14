"use client";

import { useEffect, useRef, useState } from "react";
import {
  Trophy,
  TrendingUp,
  Lightbulb,
  Newspaper,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  Clock,
  Flame,
  Send,
  MessageCircle,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import Image from "next/image";


// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface QOTDWrittenData { id: number; question: string }
interface PollData {
  id: number; question: string; option_a: string; option_b: string;
  pct_a: number; pct_b: number; totalVotes: number;
}
interface RecipeData {
  meal_type: string; title: string; calories: number; protein: number; image_url: string;
}
interface TipData { id: number; emoji: string; text: string }

interface NewsData {
  tag: string; tagColor: string; headline: string;
  source: string; read_time: string; body: string;
}

const STATIC_RECIPES: RecipeData[] = [
  {
    meal_type: "breakfast",
    title: "Protein Berry Smoothie Bowl",
    calories: 320,
    protein: 24,
    image_url: "https://images.unsplash.com/photo-1590301157890-4810ed352733?q=80&w=800"
  },
  {
    meal_type: "lunch",
    title: "Zesty Chickpea Quinoa Salad",
    calories: 410,
    protein: 18,
    image_url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800"
  },
  {
    meal_type: "dinner",
    title: "Honey-Garlic Salmon & Greens",
    calories: 540,
    protein: 36,
    image_url: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=800"
  },
  {
    meal_type: "snack",
    title: "Greek Yogurt with Honey & Nuts",
    calories: 210,
    protein: 15,
    image_url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=800"
  }
];

const STATIC_NEWS: NewsData[] = [
  {
    tag: "Science",
    tagColor: "#3D8489",
    headline: "The Rise of 'Blended' Cottage Cheese",
    source: "HealthLine",
    read_time: "3 min",
    body: "Recent studies show that increasing protein density via cottage cheese improves metabolic health. Users are now swapping it into sauces and dips for a huge protein boost."
  },
  {
    tag: "Market",
    tagColor: "#f59e0b",
    headline: "Avocado Prices Set to Drop Nationwide",
    source: "Bloomberg",
    read_time: "2 min",
    body: "Surplus supply from recent harvests is expected to lower prices at major retailers. It is the perfect window to stock up on healthy fats for meal prepping."
  },
  {
    tag: "Health",
    tagColor: "#063643",
    headline: "Late Night Snacking Myth Debunked",
    source: "NutriJournal",
    read_time: "5 min",
    body: "Total daily calories matter more than timing. Research suggests high-protein snacks before bed can actually stabilize blood sugar and aid muscle recovery."
  },
  {
    tag: "Eco",
    tagColor: "#ef4444",
    headline: "The 'Ugly Veggie' Trend Saves Money",
    source: "The Guardian",
    read_time: "4 min",
    body: "Consumers are saving up to 30% by choosing misshapen produce. These 'ugly' vegetables offer the exact same nutritional profile as premium-looking options."
  }
];

const STATIC_TIPS: TipData[] = [
  { id: 1, emoji: "❄️", text: "Freeze your spinach to make it last 3x longer—perfect for smoothies!" },
  { id: 2, emoji: "🍋", text: "Add lemon to iron-rich foods to help your body absorb nutrients better." },
  { id: 3, emoji: "🥚", text: "Hard-boiled eggs stay fresh in the fridge for up to 7 days. Perfect prep snack." },
  { id: 4, emoji: "🥑", text: "Keep the pit in your guacamole bowl to prevent it from browning too fast." },
  { id: 5, emoji: "🥣", text: "Soak oats overnight to reduce phytic acid and make them easier to digest." },
  { id: 6, emoji: "🧂", text: "Swap table salt for Sea Salt for extra trace minerals and less water retention." },
  { id: 7, emoji: "🍌", text: "Overripe bananas? Peel and freeze them for creamy, natural ice cream alternatives." },
  { id: 8, emoji: "🥗", text: "Massage kale with olive oil to break down tough fibers for a better salad texture." },
  { id: 9, emoji: "🫐", text: "Wash berries in a vinegar-water mix (1:3) to double their fridge shelf life." }
];

const CHALLENGE = {
  title: "The Rainbow Receipt Challenge",
  description: 'Scan receipts with 5 different coloured vegetables this week to earn the "Nutrition Pro" badge.',
  progress: 3, total: 5, reward: "Nutrition Pro Badge",
  steps: [
    { label: "🔴 Red", done: true }, { label: "🟠 Orange", done: true },
    { label: "🟡 Yellow", done: true }, { label: "🟢 Green", done: false },
    { label: "🟣 Purple", done: false },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared Components
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span style={{ color: "#3D8489" }}>{icon}</span>
      <h2 className="text-3xl font-semibold" style={{ color: "#0d2e38" }}>{text}</h2>
    </div>
  );
}

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-3xl ${className}`}
      style={{ background: "rgba(6,54,67,0.05)", minHeight: 180 }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature Components
// ─────────────────────────────────────────────────────────────────────────────

function WeeklyChallenge() {
  const pct = Math.round((CHALLENGE.progress / CHALLENGE.total) * 100);

  return (
    <div 
      className="relative overflow-hidden rounded-3xl transition-all" 
      style={{ 
        border: "1.5px solid rgba(61,132,137,0.22)",
        background: "rgba(255, 255, 255, 0.4)" // Slight transparency to show it's pending
      }}
    >

      <div className="p-7 lg:flex lg:items-center lg:gap-10 opacity-60"> {/* Reduced opacity for the content */}
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Trophy size={14} style={{ color: "#3D8489" }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "#3D8489" }}>
              Weekly Challenge
            </span>
          </div>
          <h2 className="text-3xl font-semibold leading-snug" style={{ color: "#0d2e38" }}>
            {CHALLENGE.title}
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed" style={{ color: "#6a7f87" }}>
            {CHALLENGE.description}
          </p>
          <div
            className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2"
            style={{ background: "rgba(6,54,67,0.07)", border: "1px solid rgba(61,132,137,0.20)" }}
          >
            <span className="text-sm">🎖️</span>
            <span className="text-[13px]" style={{ color: "#6a7f87" }}>
              Reward: <strong style={{ color: "#0d2e38" }}>{CHALLENGE.reward}</strong>
            </span>
          </div>
        </div>

        <div className="mt-6 min-w-[280px] lg:mt-0">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: "#6a7f87" }}>Progress</span>
            <span className="text-sm font-bold" style={{ color: "#0d2e38" }}>
              {CHALLENGE.progress} / {CHALLENGE.total} Scanned
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full" style={{ background: "rgba(6,54,67,0.10)" }}>
            <div 
              className="h-full rounded-full transition-all duration-700" 
              style={{ width: `${pct}%`, background: "linear-gradient(90deg,#063643,#3D8489)" }} 
            />
          </div>
          <div className="mt-4 flex justify-between gap-1">
            {CHALLENGE.steps.map((step, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    background: step.done ? "rgba(61,132,137,0.15)" : "rgba(6,54,67,0.05)",
                    border: `2px solid ${step.done ? "#3D8489" : "rgba(6,54,67,0.18)"}`,
                    color: step.done ? "#3D8489" : "#6a7f87",
                  }}
                >
                  {step.done ? "✓" : i + 1}
                </div>
                <span className="text-center text-[9px] leading-tight" style={{ color: "#6a7f87" }}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function QOTDWritten({ data, loading }: { data: QOTDWrittenData | null; loading: boolean }) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (!answer.trim()) return;
    setSubmitted(true);
  }

  return (
    <div className="h-full rounded-3xl p-5" style={{ background: "#dde4e8", border: "1px solid rgba(61,132,137,0.18)" }}>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "rgba(61,132,137,0.12)" }}>
          <MessageCircle size={14} style={{ color: "#3D8489" }} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.20em]" style={{ color: "#3D8489" }}>
          ✍️ Question of the Day
        </span>
      </div>
      {loading ? (
        <div className="mb-4 h-12 animate-pulse rounded-2xl" style={{ background: "rgba(6,54,67,0.08)" }} />
      ) : (
        <p className="mb-4 text-[17px] font-semibold leading-snug" style={{ color: "#0d2e38" }}>
          {data?.question ?? "What's your go-to meal when you have less than 10 minutes to eat? 🕐"}
        </p>
      )}
      {!submitted ? (
        <div>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Share your answer…"
            rows={3}
            className="w-full resize-none rounded-2xl px-4 py-3 text-[13px] leading-relaxed outline-none transition-all"
            style={{
              background: "rgba(6,54,67,0.04)",
              border: `1.5px solid ${answer ? "rgba(61,132,137,0.45)" : "rgba(6,54,67,0.12)"}`,
              color: "#0d2e38",
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!answer.trim()}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-[13px] font-semibold transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-40"
            style={{ background: "#063643", color: "#ffffff" }}
          >
            <Send size={13} /> Post Answer
          </button>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-2xl px-3 py-2.5" style={{ background: "rgba(61,132,137,0.08)", border: "1px solid rgba(61,132,137,0.20)" }}>
          <p className="text-[12px] leading-snug" style={{ color: "#3D8489" }}>
            <strong>Your answer:</strong> {answer}
          </p>
        </div>
      )}
    </div>
  );
}

function QOTDPoll({ data, loading, onVote }: { data: PollData | null; loading: boolean; onVote: (option: "A" | "B") => void; }) {
  const today = new Date().toISOString().split("T")[0];
  const storageKey = `poll_voted_${today}`;
  const [voted, setVoted] = useState<"A" | "B" | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey) as "A" | "B" | null;
    setVoted(stored);
  }, [storageKey]);

  function handleVote(option: "A" | "B") {
    if (voted) return;
    localStorage.setItem(storageKey, option);
    setVoted(option);
    onVote(option);
  }

  const pct_a = data?.pct_a ?? 50;
  const pct_b = data?.pct_b ?? 50;
  const winnerKey: "A" | "B" = pct_a >= pct_b ? "A" : "B";

  return (
    <div className="h-full rounded-3xl p-5" style={{ background: "#dde4e8", border: "1px solid rgba(61,132,137,0.18)" }}>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "rgba(61,132,137,0.12)" }}>
          <HelpCircle size={14} style={{ color: "#3D8489" }} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.20em]" style={{ color: "#3D8489" }}>
          🔥 This or That · Daily Pulse
        </span>
      </div>
      {loading ? (
        <div className="mb-5 h-12 animate-pulse rounded-2xl" style={{ background: "rgba(6,54,67,0.08)" }} />
      ) : (
        <p className="mb-5 text-[17px] font-semibold leading-snug" style={{ color: "#0d2e38" }}>
          {data?.question ?? "Oat Milk or Soy Milk: which is your go-to? 🥛"}
        </p>
      )}
      {!voted ? (
        <div className="flex flex-col gap-3">
          {(["A", "B"] as const).map((key) => {
            const label = key === "A" ? (data?.option_a ?? "🌾 Oat Milk") : (data?.option_b ?? "🌿 Soy Milk");
            return (
              <button
                key={key}
                onClick={() => handleVote(key)}
                className="w-full rounded-2xl py-4 text-sm font-semibold transition-all hover:shadow-md active:scale-[0.97]"
                style={{
                  background: key === "A" ? "rgba(6,54,67,0.06)" : "rgba(6,54,67,0.03)",
                  border: `2px solid ${key === "A" ? "rgba(61,132,137,0.45)" : "rgba(6,54,67,0.12)"}`,
                  color: "#0d2e38",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-2xl px-3 py-2" style={{ background: "rgba(61,132,137,0.08)", border: "1px solid rgba(61,132,137,0.20)" }}>
            <span className="text-xs font-semibold" style={{ color: "#3D8489" }}>
              ✅ You voted: {voted === "A" ? (data?.option_a ?? "🌾 Oat Milk") : (data?.option_b ?? "🌿 Soy Milk")}
            </span>
          </div>
          {(["A", "B"] as const).map((key) => {
            const label = key === "A" ? (data?.option_a ?? "🌾 Oat Milk") : (data?.option_b ?? "🌿 Soy Milk");
            const pct = key === "A" ? pct_a : pct_b;
            const isWinner = key === winnerKey;
            return (
              <div key={key}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: "#0d2e38" }}>{label}</span>
                  <span className="text-sm font-bold" style={{ color: isWinner ? "#063643" : "#6a7f87" }}>{pct}% {isWinner && "🏆"}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(6,54,67,0.08)" }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: isWinner ? "linear-gradient(90deg,#063643,#3D8489)" : "rgba(6,54,67,0.18)" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"];

export function TrendingRecipes({ 
  recipes, 
  loading 
}: { 
  recipes: RecipeData[]; 
  loading: boolean 
}) {
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"];
  
  // Sort recipes based on meal order
  const sortedRecipes = MEAL_ORDER.map((mt) => 
    recipes.find((r) => r.meal_type.toLowerCase() === mt)
  ).filter(Boolean) as RecipeData[];

  const handleImageError = (mealType: string) => {
    setImgErrors(prev => ({ ...prev, [mealType]: true }));
  };

  return (
    <div className="w-full">
      <SectionLabel icon={<TrendingUp size={17} />} text="Trending Recipes" />
      
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          MEAL_ORDER.map((mt) => <SkeletonCard key={mt} className="h-64" />)
        ) : (
          sortedRecipes.map((recipe, idx) => (
            <div
              key={idx}
              className="group flex flex-col overflow-hidden rounded-[24px] bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              style={{ border: "1px solid rgba(61,132,137,0.15)" }}
            >
              {/* IMAGE SECTION */}
              <div className="relative h-44 w-full overflow-hidden bg-gray-100">
                {!imgErrors[recipe.meal_type] ? (
                  <Image
                    src={recipe.image_url}
                    alt={recipe.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={() => handleImageError(recipe.meal_type)}
                    unoptimized // Needed for external API URLs like Unsplash
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-emerald-50 text-4xl">
                    🥗
                  </div>
                )}
                <div className="absolute top-3 left-3">
                   <span 
                    className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm"
                    style={{ background: "#ffffff", color: "#3D8489" }}
                  >
                    {recipe.meal_type}
                  </span>
                </div>
              </div>

              {/* CONTENT SECTION */}
              <div className="flex flex-1 flex-col p-5">
                <h3 
                  className="mb-4 text-lg font-bold leading-tight" 
                  style={{ color: "#0d2e38" }}
                >
                  {recipe.title}
                </h3>

                <div className="mt-auto flex items-center justify-between border-t pt-4" style={{ borderColor: "rgba(6,54,67,0.06)" }}>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-gray-400">Protein</span>
                    <span className="text-sm font-extrabold" style={{ color: "#3D8489" }}>
                      {recipe.protein}g
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-bold uppercase text-gray-400">Calories</span>
                    <span className="text-sm font-extrabold" style={{ color: "#0d2e38" }}>
                      {recipe.calories}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function FoodNews({ articles, loading }: { articles: NewsData[]; loading: boolean }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0); // Default first one open

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex items-center gap-2">
        <Newspaper size={18} style={{ color: "#3D8489" }} />
        <h2 className="text-3xl font-semibold" style={{ color: "#0d2e38" }}>News of the Week</h2>
      </div>

      <div className="flex-1 overflow-hidden rounded-[24px] bg-white shadow-sm" style={{ border: "1px solid rgba(61,132,137,0.15)" }}>
        {loading ? (
          <div className="p-10 animate-pulse bg-gray-50 h-full" />
        ) : (
          articles.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={idx} className="border-b last:border-none" style={{ borderColor: "rgba(6,54,67,0.06)" }}>
                <button
                  className="w-full px-6 py-5 text-left transition-colors hover:bg-gray-50"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                          style={{ background: `${item.tagColor}15`, color: item.tagColor }}
                        >
                          {item.tag}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-medium text-gray-400">
                          <Clock size={10} /> {item.read_time} · {item.source}
                        </div>
                      </div>
                      <h3 className="text-[15px] font-bold leading-snug" style={{ color: "#0d2e38" }}>
                        {item.headline}
                      </h3>
                      
                      {isOpen && (
                        <p className="mt-3 text-[13px] leading-relaxed text-gray-500 animate-in fade-in slide-in-from-top-1 duration-300">
                          {item.body}
                        </p>
                      )}
                    </div>
                    <div
                      className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-transform duration-300"
                      style={{ 
                        background: "rgba(61,132,137,0.08)", 
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" 
                      }}
                    >
                      <ChevronDown size={14} style={{ color: "#3D8489" }} />
                    </div>
                  </div>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function TipsGrid({ tips, loading }: { tips: TipData[]; loading: boolean }) {
  return (
    <div>
      <SectionLabel icon={<Lightbulb size={17} />} text="Tips & Tricks" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? [0, 1, 2].map((i) => <SkeletonCard key={i} className="h-24" />) : tips.map((tip) => (
          <div key={tip.id} className="rounded-2xl p-4 bg-white" style={{ border: "1.5px solid rgba(61,132,137,0.20)" }}>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-xl" style={{ background: "rgba(61,132,137,0.10)" }}>{tip.emoji}</div>
            <p className="text-[13px] leading-snug" style={{ color: "#0d2e38" }}>{tip.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CommunityFeed() {
  const [writtenQOTD, setWrittenQOTD] = useState<QOTDWrittenData | null>(null);
  const [poll, setPoll] = useState<PollData | null>(null);
  const [recipes, setRecipes] = useState<RecipeData[]>([]);
  const [tips, setTips] = useState<TipData[]>([]);
  const [news, setNews] = useState<NewsData[]>([]);

  const [loadingQOTD, setLoadingQOTD] = useState(true);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [loadingTips, setLoadingTips] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);

  useEffect(() => {
    // 1. Initial Static Load (Sync)
    setRecipes(STATIC_RECIPES);
    setNews(STATIC_NEWS);
    setTips([...STATIC_TIPS].sort(() => 0.5 - Math.random()).slice(0, 6));
    setLoadingRecipes(false);
    setLoadingNews(false);
    setLoadingTips(false);

    // 2. Async Fetches for DB Data (Poll/Written QOTD)
    const fetchData = async () => {
      try {
        const res = await fetch("/api/community/qotd");
        const d = await res.json();
        setWrittenQOTD(d.written ?? null);
        if (d.poll) setPoll({ ...d.poll, pct_a: 50, pct_b: 50, totalVotes: 0 });
        
        const pollRes = await fetch("/api/community/poll");
        const pollData = await pollRes.json();
        setPoll((prev) => prev ? { ...prev, ...pollData } : prev);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoadingQOTD(false);
      }
    };
    fetchData();
  }, []);

  async function handlePollVote(option: "A" | "B") {
    try {
      const sb = getSupabaseBrowserClient();
      const { data: { user } } = await sb!.auth.getUser();
      const res = await fetch("/api/community/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: poll?.id ?? 0, option, user_id: user?.id ?? null }),
      });
      const d = await res.json();
      if (d.success) setPoll((prev) => prev ? { ...prev, pct_a: d.pct_a, pct_b: d.pct_b, totalVotes: d.totalVotes } : prev);
    } catch (err) {
      console.error("[poll vote]", err);
    }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-4 py-8">
      <WeeklyChallenge />
      <div className="grid gap-6 xl:grid-cols-2">
        <QOTDWritten data={writtenQOTD} loading={loadingQOTD} />
        <QOTDPoll data={poll} loading={loadingQOTD} onVote={handlePollVote} />
      </div>
      <TrendingRecipes recipes={recipes} loading={loadingRecipes} />
      <div className="grid gap-6 lg:grid-cols-2">
        <FoodNews articles={news} loading={loadingNews} />
        <TipsGrid tips={tips} loading={loadingTips} />
      </div>
    </div>
  );
}
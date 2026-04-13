"use client";

import { useState, useEffect } from "react";
import {
  Check,
  Sparkles,
  Save,
  Thermometer,
  Flame,
  Wind,
  Clock,
  Zap,
  Gauge,
  ChefHat,
  UtensilsCrossed,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import PreferencesHeader from "./PreferencesHeading";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// ─── Static data ──────────────────────────────────────────────────────────────

const ALLERGIES = [
  "Tree Nuts", "Peanuts", "Dairy", "Gluten",
  "Eggs", "Shellfish", "Soy", "Sesame", "Fish",
];

const DIETS = [
  "Vegan", "Vegetarian", "Keto", "Paleo",
  "Halal", "Kosher", "Whole30", "Low-FODMAP", "Pescatarian",
];

const CUISINES = [
  { name: "Mexican",       emoji: "🌮" },
  { name: "Mediterranean", emoji: "🫒" },
  { name: "Italian",       emoji: "🍝" },
  { name: "Japanese",      emoji: "🍱" },
  { name: "Indian",        emoji: "🍛" },
  { name: "Thai",          emoji: "🥢" },
  { name: "Chinese",       emoji: "🥟" },
  { name: "American",      emoji: "🍔" },
  { name: "Middle Eastern",emoji: "🧆" },
  { name: "Korean",        emoji: "🥩" },
  { name: "French",        emoji: "🥐" },
  { name: "Vietnamese",    emoji: "🫕" },
];

const NO_GO_ITEMS = ["Cilantro", "Olives", "Blue Cheese", "Anchovies", "Mushrooms", "Onions"];

const SPICE_LABELS  = ["Mild", "Gentle", "Medium", "Hot", "Extra Hot"];
const SPICE_EMOJIS  = ["😌", "🙂", "😋", "🥵", "🔥"];
const SPICE_COLORS  = ["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"];

const EQUIPMENT: { name: string; Icon: LucideIcon }[] = [
  { name: "Oven",        Icon: Thermometer    },
  { name: "Stovetop",    Icon: Flame          },
  { name: "Air Fryer",   Icon: Wind           },
  { name: "Slow Cooker", Icon: Clock          },
  { name: "Microwave",   Icon: Zap            },
  { name: "Instant Pot", Icon: Gauge          },
  { name: "Grill",       Icon: UtensilsCrossed},
  { name: "Wok",         Icon: ChefHat        },
];

const SKILL_LEVELS = [
  { key: "beginner",     label: "Beginner",     emoji: "🌱" },
  { key: "intermediate", label: "Intermediate", emoji: "👨‍🍳" },
  { key: "advanced",     label: "Advanced",     emoji: "⭐" },
] as const;

type SkillLevel = typeof SKILL_LEVELS[number]["key"];

// ─── Tiny sub-components ──────────────────────────────────────────────────────

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
        selected
          ? "bg-[#3D8489] text-white shadow-sm"
          : "border border-gray-200 bg-white text-gray-600 hover:border-[#3D8489] hover:text-[#3D8489]"
      }`}
    >
      {selected && <Check size={11} className="shrink-0" />}
      {label}
    </button>
  );
}

function OtherChipInput({
  isOpen,
  value,
  onChange,
  onOpen,
  onSubmit,
  onCancel,
}: {
  isOpen: boolean;
  value: string;
  onChange: (v: string) => void;
  onOpen: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) {
    return (
      <button
        onClick={onOpen}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-400 transition-all duration-200 hover:border-[#3D8489] hover:text-[#3D8489]"
      >
        <Plus size={12} />
        Other
      </button>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-[#3D8489] bg-white py-1.5 pl-3 pr-1.5">
      <input
        autoFocus
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onSubmit(); }
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Type & press Enter"
        className="w-32 text-sm text-gray-700 outline-none placeholder:text-gray-300"
      />
      <button
        onClick={onSubmit}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3D8489] text-white transition-opacity hover:opacity-80"
      >
        <Check size={11} />
      </button>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3D8489] ${
          checked ? "bg-[#3D8489]" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-[#0D2D35]">{title}</h2>
        <p className="mt-0.5 text-sm text-gray-400">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
      {children}
    </h3>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PreferencesContent() {
  const [selectedAllergies, setSelectedAllergies] = useState<Set<string>>(new Set());
  const [selectedDiets, setSelectedDiets]         = useState<Set<string>>(new Set());
  const [selectedCuisines, setSelectedCuisines]   = useState<Set<string>>(new Set());
  const [fusionMode, setFusionMode]               = useState(false);
  const [spiceLevel, setSpiceLevel]               = useState(2);
  const [noGoState, setNoGoState]                 = useState<Record<string, boolean>>(
    Object.fromEntries(NO_GO_ITEMS.map((i) => [i, false])),
  );
  const [selectedEquipment, setSelectedEquipment] = useState<Set<string>>(new Set());
  const [skillLevel, setSkillLevel]               = useState<SkillLevel>("intermediate");
  const [saved, setSaved]                         = useState(false);
  const [saveError, setSaveError]                 = useState<string | null>(null);
  const [loading, setLoading]                     = useState(true);

  // ── Load existing preferences on mount ────────────────────────────────────
  useEffect(() => {
    async function load() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) { setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setSelectedAllergies(new Set<string>(data.allergies ?? []));
        setSelectedDiets(new Set<string>(data.diets ?? []));
        setSelectedCuisines(new Set<string>(data.cuisines ?? []));
        setFusionMode(data.fusion_mode ?? false);
        setSpiceLevel(data.spice_level ?? 2);
        const noGo: Record<string, boolean> = Object.fromEntries(NO_GO_ITEMS.map((i) => [i, false]));
        for (const item of (data.no_go_items ?? [])) noGo[item] = true;
        setNoGoState(noGo);
        setSelectedEquipment(new Set<string>(data.equipment ?? []));
        setSkillLevel((data.skill_level as SkillLevel) ?? "intermediate");
      }
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [otherAllergyText, setOtherAllergyText] = useState("");
  const [otherAllergyOpen, setOtherAllergyOpen] = useState(false);
  const [otherDietText, setOtherDietText]       = useState("");
  const [otherDietOpen, setOtherDietOpen]       = useState(false);
  const [otherCuisineText, setOtherCuisineText] = useState("");
  const [otherCuisineOpen, setOtherCuisineOpen] = useState(false);

  function addOther(
    text: string,
    setText: (s: string) => void,
    setOpen: (b: boolean) => void,
    set: Set<string>,
    setFn: (s: Set<string>) => void,
  ) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const next = new Set(set);
    next.add(trimmed);
    setFn(next);
    setText("");
    setOpen(false);
  }

  function toggleSet(
    set: Set<string>,
    setFn: (s: Set<string>) => void,
    value: string,
  ) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setFn(next);
  }

  async function handleSave() {
    setSaveError(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setSaveError("Not connected to database."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaveError("You must be signed in to save preferences."); return; }

    const { error } = await supabase
      .from("user_preferences")
      .upsert({
        user_id:     user.id,
        allergies:   Array.from(selectedAllergies),
        diets:       Array.from(selectedDiets),
        cuisines:    Array.from(selectedCuisines),
        fusion_mode: fusionMode,
        spice_level: spiceLevel,
        no_go_items: Object.entries(noGoState).filter(([, v]) => v).map(([k]) => k),
        equipment:   Array.from(selectedEquipment),
        skill_level: skillLevel,
      }, { onConflict: "user_id" });

    if (error) {
      console.error("[preferences] save error", error);
      setSaveError(error.message);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div className="flex h-full flex-col gap-5">
      {/* ── Scrollable content ── */}
      <div className="flex-1 space-y-5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">

        <PreferencesHeader />
        {/* Loading skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-3xl bg-gray-200" />
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

          {/* ── Section 1 · Dietary Hard Rules ── */}
          <Card
            title="Dietary Hard Rules"
            subtitle="We'll never include these in your recipes."
          >
            <div className="space-y-5">
              <div>
                <SectionLabel>Allergies</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {ALLERGIES.map((item) => (
                    <Chip
                      key={item}
                      label={item}
                      selected={selectedAllergies.has(item)}
                      onClick={() => toggleSet(selectedAllergies, setSelectedAllergies, item)}
                    />
                  ))}
                  {/* custom allergy chips */}
                  {Array.from(selectedAllergies).filter((a) => !ALLERGIES.includes(a)).map((item) => (
                    <Chip
                      key={item}
                      label={item}
                      selected
                      onClick={() => toggleSet(selectedAllergies, setSelectedAllergies, item)}
                    />
                  ))}
                  <OtherChipInput
                    isOpen={otherAllergyOpen}
                    value={otherAllergyText}
                    onChange={setOtherAllergyText}
                    onOpen={() => setOtherAllergyOpen(true)}
                    onSubmit={() => addOther(otherAllergyText, setOtherAllergyText, setOtherAllergyOpen, selectedAllergies, setSelectedAllergies)}
                    onCancel={() => { setOtherAllergyOpen(false); setOtherAllergyText(""); }}
                  />
                </div>
              </div>
              <div>
                <SectionLabel>Dietary Preferences</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {DIETS.map((item) => (
                    <Chip
                      key={item}
                      label={item}
                      selected={selectedDiets.has(item)}
                      onClick={() => toggleSet(selectedDiets, setSelectedDiets, item)}
                    />
                  ))}
                  {/* custom diet chips */}
                  {Array.from(selectedDiets).filter((d) => !DIETS.includes(d)).map((item) => (
                    <Chip
                      key={item}
                      label={item}
                      selected
                      onClick={() => toggleSet(selectedDiets, setSelectedDiets, item)}
                    />
                  ))}
                  <OtherChipInput
                    isOpen={otherDietOpen}
                    value={otherDietText}
                    onChange={setOtherDietText}
                    onOpen={() => setOtherDietOpen(true)}
                    onSubmit={() => addOther(otherDietText, setOtherDietText, setOtherDietOpen, selectedDiets, setSelectedDiets)}
                    onCancel={() => { setOtherDietOpen(false); setOtherDietText(""); }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* ── Section 2 · Cultural Profile ── */}
          <Card
            title="Cultural Profile"
            subtitle="Select the cuisines that inspire you."
          >
            <div className="grid grid-cols-4 gap-2">
              {CUISINES.map(({ name, emoji }) => {
                const active = selectedCuisines.has(name);
                return (
                  <button
                    key={name}
                    onClick={() => toggleSet(selectedCuisines, setSelectedCuisines, name)}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl p-3 text-center transition-all duration-200 ${
                      active
                        ? "bg-[#3D8489]/10 text-[#0D2D35] ring-2 ring-[#3D8489]"
                        : "border border-gray-100 bg-gray-50/60 text-gray-600 hover:border-[#3D8489]/40 hover:bg-white"
                    }`}
                  >
                    <span className="text-xl leading-none">{emoji}</span>
                    <span className="mt-0.5 text-[10px] font-medium leading-tight">{name}</span>
                    {active && <Check size={9} className="text-[#3D8489]" />}
                  </button>
                );
              })}
            </div>

            {/* Other cuisine */}
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from(selectedCuisines).filter((c) => !CUISINES.find((x) => x.name === c)).map((item) => (
                <Chip
                  key={item}
                  label={item}
                  selected
                  onClick={() => toggleSet(selectedCuisines, setSelectedCuisines, item)}
                />
              ))}
              <OtherChipInput
                isOpen={otherCuisineOpen}
                value={otherCuisineText}
                onChange={setOtherCuisineText}
                onOpen={() => setOtherCuisineOpen(true)}
                onSubmit={() => addOther(otherCuisineText, setOtherCuisineText, setOtherCuisineOpen, selectedCuisines, setSelectedCuisines)}
                onCancel={() => { setOtherCuisineOpen(false); setOtherCuisineText(""); }}
              />
            </div>

            {/* Fusion toggle */}
            <div className="mt-5 rounded-2xl bg-gray-50 p-4">
              <Toggle
                label="Modern Fusion Style"
                checked={fusionMode}
                onChange={() => setFusionMode((v) => !v)}
              />
              <p className="mt-1.5 text-xs text-gray-400">
                {fusionMode
                  ? "Blending global flavors with creative modern twists."
                  : "Keeping recipes authentic to their traditional roots."}
              </p>
            </div>
          </Card>

          {/* ── Section 3 · Flavor & Spice ── */}
          <Card
            title="Flavor & Spice"
            subtitle="Set your heat tolerance and ingredient limits."
          >
            {/* Spice slider */}
            <div className="mb-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Spice Tolerance</span>
                <div
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm transition-colors duration-300"
                  style={{ backgroundColor: SPICE_COLORS[spiceLevel] }}
                >
                  <span>{SPICE_EMOJIS[spiceLevel]}</span>
                  {SPICE_LABELS[spiceLevel]}
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={4}
                value={spiceLevel}
                onChange={(e) => setSpiceLevel(Number(e.target.value))}
                className="spice-slider"
              />
              <div className="mt-2 flex justify-between">
                <span className="text-[10px] text-gray-400">Mild</span>
                <span className="text-[10px] text-gray-400">Extra Hot 🔥</span>
              </div>
            </div>

            {/* No-go toggles */}
            <div>
              <SectionLabel>No-Go Ingredients</SectionLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {NO_GO_ITEMS.map((item) => (
                  <div key={item} className="rounded-xl bg-gray-50 px-3 py-2.5">
                    <Toggle
                      label={item}
                      checked={noGoState[item]}
                      onChange={() =>
                        setNoGoState((prev) => ({ ...prev, [item]: !prev[item] }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* ── Section 4 · Equipment & Skill ── */}
          <Card
            title="Equipment & Skill"
            subtitle="Tell us what's in your kitchen."
          >
            {/* Equipment grid */}
            <div className="mb-6">
              <SectionLabel>Available Equipment</SectionLabel>
              <div className="grid grid-cols-4 gap-2">
                {EQUIPMENT.map(({ name, Icon }) => {
                  const active = selectedEquipment.has(name);
                  return (
                    <button
                      key={name}
                      onClick={() => toggleSet(selectedEquipment, setSelectedEquipment, name)}
                      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl px-2 py-4 transition-all duration-200 ${
                        active
                          ? "bg-[#3D8489] text-white shadow-md"
                          : "border border-gray-100 bg-gray-50/60 text-gray-500 hover:border-[#3D8489]/40 hover:text-[#3D8489] hover:bg-white"
                      }`}
                    >
                      <Icon size={20} />
                      <span className="text-center text-[10px] font-medium leading-tight">
                        {name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Skill level radio */}
            <div>
              <SectionLabel>Cooking Skill Level</SectionLabel>
              <div className="grid grid-cols-3 gap-2">
                {SKILL_LEVELS.map(({ key, label, emoji }) => (
                  <button
                    key={key}
                    onClick={() => setSkillLevel(key)}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-4 text-sm font-semibold transition-all duration-200 ${
                      skillLevel === key
                        ? "bg-[#0D2D35] text-white ring-2 ring-[#3D8489]"
                        : "border border-gray-200 bg-white text-gray-500 hover:border-[#0D2D35] hover:text-[#0D2D35]"
                    }`}
                  >
                    <span className="text-xl leading-none">{emoji}</span>
                    <span className="text-xs capitalize">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </Card>

        </div>
        )} {/* end loading guard */}
      </div>

      {/* ── Always-visible save button ── */}
      <div className="flex-shrink-0 pt-1 space-y-2">
        <button
          onClick={handleSave}
          className={`group relative w-full cursor-pointer overflow-hidden rounded-2xl px-8 py-4 text-base font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 ${
            saved ? "bg-green-500" : "bg-[#0D2D35]"
          }`}
        >
          {/* Hover fill sweep */}
          {!saved && (
            <span className="absolute inset-0 -translate-x-full bg-[#3D8489] transition-transform duration-500 ease-out group-hover:translate-x-0" />
          )}
          <span className="relative z-10 flex items-center justify-center gap-2">
            {saved ? (
              <>
                <Check size={18} />
                Preferences Saved!
              </>
            ) : (
              <>
                <Save size={18} />
                Save Preferences
              </>
            )}
          </span>
        </button>
        {saveError && (
          <p className="text-center text-xs text-red-500">{saveError}</p>
        )}
      </div>
    </div>
  );
}

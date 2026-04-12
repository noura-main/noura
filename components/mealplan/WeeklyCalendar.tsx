"use client";

const OFFSETS = [0, 1, 2, 3, 4, 5, 6];

function getDayLabel(offset: number): string {
  if (offset === 0) return "TODAY";
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
}

export function getDateString(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD
}

interface Props {
  selectedOffset: number;
  onSelect: (offset: number) => void;
}

export default function WeeklyCalendar({ selectedOffset, onSelect }: Props) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {OFFSETS.map((offset) => {
        const isActive = selectedOffset === offset;
        return (
          <button
            key={offset}
            onClick={() => onSelect(offset)}
            className="flex min-w-[72px] flex-1 flex-col items-center justify-center rounded-2xl border py-5 transition-all duration-200 hover:shadow-md focus:outline-none"
            style={{
              background: isActive ? "#063643" : "#ffffff",
              borderColor: isActive ? "#063643" : "rgba(6,54,67,0.14)",
              color: isActive ? "#ffffff" : "#4b6068",
            }}
          >
            <span className="text-xs font-bold tracking-widest">{getDayLabel(offset)}</span>
            {isActive && (
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white opacity-70" />
            )}
          </button>
        );
      })}
    </div>
  );
}

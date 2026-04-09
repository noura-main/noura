"use client";

import dynamic from "next/dynamic";

const NearbyFoodMap = dynamic(() => import("./NearbyFoodMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[50vh] w-full items-center justify-center rounded-3xl border border-[#d7dee2] bg-[linear-gradient(135deg,#d8dfe5,#eff3f5)] text-sm text-[#5c6f78]">
      Loading map…
    </div>
  ),
});

export default function NearbyFoodMapLoader() {
  return <NearbyFoodMap />;
}

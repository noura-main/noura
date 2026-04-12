"use client";

import { useState, useEffect } from "react";
import { fetchPixabayImageClient } from "@/lib/utils/pixabay";

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  fallback?: string;
  fill?: boolean; // when true, position absolute and cover parent
  // optional category hint to select a category-based fallback image (e.g. 'Fruits', 'Vegetables')
  fallbackCategory?: string;
}

export default function FallbackImage({ src, fallback = "/recipes/recipes.png", alt = "", className = "", fill = false, fallbackCategory, ...rest }: Props) {
  const [current, setCurrent] = useState<string>(src ?? fallback);
  const [reported, setReported] = useState(false);
  const [attemptedCategory, setAttemptedCategory] = useState<string | null>(null);

  useEffect(() => {
    setCurrent(src ?? fallback);
  }, [src, fallback]);

  return (
    <img
      src={current}
      alt={alt}
      className={
        (fill ? "absolute inset-0 h-full w-full object-cover" : "") +
        (className ? " " + className : "")
      }
      onError={(e) => {
        const target = e.currentTarget as HTMLImageElement;
        if (target.src === fallback) return;
        // If caller provided a category hint and we haven't tried it yet, query Pixabay for a category image
        const fc = fallbackCategory as string | undefined;
        if (fc && !attemptedCategory) {
          setAttemptedCategory(fc);
          (async () => {
            try {
              const catQuery = fc.toLowerCase();
              const pix = await fetchPixabayImageClient(catQuery);
              if (pix) {
                target.src = pix;
                setCurrent(pix);
                return;
              }
            } catch {}
            target.src = fallback;
            setCurrent(fallback);
          })();
        } else {
          target.src = fallback;
          setCurrent(fallback);
        }
        // Send telemetry about fallback usage (best-effort)
        try {
          if (!reported) {
            const payload = { failedSrc: String(src ?? ""), fallback, alt, path: typeof window !== 'undefined' ? window.location.pathname : undefined };
            if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
              try {
                const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
                // sendBeacon is fire-and-forget
                (navigator as any).sendBeacon("/api/telemetry/image-fallback", blob);
              } catch (err) {
                // fallback to fetch
                fetch("/api/telemetry/image-fallback", { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
              }
            } else {
              fetch("/api/telemetry/image-fallback", { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
            }
            setReported(true);
          }
        } catch {}
      }}
      {...rest}
    />
  );
}

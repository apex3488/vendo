"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { fmt } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";

type Img = { src: string; thumb: string; width: number; height: number };

export function Gallery({ images, title }: { images: Img[]; title: string }) {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  const touch = useRef<number | null>(null);
  const n = images.length;
  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,select,dialog")) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (!n) {
    return (
      <div className="grid aspect-[4/3] place-items-center rounded-[var(--radius-xl)] bg-soft text-subtle">
        <div className="flex flex-col items-center gap-2 text-sm">
          <ImageOff className="h-10 w-10" strokeWidth={1.3} />
          {t.listing.noPhoto}
        </div>
      </div>
    );
  }
  const cur = images[i]!;
  return (
    <div>
      <div
        className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)] bg-ink/[0.03]"
        onTouchStart={(e) => (touch.current = e.touches[0]!.clientX)}
        onTouchEnd={(e) => {
          if (touch.current == null) return;
          const dx = e.changedTouches[0]!.clientX - touch.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touch.current = null;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- resized and re-encoded at upload */}
        <img
          key={cur.src}
          src={cur.src}
          alt={`${title} — ${fmt(t.listing.photo, { n: i + 1, total: n })}`}
          width={cur.width}
          height={cur.height}
          className="h-full w-full animate-fade-in object-contain"
          fetchPriority={i === 0 ? "high" : "auto"}
        />
        {n > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label={t.search.prev} className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-surface/95 shadow-sm hover:bg-surface">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label={t.search.next} className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-surface/95 shadow-sm hover:bg-surface">
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-ink/75 px-2.5 py-1 text-xs font-semibold text-white">
              {i + 1} / {n}
            </span>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
          {images.map((img, idx) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setI(idx)}
              aria-label={fmt(t.listing.photo, { n: idx + 1, total: n })}
              aria-current={idx === i}
              className={cn("h-16 w-20 shrink-0 overflow-hidden rounded-[10px] ring-2 transition md:h-[72px] md:w-24", idx === i ? "ring-ink" : "ring-transparent opacity-70 hover:opacity-100")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

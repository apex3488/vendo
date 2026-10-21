"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Globe } from "lucide-react";
import { setLocaleAction } from "@/app/actions/prefs";
import { LOCALE_LABELS, LOCALE_SHORT, LOCALES, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";

export function LocalePicker({ current, align = "right" }: { current: Locale; align?: "left" | "right" }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.nav.language}
        className="flex h-10 items-center gap-1.5 rounded-[12px] px-2.5 text-sm font-semibold hover:bg-soft"
      >
        <Globe className="hidden h-4 w-4 text-muted sm:block" strokeWidth={2} />
        {LOCALE_SHORT[current]}
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-[calc(100%+6px)] z-50 w-44 animate-rise rounded-[14px] border border-line bg-surface p-1.5 shadow-[var(--shadow-pop)]",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {LOCALES.map((l) => (
            <button
              key={l}
              role="menuitemradio"
              aria-checked={l === current}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await setLocaleAction(l);
                  setOpen(false);
                  router.refresh();
                })
              }
              className="flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left text-[15px] hover:bg-soft"
            >
              {LOCALE_LABELS[l]}
              {l === current && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

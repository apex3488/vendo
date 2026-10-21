"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Toast = { id: number; text: string; tone: "success" | "error" };
const ToastCtx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s.slice(-2), { id, text, tone }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex max-w-md animate-rise items-center gap-2.5 rounded-[14px] px-4 py-3 text-sm font-medium shadow-[var(--shadow-pop)]",
              t.tone === "success" ? "bg-ink text-white" : "bg-danger text-white",
            )}
          >
            {t.tone === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-lime" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

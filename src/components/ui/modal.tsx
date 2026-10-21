"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/** Accessible modal built on the native <dialog> element (focus trap, Esc, backdrop). */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  closeLabel = "Close",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  closeLabel?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-32px)] max-w-lg rounded-[var(--radius-xl)] bg-surface p-0 text-ink shadow-[var(--shadow-pop)] backdrop:bg-ink/40 backdrop:backdrop-blur-[2px] open:animate-rise",
        className,
      )}
    >
      {open && (
        <div className="p-5 md:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="t-3 text-lg">{title}</h2>
            <button type="button" onClick={onClose} aria-label={closeLabel} className="-m-1.5 rounded-full p-1.5 text-muted hover:bg-soft hover:text-ink">
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

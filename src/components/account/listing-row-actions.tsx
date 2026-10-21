"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { ownerStatusAction } from "@/app/actions/listings";
import { useI18n } from "@/lib/i18n/client";
import { useToast } from "../ui/toast";

export function ListingRowActions({ id, status, type }: { id: number; status: string; type: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
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

  function run(action: "archive" | "mark_sold" | "republish" | "delete") {
    if (action === "delete" && !window.confirm(t.account.confirmDelete)) return;
    start(async () => {
      const res = await ownerStatusAction(id, action);
      setOpen(false);
      if (!res.ok) toast(res.error, "error");
      else router.refresh();
    });
  }

  const soldLabel = type === "rent" ? t.account.markRented : type === "service" ? t.account.markUnavailable : t.account.markSold;
  const item = "block w-full rounded-[10px] px-3 py-2 text-left text-[15px] hover:bg-soft";

  return (
    <div ref={ref} className="relative shrink-0 self-start">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        aria-label={t.account.actions}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid h-9 w-9 place-items-center rounded-[10px] hover:bg-soft"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-10 z-30 w-60 animate-rise rounded-[14px] border border-line bg-surface p-1.5 shadow-[var(--shadow-pop)]">
          <Link role="menuitem" href={`/post/${id}`} className={item}>
            {status === "draft" ? t.account.continue : t.account.edit}
          </Link>
          {status === "active" && (
            <>
              <Link role="menuitem" href={`/account/promotions?listing=${id}`} className={item}>
                {t.account.promote}
              </Link>
              <button role="menuitem" className={item} onClick={() => run("mark_sold")}>
                {soldLabel}
              </button>
            </>
          )}
          {["active", "pending", "rejected", "sold"].includes(status) && (
            <button role="menuitem" className={item} onClick={() => run("archive")}>
              {t.account.archiveAction}
            </button>
          )}
          {["archived", "sold"].includes(status) && (
            <button role="menuitem" className={item} onClick={() => run("republish")}>
              {t.account.republish}
            </button>
          )}
          <button role="menuitem" className={`${item} text-danger`} onClick={() => run("delete")}>
            {t.account.delete}
          </button>
        </div>
      )}
    </div>
  );
}

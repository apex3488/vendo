"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, MapPin } from "lucide-react";
import { setCityAction } from "@/app/actions/prefs";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { Modal } from "../ui/modal";

type Region = { id: number; name: string; cities: { id: number; name: string }[] };

export function CityPicker({
  regions,
  selectedId,
  selectedName,
  className,
}: {
  regions: Region[];
  selectedId: number | null;
  selectedName: string | null;
  className?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [pending, start] = useTransition();

  function choose(id: number | null) {
    start(async () => {
      await setCityAction(id);
      setOpen(false);
      router.refresh();
    });
  }

  const f = filter.trim().toLowerCase();
  const visible = regions
    .map((r) => ({ ...r, cities: r.cities.filter((c) => !f || c.name.toLowerCase().includes(f) || r.name.toLowerCase().includes(f)) }))
    .filter((r) => r.cities.length);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("flex h-10 items-center gap-1.5 rounded-[12px] px-2.5 text-sm font-semibold text-ink hover:bg-soft", className)}
      >
        <MapPin className="h-4 w-4 text-muted" strokeWidth={2} />
        <span className="max-w-[84px] truncate sm:max-w-[140px]">{selectedName ?? t.nav.allCities}</span>
        <ChevronDown className="hidden h-3.5 w-3.5 text-muted sm:block" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t.nav.city} closeLabel={t.common.close}>
        <input
          autoFocus
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t.common.search}
          className="mb-3 h-11 w-full rounded-[12px] border border-line-strong px-3.5 text-[15px] outline-none focus:border-ink"
        />
        <div className="max-h-[60vh] overflow-y-auto pr-1" aria-busy={pending}>
          <button
            type="button"
            onClick={() => choose(null)}
            className={cn("mb-2 w-full rounded-[10px] px-3 py-2 text-left text-[15px] font-semibold hover:bg-soft", !selectedId && "bg-lime-soft")}
          >
            {t.nav.allCities}
          </button>
          {visible.map((r) => (
            <div key={r.id} className="mb-3">
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-subtle">{r.name}</p>
              <div className="grid grid-cols-2 gap-0.5">
                {r.cities.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={pending}
                    onClick={() => choose(c.id)}
                    className={cn("rounded-[10px] px-3 py-2 text-left text-[15px] hover:bg-soft", c.id === selectedId && "bg-lime-soft font-semibold")}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}

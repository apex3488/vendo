"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";

export function SortSelect({ value, hasQuery }: { value: string; hasQuery: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const options = [
    ...(hasQuery ? [["relevance", t.search.sortRelevance]] : []),
    ["new", t.search.sortNew],
    ["price_asc", t.search.sortPriceAsc],
    ["price_desc", t.search.sortPriceDesc],
    ["popular", t.search.sortPopular],
  ] as [string, string][];
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-muted sm:inline">{t.search.sort}:</span>
      <select
        value={value}
        onChange={(e) => {
          const sp = new URLSearchParams(params);
          sp.set("sort", e.target.value);
          sp.delete("page");
          router.push(`${pathname}?${sp}`);
        }}
        className="h-10 rounded-[10px] border border-line-strong bg-surface px-3 text-sm font-semibold outline-none focus:border-ink"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

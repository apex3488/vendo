"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, Search, TrendingUp, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";

const RECENT_KEY = "vendo:recent-searches";

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}
function saveRecent(q: string) {
  try {
    const list = [q, ...readRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
}

/**
 * Search input with autocomplete (server suggestions from real titles/queries),
 * recent searches (stored only in this browser) and popular queries.
 */
export function SearchBox({
  popular,
  categories,
  cityId,
  compact,
  withCategory,
}: {
  popular: string[];
  categories: { slug: string; name: string }[];
  cityId: number | null;
  compact?: boolean;
  withCategory?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const urlQ = params.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);
  if (urlQ !== prevUrlQ) {
    // Keep the input in sync when navigation changes the query.
    setPrevUrlQ(urlQ);
    setQ(urlQ);
  }
  const [cat, setCat] = useState("");
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d: { items: string[] }) => setSuggestions(d.items ?? []))
        .catch(() => {});
    }, 180);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const showingSuggestions = q.trim().length >= 2 && suggestions.length > 0;
  const items = showingSuggestions ? suggestions : [...recent, ...popular.filter((p) => !recent.includes(p))].slice(0, 8);

  function go(term: string) {
    const value = term.trim();
    const sp = new URLSearchParams();
    if (value) {
      sp.set("q", value);
      saveRecent(value);
    }
    if (cityId) sp.set("city", String(cityId));
    setOpen(false);
    const base = cat ? `/c/${cat}` : "/search";
    router.push(`${base}${sp.size ? `?${sp}` : ""}`);
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(active >= 0 && items[active] ? items[active]! : q);
        }}
        className={cn(
          "flex w-full items-center gap-2 rounded-[14px] border border-line-strong bg-surface pl-3.5 transition-colors focus-within:border-ink",
          compact ? "h-11" : "h-14 md:h-16 md:pl-5",
        )}
      >
        <Search className="h-5 w-5 shrink-0 text-muted" strokeWidth={1.8} aria-hidden />
        <input
          type="search"
          name="q"
          value={q}
          autoComplete="off"
          enterKeyHint="search"
          placeholder={t.search.placeholder}
          aria-label={t.search.placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          onFocus={() => {
            setRecent(readRecent());
            setOpen(true);
          }}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, items.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, -1));
            } else if (e.key === "Escape") setOpen(false);
          }}
          className={cn("min-w-0 flex-1 bg-transparent outline-none placeholder:text-subtle [&::-webkit-search-cancel-button]:hidden", compact ? "text-[15px]" : "text-base md:text-lg")}
        />
        {q && (
          <button type="button" onClick={() => setQ("")} className="rounded-full p-1 text-muted hover:text-ink" aria-label={t.common.close}>
            <X className="h-4 w-4" />
          </button>
        )}
        {withCategory && (
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            aria-label={t.search.inCategory}
            className="hidden h-full max-w-[220px] border-l border-line bg-transparent px-3 text-sm font-medium text-ink-2 outline-none md:block"
          >
            <option value="">{t.search.anyCategory}</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="submit"
          className={cn(
            "mr-1.5 inline-flex shrink-0 items-center justify-center rounded-[10px] bg-ink font-semibold text-white transition-colors hover:bg-ink-2",
            compact ? "h-8 px-3 text-sm" : "h-11 px-5 text-[15px] md:h-12 md:px-7",
          )}
        >
          {t.search.button}
        </button>
      </form>

      {open && items.length > 0 && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-50 animate-rise overflow-hidden rounded-[16px] border border-line bg-surface py-2 shadow-[var(--shadow-pop)]">
          <div className="flex items-center justify-between px-4 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-subtle">
            <span>{showingSuggestions ? t.search.suggestions : recent.length ? t.search.recent : t.search.popular}</span>
            {!showingSuggestions && recent.length > 0 && (
              <button
                type="button"
                className="normal-case tracking-normal text-muted hover:text-ink"
                onClick={() => {
                  try {
                    localStorage.removeItem(RECENT_KEY);
                  } catch {}
                  setRecent([]);
                }}
              >
                {t.search.clearRecent}
              </button>
            )}
          </div>
          <ul id={listId} role="listbox">
            {items.map((item, i) => {
              const isRecent = !showingSuggestions && recent.includes(item);
              return (
                <li key={item} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(item)}
                    className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left text-[15px]", i === active ? "bg-soft" : "hover:bg-soft")}
                  >
                    {showingSuggestions ? (
                      <Search className="h-4 w-4 text-subtle" />
                    ) : isRecent ? (
                      <Clock className="h-4 w-4 text-subtle" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-subtle" />
                    )}
                    <span className="truncate">{item}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

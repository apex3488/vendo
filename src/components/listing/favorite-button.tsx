"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleFavoriteAction } from "@/app/actions/listing-public";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { useToast } from "../ui/toast";

export function FavoriteButton({
  listingId,
  initial,
  loggedIn,
  variant = "overlay",
}: {
  listingId: number;
  initial: boolean;
  loggedIn: boolean;
  variant?: "overlay" | "full";
}) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [fav, setFav] = useState(initial);
  const [pending, start] = useTransition();

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    const prev = fav;
    setFav(!prev);
    start(async () => {
      const res = await toggleFavoriteAction(listingId);
      if (!res.ok) {
        setFav(prev);
        toast(res.error, "error");
      } else setFav(!!res.data?.favorite);
    });
  }

  const label = fav ? t.listing.unfavorite : t.listing.favorite;
  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={fav}
        className="inline-flex h-11 items-center gap-2 rounded-[12px] border border-line-strong bg-surface px-4 text-[15px] font-semibold hover:bg-canvas"
      >
        <Heart className={cn("h-5 w-5", fav && "fill-danger text-danger")} strokeWidth={1.9} />
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={fav}
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-full bg-surface/95 shadow-sm backdrop-blur transition-transform hover:scale-105"
    >
      <Heart className={cn("h-[18px] w-[18px]", fav ? "fill-danger text-danger" : "text-ink")} strokeWidth={2} />
    </button>
  );
}

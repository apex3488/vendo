import { mediaUrl } from "@/server/storage";
import { pickAd } from "@/server/services/monetization";
import { cn } from "@/lib/cn";

/**
 * Renders a running ad campaign for a placement, clearly labelled as advertising and visually
 * separated from listings. Renders nothing when no campaign is active.
 */
export async function AdSlot({ placement, categoryId, className, label }: { placement: string; categoryId?: number | null; className?: string; label: string }) {
  const ad = await pickAd(placement, categoryId);
  if (!ad?.imageKey) return null;
  const src = mediaUrl(ad.imageKey);
  return (
    <aside className={cn("relative overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface", className)} aria-label={label}>
      <a href={`/api/ads/${ad.id}/click`} target="_blank" rel="noopener noreferrer sponsored" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element -- uploaded and resized by the server */}
        <img src={src ?? ""} alt={ad.title} loading="lazy" className="h-auto w-full object-cover" />
      </a>
      <span className="absolute left-2 top-2 rounded-md bg-surface/90 px-1.5 py-0.5 text-[11px] font-semibold text-muted">{label}</span>
    </aside>
  );
}

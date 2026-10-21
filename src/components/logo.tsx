import Link from "next/link";
import { cn } from "@/lib/cn";

/** Wordmark: lowercase "vendo" with a lime dot. */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} aria-label="VENDO" className={cn("inline-flex items-baseline text-[26px] font-extrabold leading-none tracking-[-0.06em] text-ink", className)}>
      vendo
      <span className="ml-[2px] inline-block h-[7px] w-[7px] rounded-full bg-lime ring-[1.5px] ring-ink" aria-hidden />
    </Link>
  );
}

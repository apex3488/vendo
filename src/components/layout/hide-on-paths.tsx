"use client";

import { usePathname } from "next/navigation";

/** Renders its children everywhere except on the given exact paths (e.g. the home page has its own big search). */
export function HideOnPaths({ paths, className, children }: { paths: string[]; className?: string; children: React.ReactNode }) {
  const path = usePathname();
  if (paths.includes(path)) return null;
  return <div className={className}>{children}</div>;
}

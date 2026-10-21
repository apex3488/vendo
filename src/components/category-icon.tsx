import {
  Baby,
  Bike,
  BookOpen,
  Building2,
  Car,
  Flower2,
  KeyRound,
  Package,
  Shirt,
  Smartphone,
  Sofa,
  Sparkles,
  Tag,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/** Admin picks an icon name per category; unknown names fall back to a tag. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  shirt: Shirt,
  smartphone: Smartphone,
  flower: Flower2,
  car: Car,
  sofa: Sofa,
  baby: Baby,
  bike: Bike,
  sparkles: Sparkles,
  book: BookOpen,
  key: KeyRound,
  wrench: Wrench,
  package: Package,
  building: Building2,
  tag: Tag,
};

export function CategoryIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  const Icon = (name && CATEGORY_ICONS[name]) || Tag;
  return <Icon className={className} strokeWidth={1.7} aria-hidden />;
}

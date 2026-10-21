const MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  ў: "o", қ: "q", ғ: "g", ҳ: "h", "ʻ": "", "ʼ": "", "‘": "", "’": "", "'": "",
};

/** URL slug from Cyrillic/Latin text: "Продам iPhone 13" -> "prodam-iphone-13". */
export function slugify(input: string, maxLength = 80): string {
  const out = input
    .toLowerCase()
    .split("")
    .map((ch) => MAP[ch] ?? ch)
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  return out || "item";
}

export function listingPath(l: { id: number; slug: string }) {
  return `/l/${l.id}-${l.slug}`;
}

/** Parses "123-some-slug" -> 123. */
export function parseListingParam(param: string): number | null {
  const m = /^(\d{1,15})(?:-|$)/.exec(param);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

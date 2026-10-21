/**
 * Contact validation shared by forms and server code.
 * Only safe, normalized values are stored, so rendered links can never carry
 * arbitrary URL schemes (javascript:, data:, etc.).
 */

/** Normalizes a phone number to E.164 ("+998901234567"). Returns null if invalid. */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  let digits = trimmed.replace(/[\s()\-.]/g, "");
  if (digits.startsWith("00")) digits = "+" + digits.slice(2);
  if (!digits.startsWith("+")) {
    // Local Uzbek format: 9 digits (90 123 45 67) or 998XXXXXXXXX without plus.
    if (/^\d{9}$/.test(digits)) digits = "+998" + digits;
    else if (/^998\d{9}$/.test(digits)) digits = "+" + digits;
    else return null;
  }
  if (!/^\+\d{10,15}$/.test(digits)) return null;
  if (digits.startsWith("+998") && digits.length !== 13) return null;
  return digits;
}

/** Formats "+998901234567" as "+998 90 123 45 67". */
export function formatPhone(e164: string): string {
  const m = /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(e164);
  if (m) return `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
  return e164;
}

/** Masked form shown before the user explicitly reveals the number. */
export function maskPhone(e164: string): string {
  const formatted = formatPhone(e164);
  return formatted.slice(0, Math.max(0, formatted.length - 5)) + "XX XX";
}

/**
 * Accepts "@name", "name", "t.me/name", "https://t.me/name".
 * Returns the bare username (5–32 chars, letters, digits, underscore) or null.
 */
export function normalizeTelegram(input: string | null | undefined): string | null {
  if (!input) return null;
  let v = input.trim();
  if (!v) return null;
  v = v.replace(/^https?:\/\//i, "").replace(/^(www\.)?(t\.me|telegram\.me)\//i, "").replace(/^@/, "");
  v = v.split(/[/?#]/)[0] ?? "";
  if (!/^[a-zA-Z][a-zA-Z0-9_]{3,30}[a-zA-Z0-9]$/.test(v)) return null;
  if (v.includes("__")) return null;
  return v;
}

/** Builds the only Telegram URL form the app ever renders. */
export function telegramUrl(username: string): string {
  return `https://t.me/${encodeURIComponent(username)}`;
}

export function telUrl(e164: string): string {
  return `tel:${e164}`;
}

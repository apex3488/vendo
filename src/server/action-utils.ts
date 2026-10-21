import "server-only";
import { headers } from "next/headers";
import { ZodError } from "zod";
import { getI18n } from "@/lib/i18n/server";
import { AuthError } from "./auth/permissions";
import { ServiceError, type ActionResult, type FieldErrors } from "./errors";
import { ListingValidationError } from "./services/listings";
import { hashIp } from "./services/rate-limit";

export async function clientIpHash() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  return hashIp(ip);
}

/** Converts any thrown error into a safe, translated ActionResult. Unexpected errors are logged, not exposed. */
export async function toActionError(e: unknown): Promise<ActionResult<never>> {
  const { t } = await getI18n();
  const msg = t.errors as Record<string, string>;
  if (e instanceof ListingValidationError) {
    const fieldErrors: FieldErrors = {};
    for (const [k, v] of Object.entries(e.fieldErrors)) fieldErrors[k] = msg[v === "contact_required" ? "contact_required_field" : v] ?? msg.invalid!;
    return { ok: false, error: msg.invalid_input!, fieldErrors };
  }
  if (e instanceof ServiceError) {
    return { ok: false, error: msg[e.code] ?? msg.generic!, fieldErrors: e.field ? { [e.field]: msg[e.code] ?? msg.invalid! } : undefined };
  }
  if (e instanceof AuthError) {
    return { ok: false, error: e.code === "UNAUTHENTICATED" ? msg.unauthenticated! : msg.forbidden! };
  }
  if (e instanceof ZodError) {
    const fieldErrors: FieldErrors = {};
    for (const issue of e.issues) {
      const key = issue.path.join(".");
      if (fieldErrors[key]) continue;
      fieldErrors[key] =
        issue.code === "too_small" ? msg.too_short! : issue.code === "too_big" ? msg.too_long! : msg.invalid!;
    }
    return { ok: false, error: msg.invalid_input!, fieldErrors };
  }
  console.error("[action] unexpected error", e);
  return { ok: false, error: msg.generic! };
}

/**
 * Expected business errors. `code` maps to a translated message in the UI (dict.errors).
 * Unexpected errors are logged on the server and shown as a generic message.
 */
export type ErrorCode =
  | "invalid_input"
  | "not_found"
  | "forbidden"
  | "unauthenticated"
  | "rate_limited"
  | "invalid_credentials"
  | "account_blocked"
  | "email_taken"
  | "username_taken"
  | "invalid_phone"
  | "invalid_telegram"
  | "contact_required"
  | "listing_limit"
  | "daily_limit"
  | "image_invalid"
  | "image_too_large"
  | "too_many_images"
  | "category_has_children"
  | "category_has_listings"
  | "category_invalid_parent"
  | "invalid_status"
  | "plan_unavailable"
  | "token_invalid"
  | "already_reported"
  | "slug_taken";

export class ServiceError extends Error {
  constructor(
    public code: ErrorCode,
    public field?: string,
    public detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "ServiceError";
  }
}

export type FieldErrors = Record<string, string>;

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

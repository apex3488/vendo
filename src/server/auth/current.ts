import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "../db";
import { AuthError, can, type Permission } from "./permissions";
import { SESSION_COOKIE, createSession, invalidateSession, validateSessionToken, type SessionUser } from "./sessions";

/** The signed-in user for this request (deduplicated per request). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSessionToken(await getDb(), token);
});

/** For pages: redirects to login when signed out. */
export async function requireUserPage(next?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

/** For pages: 404s for anyone without the permission (does not reveal admin routes). */
export async function requirePermissionPage(permission: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!can(user.role, permission)) {
    const { notFound } = await import("next/navigation");
    notFound();
  }
  return user;
}

/** For server actions / route handlers. Throws AuthError. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  return user;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) throw new AuthError("FORBIDDEN");
  return user;
}

export async function startSession(userId: string) {
  const ua = (await headers()).get("user-agent");
  const { token, expiresAt } = await createSession(await getDb(), userId, ua);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await invalidateSession(await getDb(), token);
  store.delete(SESSION_COOKIE);
}

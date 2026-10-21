import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import type { Db } from "../db/client";
import { sessions, users } from "../db/schema";
import type { Role } from "./permissions";

export const SESSION_COOKIE = "vendo_session";
export const SESSION_DAYS = 30;
const DAY = 86_400_000;

export type SessionUser = {
  id: string;
  displayName: string;
  email: string | null;
  username: string | null;
  role: Role;
  locale: string;
  cityId: number | null;
};

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(db: Db, userId: string, userAgent?: string | null) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
    userAgent: userAgent?.slice(0, 255) ?? null,
  });
  return { token, expiresAt };
}

/** Returns the user for a valid session of an active account, extending the session when half-used. */
export async function validateSessionToken(db: Db, token: string): Promise<SessionUser | null> {
  if (!token || token.length > 100) return null;
  const id = hashToken(token);
  const rows = await db
    .select({
      expiresAt: sessions.expiresAt,
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      username: users.username,
      role: users.role,
      status: users.status,
      locale: users.locale,
      cityId: users.cityId,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.status !== "active") {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  if (row.expiresAt.getTime() - Date.now() < (SESSION_DAYS / 2) * DAY) {
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() + SESSION_DAYS * DAY) })
      .where(eq(sessions.id, id));
  }
  return {
    id: row.id,
    displayName: row.displayName,
    email: row.email,
    username: row.username,
    role: row.role,
    locale: row.locale,
    cityId: row.cityId,
  };
}

export async function invalidateSession(db: Db, token: string) {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

export async function invalidateUserSessions(db: Db, userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function purgeExpiredSessions(db: Db) {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

import { randomBytes } from "node:crypto";
import { and, count, desc, eq, gt, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { normalizePhone, normalizeTelegram } from "@/lib/contacts";
import { isLocale } from "@/lib/i18n/config";
import { getDb } from "../db";
import { passwordResetTokens, users } from "../db/schema";
import { getDummyHash, hashPassword, PASSWORD_MAX, PASSWORD_MIN, verifyPassword } from "../auth/password";
import { assignableRoles, outranks, type Role } from "../auth/permissions";
import { hashToken, invalidateUserSessions } from "../auth/sessions";
import { ServiceError } from "../errors";
import { audit } from "./audit";

export const passwordSchema = z.string().min(PASSWORD_MIN).max(PASSWORD_MAX);
export const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_.]+$/);

export const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  password: passwordSchema,
});

export async function registerUser(input: z.input<typeof registerSchema>) {
  const data = registerSchema.parse(input);
  const db = await getDb();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${data.email}`)
    .limit(1);
  if (existing.length) throw new ServiceError("email_taken", "email");
  const [user] = await db
    .insert(users)
    .values({ email: data.email, displayName: data.displayName, passwordHash: await hashPassword(data.password) })
    .returning({ id: users.id });
  return user!;
}

/** Login by email or username. Uniform timing for unknown users. */
export async function authenticate(login: string, password: string) {
  const db = await getDb();
  const value = login.trim().toLowerCase();
  if (!value || !password) throw new ServiceError("invalid_credentials");
  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash, status: users.status, role: users.role })
    .from(users)
    .where(or(sql`lower(${users.email}) = ${value}`, sql`lower(${users.username}) = ${value}`))
    .limit(1);
  const ok = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) throw new ServiceError("invalid_credentials");
  if (user.status !== "active") throw new ServiceError("account_blocked");
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  return { id: user.id, role: user.role };
}

// ---------------------------------------------------------------------------
// Password recovery
// ---------------------------------------------------------------------------

const RESET_TTL_MS = 60 * 60 * 1000;

/** Returns a raw token if the email exists (caller emails it). Never reveals whether it exists. */
export async function createPasswordReset(email: string): Promise<{ token: string; userId: string } | null> {
  const db = await getDb();
  const [user] = await db
    .select({ id: users.id, status: users.status })
    .from(users)
    .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
    .limit(1);
  if (!user || user.status !== "active") return null;
  const token = randomBytes(32).toString("base64url");
  await db.insert(passwordResetTokens).values({
    tokenHash: hashToken(token),
    userId: user.id,
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  });
  return { token, userId: user.id };
}

export async function resetPassword(token: string, newPassword: string) {
  const password = passwordSchema.parse(newPassword);
  const db = await getDb();
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, hashToken(token)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!row) throw new ServiceError("token_invalid");
  await db.update(users).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(users.id, row.userId));
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.userId, row.userId));
  await invalidateUserSessions(db, row.userId);
}

export async function changePassword(userId: string, current: string, next: string) {
  const db = await getDb();
  const [u] = await db.select({ h: users.passwordHash }).from(users).where(eq(users.id, userId));
  if (!u || !(await verifyPassword(current, u.h))) throw new ServiceError("invalid_credentials", "currentPassword");
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(passwordSchema.parse(next)), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(30).optional().default(""),
  telegram: z.string().trim().max(60).optional().default(""),
  showPhone: z.boolean().default(false),
  cityId: z.coerce.number().int().positive().nullable().optional(),
  locale: z.string().refine(isLocale),
});

export async function updateProfile(userId: string, input: z.input<typeof profileSchema>) {
  const data = profileSchema.parse(input);
  const phone = data.phone ? normalizePhone(data.phone) : null;
  if (data.phone && !phone) throw new ServiceError("invalid_phone", "phone");
  const telegram = data.telegram ? normalizeTelegram(data.telegram) : null;
  if (data.telegram && !telegram) throw new ServiceError("invalid_telegram", "telegram");
  const db = await getDb();
  await db
    .update(users)
    .set({
      displayName: data.displayName,
      phone,
      telegram,
      showPhone: data.showPhone,
      cityId: data.cityId ?? null,
      locale: data.locale,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function getProfile(userId: string) {
  const db = await getDb();
  const [u] = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      displayName: users.displayName,
      phone: users.phone,
      telegram: users.telegram,
      showPhone: users.showPhone,
      cityId: users.cityId,
      locale: users.locale,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId));
  return u ?? null;
}

/** Public seller info. Phone is included only when the user opted in. */
export async function getPublicUser(userId: string) {
  const db = await getDb();
  const [u] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      status: users.status,
      createdAt: users.createdAt,
      phone: users.phone,
      showPhone: users.showPhone,
      telegram: users.telegram,
    })
    .from(users)
    .where(eq(users.id, userId));
  if (!u || u.status !== "active") return null;
  return { ...u, phone: u.showPhone ? u.phone : null };
}

// ---------------------------------------------------------------------------
// Administration
// ---------------------------------------------------------------------------

export async function adminListUsers(opts: { q?: string; role?: string; status?: string; page: number; perPage?: number }) {
  const db = await getDb();
  const perPage = opts.perPage ?? 25;
  const conds: SQL[] = [];
  if (opts.q) {
    const q = `%${opts.q.trim()}%`;
    conds.push(or(ilike(users.email, q), ilike(users.username, q), ilike(users.displayName, q), ilike(users.phone, q))!);
  }
  if (opts.role) conds.push(eq(users.role, opts.role as Role));
  if (opts.status === "active" || opts.status === "blocked") conds.push(eq(users.status, opts.status));
  const where = conds.length ? and(...conds) : undefined;
  const [items, [total]] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(perPage)
      .offset((opts.page - 1) * perPage),
    db.select({ n: count() }).from(users).where(where),
  ]);
  return { items, total: total?.n ?? 0, perPage };
}

export async function adminGetUser(id: string) {
  const db = await getDb();
  const [u] = await db.select().from(users).where(eq(users.id, id));
  if (!u) return null;
  const rest: Partial<typeof u> = { ...u };
  delete rest.passwordHash;
  return rest as Omit<typeof u, "passwordHash">;
}

async function loadTarget(targetId: string) {
  const db = await getDb();
  const [target] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, targetId));
  if (!target) throw new ServiceError("not_found");
  return target;
}

export async function setUserBlocked(actor: { id: string; role: Role }, targetId: string, blocked: boolean, reason?: string) {
  const target = await loadTarget(targetId);
  if (target.id === actor.id || !outranks(actor.role, target.role)) {
    await audit({ actorId: actor.id, action: blocked ? "user.block" : "user.unblock", entityType: "user", entityId: targetId, result: "denied" });
    throw new ServiceError("forbidden");
  }
  const db = await getDb();
  await db
    .update(users)
    .set({ status: blocked ? "blocked" : "active", blockedReason: blocked ? reason?.slice(0, 500) || null : null, updatedAt: new Date() })
    .where(eq(users.id, targetId));
  if (blocked) await invalidateUserSessions(db, targetId);
  await audit({ actorId: actor.id, action: blocked ? "user.block" : "user.unblock", entityType: "user", entityId: targetId, meta: reason ? { reason } : undefined });
}

export async function setUserRole(actor: { id: string; role: Role }, targetId: string, role: Role) {
  const target = await loadTarget(targetId);
  const allowed = assignableRoles(actor.role);
  if (target.id === actor.id || !allowed.includes(role) || !allowed.includes(target.role) || !outranks(actor.role, target.role)) {
    await audit({ actorId: actor.id, action: "user.set_role", entityType: "user", entityId: targetId, result: "denied", meta: { role } });
    throw new ServiceError("forbidden");
  }
  const db = await getDb();
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, targetId));
  await invalidateUserSessions(db, targetId);
  await audit({ actorId: actor.id, action: "user.set_role", entityType: "user", entityId: targetId, meta: { from: target.role, to: role } });
}

/** Creates the Super Admin only if that username does not exist yet (safe to run on every deploy). */
export async function ensureSuperAdmin(username: string, password: string) {
  const db = await getDb();
  const [existing] = await db
    .select({ id: users.id, passwordHash: users.passwordHash, role: users.role, status: users.status })
    .from(users)
    .where(sql`lower(${users.username}) = ${usernameSchema.parse(username).toLowerCase()}`)
    .limit(1);
  // Keep the account in sync with the configured credentials without logging the admin out
  // on every deploy: only rewrite it when the password, role or status actually drifted.
  const inSync =
    existing && existing.role === "super_admin" && existing.status === "active" && existing.passwordHash && (await verifyPassword(password, existing.passwordHash));
  if (inSync) return { id: existing.id, created: false, updated: false };
  return { ...(await upsertSuperAdmin(username, password)), updated: !!existing };
}

/** Used only by the documented CLI bootstrap (scripts/create-admin.ts). */
export async function upsertSuperAdmin(username: string, password: string, email?: string) {
  const name = usernameSchema.parse(username);
  const pw = passwordSchema.parse(password);
  const db = await getDb();
  const passwordHash = await hashPassword(pw);
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.username}) = ${name.toLowerCase()}`)
    .limit(1);
  if (existing) {
    await db
      .update(users)
      .set({ passwordHash, role: "super_admin", status: "active", updatedAt: new Date() })
      .where(eq(users.id, existing.id));
    await invalidateUserSessions(db, existing.id);
    await audit({ actorId: null, action: "bootstrap.super_admin_updated", entityType: "user", entityId: existing.id });
    return { id: existing.id, created: false };
  }
  const [u] = await db
    .insert(users)
    .values({ username: name, email: email?.toLowerCase() || null, displayName: name, passwordHash, role: "super_admin" })
    .returning({ id: users.id });
  await audit({ actorId: null, action: "bootstrap.super_admin_created", entityType: "user", entityId: u!.id });
  return { id: u!.id, created: true };
}

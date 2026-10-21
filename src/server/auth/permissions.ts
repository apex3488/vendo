/**
 * Role-based permissions. Least privilege: each role gets only what it needs.
 * The role is always read from the database on the server, never from the client.
 */
export type Role = "super_admin" | "admin" | "moderator" | "support" | "seller" | "user";

export const PERMISSIONS = [
  "admin.access",
  "users.view",
  "users.block",
  "users.assign_staff_role", // moderator / support
  "users.assign_admin_role", // admin / super_admin
  "listings.view_all",
  "listings.moderate",
  "reports.view",
  "reports.handle",
  "categories.manage",
  "stores.manage",
  "stores.verify",
  "monetization.manage",
  "ads.manage",
  "content.manage",
  "settings.manage",
  "audit.view",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  super_admin: PERMISSIONS,
  admin: [
    "admin.access",
    "users.view",
    "users.block",
    "users.assign_staff_role",
    "listings.view_all",
    "listings.moderate",
    "reports.view",
    "reports.handle",
    "categories.manage",
    "stores.manage",
    "stores.verify",
    "monetization.manage",
    "ads.manage",
    "content.manage",
    "audit.view",
  ],
  moderator: ["admin.access", "users.view", "listings.view_all", "listings.moderate", "reports.view", "reports.handle"],
  support: ["admin.access", "users.view", "listings.view_all", "reports.view"],
  seller: [],
  user: [],
};

export const STAFF_ROLES: readonly Role[] = ["super_admin", "admin", "moderator", "support"];

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function isStaff(role: Role | null | undefined): boolean {
  return !!role && STAFF_ROLES.includes(role);
}

/** Which roles an actor may grant to (or remove from) another user. */
export function assignableRoles(actorRole: Role): Role[] {
  if (can(actorRole, "users.assign_admin_role")) return ["super_admin", "admin", "moderator", "support", "seller", "user"];
  if (can(actorRole, "users.assign_staff_role")) return ["moderator", "support", "seller", "user"];
  return [];
}

/** Rank used to prevent acting on users with equal or higher privileges. */
const RANK: Record<Role, number> = { super_admin: 100, admin: 80, moderator: 50, support: 40, seller: 10, user: 0 };
export function outranks(actor: Role, target: Role) {
  return actor === "super_admin" || RANK[actor] > RANK[target];
}

export class AuthError extends Error {
  constructor(
    public code: "UNAUTHENTICATED" | "FORBIDDEN" | "BLOCKED",
    message?: string,
  ) {
    super(message ?? code);
    this.name = "AuthError";
  }
}

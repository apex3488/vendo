"use server";

import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { siteUrl } from "@/lib/site";
import { clientIpHash, toActionError } from "@/server/action-utils";
import { endSession, startSession } from "@/server/auth/current";
import { isStaff } from "@/server/auth/permissions";
import { ServiceError, type ActionResult } from "@/server/errors";
import { mailConfigured, sendMail } from "@/server/mail";
import { enforce } from "@/server/services/rate-limit";
import { authenticate, createPasswordReset, registerUser, resetPassword } from "@/server/services/users";

/** Only allow same-site relative redirects after login (prevents open redirects). */
function safeNext(next: unknown) {
  const v = typeof next === "string" ? next : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : "/account";
}

export async function loginAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const login = String(form.get("login") ?? "").slice(0, 254);
  const password = String(form.get("password") ?? "").slice(0, 200);
  let user: { id: string };
  try {
    const ip = await clientIpHash();
    await enforce(`login:ip:${ip}`, 20, 15 * 60);
    await enforce(`login:acct:${login.toLowerCase()}`, 10, 15 * 60);
    user = await authenticate(login, password);
    await startSession(user.id);
  } catch (e) {
    return toActionError(e);
  }
  redirect(safeNext(form.get("next")));
}

/** Only same-site admin paths are allowed after the staff sign-in. */
function safeAdminNext(next: unknown) {
  const v = typeof next === "string" ? next : "";
  return v.startsWith("/admin") && !v.startsWith("/admin/login") ? v : "/admin";
}

/**
 * Staff sign-in (the lock button / /admin/login). Regular users get the same "wrong login or
 * password" answer and no session, so the form does not reveal who is staff.
 */
export async function adminLoginAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const login = String(form.get("login") ?? "").slice(0, 254);
  const password = String(form.get("password") ?? "").slice(0, 200);
  try {
    const ip = await clientIpHash();
    await enforce(`admin-login:ip:${ip}`, 10, 15 * 60);
    await enforce(`login:acct:${login.toLowerCase()}`, 10, 15 * 60);
    const user = await authenticate(login, password);
    if (!isStaff(user.role)) throw new ServiceError("invalid_credentials");
    await startSession(user.id);
  } catch (e) {
    return toActionError(e);
  }
  redirect(safeAdminNext(form.get("next")));
}

export async function registerAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  // Honeypot: real users never fill this hidden field.
  if (String(form.get("website") ?? "")) return { ok: false, error: (await getI18n()).t.errors.generic };
  try {
    const ip = await clientIpHash();
    await enforce(`register:ip:${ip}`, 5, 60 * 60);
    const user = await registerUser({
      displayName: String(form.get("displayName") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    await startSession(user.id);
  } catch (e) {
    return toActionError(e);
  }
  redirect(safeNext(form.get("next")));
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}

export async function forgotPasswordAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { t } = await getI18n();
  const email = String(form.get("email") ?? "").trim().slice(0, 254);
  try {
    const ip = await clientIpHash();
    await enforce(`forgot:ip:${ip}`, 5, 60 * 60);
    if (!email.includes("@")) throw new ServiceError("invalid_input", "email");
    const res = await createPasswordReset(email);
    if (res) {
      const link = `${siteUrl()}/reset-password?token=${encodeURIComponent(res.token)}`;
      await sendMail({
        to: email,
        subject: "VENDO — восстановление пароля / Parolni tiklash",
        text: `Чтобы задать новый пароль, откройте ссылку (действует 1 час):\n${link}\n\nYangi parol oʻrnatish uchun havolani oching (1 soat amal qiladi):\n${link}\n\nЕсли вы не запрашивали восстановление, просто проигнорируйте это письмо.`,
      });
    }
  } catch (e) {
    return toActionError(e);
  }
  const devConsole = process.env.NODE_ENV !== "production" && !mailConfigured();
  return { ok: true, message: mailConfigured() || devConsole ? t.auth.forgotSent : t.auth.forgotNoMail };
}

export async function resetPasswordAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { t } = await getI18n();
  try {
    const ip = await clientIpHash();
    await enforce(`reset:ip:${ip}`, 10, 60 * 60);
    await resetPassword(String(form.get("token") ?? ""), String(form.get("password") ?? ""));
  } catch (e) {
    return toActionError(e);
  }
  return { ok: true, message: t.auth.resetDone };
}

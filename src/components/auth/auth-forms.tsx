"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction } from "@/app/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import type { ActionResult } from "@/server/errors";
import { Button } from "../ui/button";
import { Field, Input } from "../ui/field";
import { Alert } from "../ui/misc";

export function LoginForm({ next }: { next?: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(loginAction, null);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label={t.auth.login}>
        {(p) => <Input {...p} name="login" autoComplete="username" required maxLength={254} autoFocus />}
      </Field>
      <Field label={t.auth.password}>
        {(p) => <Input {...p} name="password" type="password" autoComplete="current-password" required maxLength={200} />}
      </Field>
      {state && !state.ok && <Alert tone="danger">{state.error}</Alert>}
      <Button type="submit" loading={pending} size="lg" className="w-full">
        {t.auth.submitLogin}
      </Button>
      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="font-medium text-muted hover:text-ink">
          {t.auth.forgot}
        </Link>
        <span className="text-muted">
          {t.auth.noAccount}{" "}
          <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-ink hover:underline">
            {t.nav.register}
          </Link>
        </span>
      </div>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(registerAction, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  const [before, after] = t.auth.agree.split("{terms}");
  const [mid, end] = (after ?? "").split("{privacy}");
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      {/* Honeypot for bots */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Field label={t.auth.name} error={fe?.displayName}>
        {(p) => <Input {...p} name="displayName" autoComplete="name" required minLength={2} maxLength={80} autoFocus />}
      </Field>
      <Field label={t.auth.email} error={fe?.email}>
        {(p) => <Input {...p} name="email" type="email" autoComplete="email" required maxLength={254} />}
      </Field>
      <Field label={t.auth.password} hint={t.auth.passwordHint} error={fe?.password}>
        {(p) => <Input {...p} name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />}
      </Field>
      {state && !state.ok && !fe && <Alert tone="danger">{state.error}</Alert>}
      <Button type="submit" loading={pending} size="lg" className="w-full">
        {t.auth.submitRegister}
      </Button>
      <p className="text-center text-xs leading-relaxed text-muted">
        {before}
        <Link href="/p/terms" className="underline">
          {t.auth.terms}
        </Link>
        {mid}
        <Link href="/p/privacy" className="underline">
          {t.auth.privacy}
        </Link>
        {end}
      </p>
      <p className="text-center text-sm text-muted">
        {t.auth.haveAccount}{" "}
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-ink hover:underline">
          {t.nav.login}
        </Link>
      </p>
    </form>
  );
}

export function ForgotForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(forgotPasswordAction, null);
  if (state?.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label={t.auth.email} error={state && !state.ok ? state.fieldErrors?.email : undefined}>
        {(p) => <Input {...p} name="email" type="email" autoComplete="email" required autoFocus />}
      </Field>
      {state && !state.ok && <Alert tone="danger">{state.error}</Alert>}
      <Button type="submit" loading={pending} size="lg" className="w-full">
        {t.auth.forgotSubmit}
      </Button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(resetPasswordAction, null);
  if (state?.ok)
    return (
      <div className="space-y-4">
        <Alert tone="success">{state.message}</Alert>
        <Link href="/login" className="block text-center font-semibold underline">
          {t.nav.login}
        </Link>
      </div>
    );
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <Field label={t.auth.password} hint={t.auth.passwordHint} error={state && !state.ok ? state.fieldErrors?.[""] : undefined}>
        {(p) => <Input {...p} name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} autoFocus />}
      </Field>
      {state && !state.ok && <Alert tone="danger">{state.error}</Alert>}
      <Button type="submit" loading={pending} size="lg" className="w-full">
        {t.auth.resetSubmit}
      </Button>
    </form>
  );
}

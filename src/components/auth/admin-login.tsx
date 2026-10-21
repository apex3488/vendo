"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { adminLoginAction } from "@/app/actions/auth";
import type { ActionResult } from "@/server/errors";
import { Button } from "../ui/button";
import { Field, Input } from "../ui/field";
import { Alert } from "../ui/misc";
import { Modal } from "../ui/modal";

/** Staff-only sign-in form: used on /admin/login and inside the footer lock dialog. */
export function AdminLoginForm({ next, autoFocus = true }: { next?: string; autoFocus?: boolean }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(adminLoginAction, null);
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Логин">
        {(p) => <Input {...p} name="login" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254} autoFocus={autoFocus} />}
      </Field>
      <Field label="Пароль">
        {(p) => (
          <div className="relative">
            <Input {...p} name="password" type={show ? "text" : "password"} autoComplete="current-password" required maxLength={200} className="pr-12" />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Скрыть пароль" : "Показать пароль"}
              className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted hover:text-ink"
            >
              {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
        )}
      </Field>
      {state && !state.ok && <Alert tone="danger">{state.error}</Alert>}
      <Button type="submit" loading={pending} size="lg" className="w-full">
        <ShieldCheck className="h-[18px] w-[18px]" />
        Войти в админ-панель
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <Lock className="h-3.5 w-3.5" />
        Только для администраторов и модераторов VENDO
      </p>
    </form>
  );
}

/** Small lock button in the footer corner that opens the staff sign-in dialog. */
export function AdminLockButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Вход для администраторов"
        title="Вход для администраторов"
        className="grid h-9 w-9 place-items-center rounded-full border border-line text-subtle transition-colors hover:border-ink/30 hover:bg-soft hover:text-ink"
      >
        <Lock className="h-4 w-4" />
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        closeLabel="Закрыть"
        className="max-w-[420px]"
        title={
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-lime">
              <Lock className="h-[18px] w-[18px]" />
            </span>
            <span>
              Вход для администраторов
              <span className="block text-sm font-medium text-muted">Доступ только для сотрудников</span>
            </span>
          </span>
        }
      >
        <AdminLoginForm next="/admin" />
      </Modal>
    </>
  );
}

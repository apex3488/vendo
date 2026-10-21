"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/server/errors";
import { cn } from "@/lib/cn";
import { Button } from "../ui/button";
import { Textarea } from "../ui/field";
import { Modal } from "../ui/modal";
import { Alert } from "../ui/misc";
import { useToast } from "../ui/toast";

/** A form bound to a server action; shows the result and refreshes server data on success. */
export function AdminForm({
  action,
  children,
  className,
  submitLabel = "Сохранить",
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult<unknown>>;
  children: React.ReactNode;
  className?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult<unknown> | null, FormData>(async (prev, f) => {
    const res = await action(prev as ActionResult | null, f);
    if (res.ok) router.refresh();
    return res;
  }, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className={cn("space-y-4", className)}>
      {children}
      {state && (state.ok ? <Alert tone="success">{state.message}</Alert> : <Alert tone="danger" title={state.error}>{fe && Object.entries(fe).map(([k, v]) => <div key={k}>{k}: {v}</div>)}</Alert>)}
      <Button type="submit" loading={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}

/** Button that runs a server action, optionally asking for confirmation or a reason first. */
export function ActionButton({
  run,
  children,
  variant = "secondary",
  confirm,
  prompt,
  promptRequired,
  presets,
  size = "sm",
  className,
  redirectTo,
}: {
  run: (input: string) => Promise<ActionResult<unknown>>;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "accent";
  confirm?: string;
  prompt?: string;
  promptRequired?: boolean;
  /** Quick-pick answers shown above the reason field. */
  presets?: string[];
  size?: "sm" | "md";
  className?: string;
  /** Where to go after success (e.g. the next item in the moderation queue). */
  redirectTo?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [ask, setAsk] = useState<null | "confirm" | "prompt">(null);
  const [reason, setReason] = useState("");
  const exec = (input: string) =>
    start(async () => {
      const res = await run(input);
      if (res.ok) {
        setAsk(null);
        toast(res.message ?? "Готово");
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      } else toast(res.error, "error");
    });
  return (
    <>
      <Button
        variant={variant}
        size={size}
        loading={pending && !ask}
        className={className}
        onClick={() => {
          if (prompt) {
            setReason("");
            setAsk("prompt");
          } else if (confirm) setAsk("confirm");
          else exec("");
        }}
      >
        {children}
      </Button>
      <Modal open={ask !== null} onClose={() => !pending && setAsk(null)} title={ask === "prompt" ? prompt : confirm} closeLabel="Закрыть" className="max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (ask === "prompt" && promptRequired && !reason.trim()) return;
            exec(ask === "prompt" ? reason.trim() : "");
          }}
          className="space-y-4"
        >
          {ask === "prompt" && (
            <>
              {presets?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setReason(p)}
                      className={cn("rounded-full px-3 py-1.5 text-sm font-semibold ring-1", reason === p ? "bg-ink text-white ring-ink" : "bg-surface ring-line hover:bg-soft")}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              ) : null}
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Опишите причину…" maxLength={500} className="min-h-[96px]" autoFocus />
            </>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setAsk(null)} disabled={pending}>
              Отмена
            </Button>
            <Button type="submit" variant={variant === "danger" ? "danger" : "primary"} loading={pending} disabled={ask === "prompt" && promptRequired && !reason.trim()}>
              {children}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

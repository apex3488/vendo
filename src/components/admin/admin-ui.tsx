"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/server/errors";
import { cn } from "@/lib/cn";
import { Button } from "../ui/button";
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
  size = "sm",
  className,
}: {
  run: (input: string) => Promise<ActionResult<unknown>>;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "accent";
  confirm?: string;
  prompt?: string;
  promptRequired?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      variant={variant}
      size={size}
      loading={pending}
      className={className}
      onClick={() => {
        let input = "";
        if (prompt) {
          const v = window.prompt(prompt);
          if (v === null) return;
          if (promptRequired && !v.trim()) return;
          input = v;
        } else if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          const res = await run(input);
          if (res.ok) {
            toast(res.message ?? "Готово");
            router.refresh();
          } else toast(res.error, "error");
        });
      }}
    >
      {children}
    </Button>
  );
}

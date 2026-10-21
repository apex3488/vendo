"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-[12px] border border-line-strong bg-surface px-3.5 text-[15px] text-ink placeholder:text-subtle transition-colors hover:border-ink/30 focus:border-ink focus:outline-none focus-visible:outline-none disabled:bg-soft disabled:text-muted aria-[invalid=true]:border-danger";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(control, "h-11", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cn(control, "min-h-[120px] py-3 leading-relaxed", className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(control, "h-11 appearance-none pr-10", className)} {...rest}>
        {children}
      </select>
      <svg
        aria-hidden
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
});

export function Checkbox({ label, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 text-[15px] leading-snug text-ink-2", className)}>
      <input type="checkbox" className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer rounded-[5px] accent-ink" {...rest} />
      <span>{label}</span>
    </label>
  );
}

type ControlProps = { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string };

/** Label + control + hint/error with proper aria wiring. */
export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  children: (props: ControlProps) => React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const descId = `${id}-desc`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": error || hint ? descId : undefined })}
      {error ? (
        <p id={descId} className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={descId} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

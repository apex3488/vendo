import { cn } from "@/lib/cn";
import type { I18nText } from "@/server/db/schema";

/** Plain server-rendered inputs for admin forms (no client JS needed). */
const input = "h-10 w-full rounded-[10px] border border-line-strong bg-surface px-3 text-sm outline-none focus:border-ink";

export function AField({ label, children, className, hint }: { label: string; children: React.ReactNode; className?: string; hint?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-subtle">{hint}</span>}
    </label>
  );
}

export function AInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(input, props.className)} />;
}

export function ATextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(input, "h-auto py-2 leading-relaxed", props.className)} />;
}

export function ASelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(input, props.className)} />;
}

export function ACheck({ name, label, defaultChecked, value }: { name: string; label: string; defaultChecked?: boolean; value?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" name={name} value={value ?? "on"} defaultChecked={defaultChecked} className="h-4 w-4 accent-ink" />
      {label}
    </label>
  );
}

/** Three inputs for a translatable value: name_ru, name_uz, name_en. */
export function I18nInputs({ name, label, value, required, textarea, rows }: { name: string; label: string; value?: I18nText | null; required?: boolean; textarea?: boolean; rows?: number }) {
  return (
    <div className={cn("grid gap-3", textarea ? "" : "md:grid-cols-3")}>
      {(["ru", "uz", "en"] as const).map((l) => (
        <AField key={l} label={`${label} (${l.toUpperCase()})`}>
          {textarea ? (
            <ATextarea name={`${name}_${l}`} defaultValue={value?.[l] ?? ""} rows={rows ?? 6} required={required && l === "ru"} />
          ) : (
            <AInput name={`${name}_${l}`} defaultValue={value?.[l] ?? ""} required={required && l === "ru"} />
          )}
        </AField>
      ))}
    </div>
  );
}

export function APanel({ title, children, actions, className }: { title?: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[var(--radius-lg)] border border-line bg-surface", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
          {title && <h2 className="text-[15px] font-bold">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function ATable({ head, children }: { head: React.ReactNode[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-surface">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-4 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

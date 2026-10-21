import { cn } from "@/lib/cn";

export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[var(--radius-lg)] border border-line bg-surface", className)} {...rest} />;
}

type Tone = "neutral" | "lime" | "success" | "warn" | "danger" | "info" | "ink";
const tones: Record<Tone, string> = {
  neutral: "bg-soft text-ink-2",
  lime: "bg-lime-soft text-lime-ink",
  success: "bg-success-soft text-success",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  ink: "bg-ink text-white",
};

export function Badge({ tone = "neutral", className, ...rest }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}
      {...rest}
    />
  );
}

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Exclude<Tone, "ink">;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("rounded-[var(--radius-md)] px-4 py-3 text-sm leading-relaxed", tones[tone], className)}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn(title && "mt-0.5 opacity-90")}>{children}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  text?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-surface px-6 py-14 text-center",
        className,
      )}
    >
      {icon && <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-soft text-muted">{icon}</div>}
      <p className="t-3">{title}</p>
      {text && <p className="mt-1.5 max-w-md text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

export function SectionHeader({ title, action, subtitle }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 md:mb-5">
      <div>
        <h2 className="t-2">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink-2",
  accent: "bg-lime text-ink hover:bg-lime-strong",
  secondary: "bg-surface text-ink border border-line-strong hover:border-ink/40 hover:bg-canvas",
  ghost: "text-ink hover:bg-soft",
  danger: "bg-danger text-white hover:bg-danger/90",
  link: "text-ink underline-offset-4 hover:underline px-0 h-auto",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm rounded-[10px]",
  md: "h-11 px-5 text-[15px] rounded-[12px]",
  lg: "h-13 px-6 text-base rounded-[14px]",
  icon: "h-10 w-10 rounded-[12px]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], variant !== "link" && sizes[size], className);
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, loading, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />}
      {children}
    </button>
  );
});

type LinkButtonProps = React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function LinkButton({ variant = "primary", size = "md", className, ...rest }: LinkButtonProps) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

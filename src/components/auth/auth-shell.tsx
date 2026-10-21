export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="container-x flex justify-center py-10 md:py-16">
      <div className="w-full max-w-[420px] rounded-[var(--radius-xl)] border border-line bg-surface p-6 md:p-8">
        <h1 className="t-1">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

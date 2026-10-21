import { Logo } from "@/components/logo";
import { LinkButton } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="flex min-h-[70vh] flex-1 flex-col items-center justify-center px-4 text-center">
      <Logo />
      <p className="mt-10 text-7xl font-extrabold tracking-tighter text-line-strong">404</p>
      <h1 className="t-1 mt-4">{t.errors.notFoundTitle}</h1>
      <p className="mt-2 max-w-md text-muted">{t.errors.notFoundText}</p>
      <div className="mt-8 flex gap-3">
        <LinkButton href="/">{t.errors.toHome}</LinkButton>
        <LinkButton href="/search" variant="secondary">
          {t.nav.search}
        </LinkButton>
      </div>
    </div>
  );
}

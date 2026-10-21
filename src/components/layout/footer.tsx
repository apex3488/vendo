import Link from "next/link";
import { fmt, tr } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { getRootCategories } from "@/server/services/categories";
import { getSettings } from "@/server/services/settings";
import { telegramUrl } from "@/lib/contacts";
import { Logo } from "../logo";

export async function Footer() {
  const [{ locale, t }, roots, settings] = await Promise.all([getI18n(), getRootCategories(), getSettings()]);
  const col = "flex flex-col gap-2.5 text-[15px]";
  const link = "text-ink-2 hover:text-ink";
  return (
    <footer className="mt-16 border-t border-line bg-surface pb-24 md:pb-0">
      <div className="container-x grid gap-10 py-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo />
          <p className="mt-3 text-sm font-semibold text-ink-2">{t.meta.tagline}</p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">{t.footer.disclaimer}</p>
        </div>
        <nav className="md:col-span-3" aria-label={t.footer.categories}>
          <p className="mb-3 text-sm font-bold">{t.footer.categories}</p>
          <ul className={col}>
            {roots.slice(0, 8).map((c) => (
              <li key={c.id}>
                <Link className={link} href={`/c/${c.slug}`}>
                  {tr(c.name, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav className="md:col-span-2" aria-label={t.footer.forSellers}>
          <p className="mb-3 text-sm font-bold">{t.footer.forSellers}</p>
          <ul className={col}>
            <li><Link className={link} href="/post">{t.nav.post}</Link></li>
            <li><Link className={link} href="/plans">{t.footer.plans}</Link></li>
            <li><Link className={link} href="/account/promotions">{t.footer.promotion}</Link></li>
            <li><Link className={link} href="/p/rules">{t.footer.rules}</Link></li>
          </ul>
        </nav>
        <nav className="md:col-span-3" aria-label={t.footer.help}>
          <p className="mb-3 text-sm font-bold">{t.footer.help}</p>
          <ul className={col}>
            <li><Link className={link} href="/p/about">{t.footer.about}</Link></li>
            <li><Link className={link} href="/p/help">{t.footer.help}</Link></li>
            <li><Link className={link} href="/p/safety">{t.footer.safety}</Link></li>
            <li><Link className={link} href="/p/terms">{t.footer.terms}</Link></li>
            <li><Link className={link} href="/p/privacy">{t.footer.privacy}</Link></li>
            {settings.supportEmail && (
              <li><a className={link} href={`mailto:${settings.supportEmail}`}>{settings.supportEmail}</a></li>
            )}
            {settings.supportTelegram && (
              <li><a className={link} href={telegramUrl(settings.supportTelegram)} target="_blank" rel="noopener noreferrer">@{settings.supportTelegram}</a></li>
            )}
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex h-14 items-center justify-between text-sm text-muted">
          <span>{fmt(t.footer.rights, { year: new Date().getFullYear() })}</span>
          <span className="hidden sm:inline">Find it. Sell it. Live it.</span>
        </div>
      </div>
    </footer>
  );
}

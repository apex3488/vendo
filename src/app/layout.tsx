import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { HTML_LANG } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n } from "@/lib/i18n/server";
import { ToastProvider } from "@/components/ui/toast";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `VENDO — ${t.meta.tagline}`, template: "%s — VENDO" },
    description: t.meta.description,
    applicationName: "VENDO",
    openGraph: { siteName: "VENDO", type: "website", title: "VENDO", description: t.meta.description },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#f5f6f3",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale, t } = await getI18n();
  return (
    <html lang={HTML_LANG[locale]} className={`${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <I18nProvider locale={locale} t={t}>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

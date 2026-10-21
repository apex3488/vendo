import type { Metadata } from "next";
import { ResetForm } from "@/components/auth/auth-forms";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert } from "@/components/ui/misc";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "New password", robots: { index: false }, referrer: "no-referrer" };

export default async function ResetPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  const { t } = await getI18n();
  return (
    <AuthShell title={t.auth.resetTitle}>
      {typeof token === "string" && token.length > 20 ? <ResetForm token={token} /> : <Alert tone="danger">{t.errors.token_invalid}</Alert>}
    </AuthShell>
  );
}

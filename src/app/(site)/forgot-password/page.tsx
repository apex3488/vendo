import type { Metadata } from "next";
import { ForgotForm } from "@/components/auth/auth-forms";
import { AuthShell } from "@/components/auth/auth-shell";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Recovery", robots: { index: false } };

export default async function ForgotPage() {
  const { t } = await getI18n();
  return (
    <AuthShell title={t.auth.forgotTitle} subtitle={t.auth.forgotText}>
      <ForgotForm />
    </AuthShell>
  );
}

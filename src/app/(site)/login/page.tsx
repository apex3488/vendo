import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/auth-forms";
import { AuthShell } from "@/components/auth/auth-shell";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/server/auth/current";

export const metadata: Metadata = { title: "Login", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? next : undefined;
  if (await getCurrentUser()) redirect(nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/account");
  const { t } = await getI18n();
  return (
    <AuthShell title={t.auth.loginTitle} subtitle={t.auth.loginSubtitle}>
      <LoginForm next={nextPath} />
    </AuthShell>
  );
}

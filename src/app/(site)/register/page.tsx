import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/auth-forms";
import { AuthShell } from "@/components/auth/auth-shell";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/server/auth/current";

export const metadata: Metadata = { title: "Sign up", robots: { index: false } };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  if (await getCurrentUser()) redirect("/account");
  const { next } = await searchParams;
  const { t } = await getI18n();
  return (
    <AuthShell title={t.auth.registerTitle} subtitle={t.auth.registerSubtitle}>
      <RegisterForm next={typeof next === "string" ? next : undefined} />
    </AuthShell>
  );
}

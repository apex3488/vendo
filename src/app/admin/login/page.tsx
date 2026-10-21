import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { AdminLoginForm } from "@/components/auth/admin-login";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/server/auth/current";
import { isStaff } from "@/server/auth/permissions";

export const metadata: Metadata = { title: "Вход для администраторов", robots: { index: false, follow: false } };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/admin") ? next : "/admin";
  const user = await getCurrentUser();
  if (user && isStaff(user.role)) redirect(nextPath);
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-ink text-white">
      <div aria-hidden className="pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-lime/20 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-48 -right-32 h-[420px] w-[420px] rounded-full bg-lime/10 blur-[120px]" />
      <header className="relative flex h-16 items-center justify-between px-5 md:px-8">
        <span className="flex items-center gap-2 [&_a]:text-white">
          <Logo href="/" className="text-[22px]" />
          <span className="rounded-md bg-lime px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">admin</span>
        </span>
        <Link href="/" className="flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          На сайт
        </Link>
      </header>
      <main className="relative flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[420px] animate-rise">
          <div className="mb-6 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lime text-ink shadow-[0_0_40px_-6px] shadow-lime/60">
              <Lock className="h-6 w-6" strokeWidth={2.2} />
            </span>
            <h1 className="mt-5 text-[28px] font-extrabold tracking-tight">Админ-панель</h1>
            <p className="mt-1.5 text-[15px] text-white/60">Вход только для администраторов</p>
          </div>
          <div className="rounded-[var(--radius-xl)] bg-surface p-6 text-ink shadow-[var(--shadow-pop)] md:p-8">
            {user && !isStaff(user.role) && (
              <p className="mb-4 rounded-[12px] bg-warn-soft px-3.5 py-2.5 text-sm text-warn">
                Вы вошли как обычный пользователь. Войдите под учётной записью администратора.
              </p>
            )}
            <AdminLoginForm next={nextPath} />
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelPromotionAction,
  changePasswordAction,
  requestPromotionAction,
  requestSubscriptionAction,
  saveStoreAction,
  updateProfileAction,
} from "@/app/actions/account";
import { LOCALE_LABELS, LOCALES } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import type { ActionResult } from "@/server/errors";
import { Button } from "../ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "../ui/field";
import { Alert } from "../ui/misc";
import { useToast } from "../ui/toast";

type Region = { id: number; name: string; cities: { id: number; name: string }[] };

function CitySelect({ regions, defaultValue, ...p }: { regions: Region[]; defaultValue: number | null } & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "defaultValue">) {
  const { t } = useI18n();
  return (
    <Select {...p} name="cityId" defaultValue={defaultValue ?? ""}>
      <option value="">{t.post.choose}</option>
      {regions.map((r) => (
        <optgroup key={r.id} label={r.name}>
          {r.cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}

function Result({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  return state.ok ? <Alert tone="success">{state.message}</Alert> : <Alert tone="danger">{state.error}</Alert>;
}

export function ProfileForm({
  profile,
  regions,
}: {
  profile: { displayName: string; email: string | null; username: string | null; phone: string | null; telegram: string | null; showPhone: boolean; cityId: number | null; locale: string };
  regions: Region[];
}) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updateProfileAction, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.account.displayName} error={fe?.displayName} required>
          {(p) => <Input {...p} name="displayName" defaultValue={profile.displayName} maxLength={80} required />}
        </Field>
        <Field label={profile.email ? t.auth.email : t.auth.login}>
          {(p) => <Input {...p} value={profile.email ?? profile.username ?? ""} disabled readOnly />}
        </Field>
        <Field label={t.account.phone} error={fe?.phone} hint={t.post.phoneHint}>
          {(p) => <Input {...p} name="phone" type="tel" defaultValue={profile.phone ?? ""} maxLength={30} />}
        </Field>
        <Field label={t.account.telegram} error={fe?.telegram} hint="@username">
          {(p) => <Input {...p} name="telegram" defaultValue={profile.telegram ? `@${profile.telegram}` : ""} maxLength={60} />}
        </Field>
        <Field label={t.account.city}>{(p) => <CitySelect {...p} regions={regions} defaultValue={profile.cityId} />}</Field>
        <Field label={t.account.language}>
          {(p) => (
            <Select {...p} name="locale" defaultValue={profile.locale}>
              {LOCALES.map((l) => (
                <option key={l} value={l}>
                  {LOCALE_LABELS[l]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <Checkbox name="showPhone" label={t.account.showPhone} defaultChecked={profile.showPhone} />
      <Result state={state} />
      <Button type="submit" loading={pending}>
        {t.account.save}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(changePasswordAction, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.account.currentPassword} error={fe?.currentPassword}>
          {(p) => <Input {...p} name="currentPassword" type="password" autoComplete="current-password" required />}
        </Field>
        <Field label={t.account.newPassword} hint={t.auth.passwordHint} error={fe?.[""]}>
          {(p) => <Input {...p} name="newPassword" type="password" autoComplete="new-password" minLength={8} required />}
        </Field>
      </div>
      <Result state={state} />
      <Button type="submit" variant="secondary" loading={pending}>
        {t.account.changePassword}
      </Button>
    </form>
  );
}

export function StoreForm({
  store,
  regions,
  logoUrl,
}: {
  store: { name: string; slug: string; description: string | null; phone: string | null; telegram: string | null; cityId: number | null } | null;
  regions: Region[];
  logoUrl: string | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(async (prev, form) => {
    const res = await saveStoreAction(prev, form);
    if (res.ok) router.refresh();
    return res;
  }, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  const [slug, setSlug] = useState(store?.slug ?? "");
  return (
    <form action={action} className="space-y-5">
      <div className="flex items-center gap-4">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-16 w-16 rounded-full object-cover ring-1 ring-line" />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-full bg-soft text-xl font-bold text-muted">{store?.name.charAt(0) ?? "?"}</span>
        )}
        <Field label={t.store.logo} hint="JPG / PNG / WEBP, ≤ 2 MB" className="flex-1">
          {(p) => <input {...p} name="logo" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm file:mr-3 file:rounded-[10px] file:border-0 file:bg-soft file:px-3 file:py-2 file:font-semibold" />}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.store.name} error={fe?.name} required>
          {(p) => <Input {...p} name="name" defaultValue={store?.name ?? ""} maxLength={80} required />}
        </Field>
        <Field label={t.store.slug} error={fe?.slug} hint={`/store/${slug || "…"}`}>
          {(p) => <Input {...p} name="slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} maxLength={60} />}
        </Field>
      </div>
      <Field label={t.store.description} error={fe?.description}>
        {(p) => <Textarea {...p} name="description" defaultValue={store?.description ?? ""} maxLength={3000} rows={5} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t.store.phone} error={fe?.phone}>
          {(p) => <Input {...p} name="phone" type="tel" defaultValue={store?.phone ?? ""} maxLength={30} />}
        </Field>
        <Field label={t.store.telegram} error={fe?.telegram}>
          {(p) => <Input {...p} name="telegram" defaultValue={store?.telegram ? `@${store.telegram}` : ""} maxLength={60} />}
        </Field>
        <Field label={t.store.city}>{(p) => <CitySelect {...p} regions={regions} defaultValue={store?.cityId ?? null} />}</Field>
      </div>
      <Result state={state} />
      <Button type="submit" loading={pending}>
        {store ? t.store.save : t.store.create}
      </Button>
    </form>
  );
}

export function RequestPlanButton({ planId, disabled }: { planId: number; disabled?: boolean }) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="primary"
      className="w-full"
      disabled={disabled}
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await requestSubscriptionAction(planId);
          if (res.ok) {
            toast(res.message ?? t.plans.requested);
            router.refresh();
          } else toast(res.error, "error");
        })
      }
    >
      {t.plans.request}
    </Button>
  );
}

export function PromotionRequestForm({
  listings,
  plans,
  defaultListing,
}: {
  listings: { id: number; title: string }[];
  plans: { id: number; label: string }[];
  defaultListing?: number;
}) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(requestPromotionAction, null);
  if (!listings.length) return <Alert tone="neutral">{t.promo.noActive}</Alert>;
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t.promo.listing}>
          {(p) => (
            <Select {...p} name="listingId" defaultValue={defaultListing ?? listings[0]!.id} required>
              {listings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t.promo.plan}>
          {(p) => (
            <Select {...p} name="planId" required>
              {plans.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <Result state={state} />
      <Button type="submit" loading={pending}>
        {t.promo.request}
      </Button>
    </form>
  );
}

export function CancelPromotionButton({ id }: { id: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      loading={pending}
      onClick={() =>
        start(async () => {
          await cancelPromotionAction(id);
          router.refresh();
        })
      }
    >
      {t.promo.cancel}
    </Button>
  );
}

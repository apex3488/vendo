"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronRight, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { getAttributesAction, removeImageAction, reorderImagesAction, saveListingAction, type AttributeDTO } from "@/app/actions/listings";
import { formatPhone, normalizePhone, normalizeTelegram } from "@/lib/contacts";
import { formatMoney } from "@/lib/format";
import { fmt } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import { conditionLabel, formatListingPrice, typeLabel } from "@/lib/listing-format";
import { cn } from "@/lib/cn";
import { Button, LinkButton } from "../ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "../ui/field";
import { Alert } from "../ui/misc";
import { useToast } from "../ui/toast";

export type WizardCategory = {
  id: number;
  parentId: number | null;
  name: string;
  allowedTypes: ("sale" | "rent" | "service")[];
  hasCondition: boolean;
  isLeaf: boolean;
};
type Region = { id: number; name: string; cities: { id: number; name: string }[] };
type Img = { id: number; url: string; thumb: string };
type AttrValue = string | string[] | boolean;

export type WizardInitial = {
  id: number | null;
  status: string | null;
  categoryId: number | null;
  type: "sale" | "rent" | "service";
  title: string;
  description: string;
  price: string;
  priceMax: string;
  currency: "UZS" | "USD";
  pricePeriod: "" | "hour" | "day" | "week" | "month";
  deposit: string;
  isNegotiable: boolean;
  condition: "" | "new" | "like_new" | "used" | "for_parts";
  cityId: number | null;
  phone: string;
  telegram: string;
  hidePhone: boolean;
  attributes: Record<string, AttrValue>;
  images: Img[];
};

const STEPS = ["category", "details", "photos", "attributes", "contacts", "preview"] as const;
type Step = (typeof STEPS)[number];

const FIELD_STEP: Record<string, Step> = {
  categoryId: "category",
  type: "category",
  title: "details",
  description: "details",
  price: "details",
  priceMax: "details",
  pricePeriod: "details",
  deposit: "details",
  condition: "details",
  cityId: "contacts",
  phone: "contacts",
  telegram: "contacts",
};

export function ListingWizard({
  categories,
  regions,
  limits,
  initial,
}: {
  categories: WizardCategory[];
  regions: Region[];
  limits: { maxImages: number; maxMb: number; used: number; limit: number; premoderation: boolean };
  initial: WizardInitial;
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [listingId, setListingId] = useState<number | null>(initial.id);
  const [step, setStep] = useState<Step>(initial.categoryId ? "details" : "category");
  const [attrs, setAttrs] = useState<AttributeDTO[] | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, startSaving] = useTransition();
  const [submitted, setSubmitted] = useState<{ id: number; status: string } | null>(null);
  const dirty = useRef(false);
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const category = form.categoryId ? byId.get(form.categoryId) : undefined;
  const chain = useMemo(() => {
    const out: WizardCategory[] = [];
    let c = category;
    while (c) {
      out.unshift(c);
      c = c.parentId != null ? byId.get(c.parentId) : undefined;
    }
    return out;
  }, [category, byId]);

  // Load category attributes
  useEffect(() => {
    if (!form.categoryId) return;
    let alive = true;
    getAttributesAction(form.categoryId).then((a) => alive && setAttrs(a));
    return () => {
      alive = false;
    };
  }, [form.categoryId]);

  const update = useCallback(<K extends keyof WizardInitial>(key: K, value: WizardInitial[K]) => {
    dirty.current = true;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const rest = { ...e };
      delete rest[key as string];
      return rest;
    });
  }, []);

  const toPayload = useCallback((f: WizardInitial) => {
    const num = (v: string) => (v.trim() === "" ? null : v);
    return {
      categoryId: f.categoryId,
      type: f.type,
      title: f.title,
      description: f.description,
      price: num(f.price) as unknown as number | null,
      priceMax: num(f.priceMax) as unknown as number | null,
      currency: f.currency,
      pricePeriod: f.pricePeriod || null,
      deposit: num(f.deposit) as unknown as number | null,
      isNegotiable: f.isNegotiable,
      condition: f.condition || null,
      cityId: f.cityId,
      phone: f.phone,
      telegram: f.telegram,
      hidePhone: f.hidePhone,
      attributes: f.attributes,
    };
  }, []);

  /** Saves a draft (creates the listing on first save). Returns the id. */
  const saveDraft = useCallback(
    async (silent = false): Promise<number | null> => {
      const res = await saveListingAction(listingId, toPayload(formRef.current), false);
      if (res.ok && res.data) {
        dirty.current = false;
        setSavedAt(new Date());
        if (!listingId) {
          setListingId(res.data.id);
          window.history.replaceState(null, "", `/post/${res.data.id}`);
        }
        if (!silent) toast(t.post.saved);
        return res.data.id;
      }
      if (!res.ok && !silent) {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
      }
      return null;
    },
    [listingId, toPayload, toast, t.post.saved],
  );

  // Autosave every few seconds while editing (only once a category is chosen).
  useEffect(() => {
    if (submitted || !form.categoryId) return;
    const timer = setInterval(() => {
      if (dirty.current) startSaving(async () => void (await saveDraft(true)));
    }, 6000);
    return () => clearInterval(timer);
  }, [form.categoryId, saveDraft, submitted]);

  // Client-side checks per step (the server repeats all of them).
  function validateStep(s: Step): Record<string, string> {
    const e: Record<string, string> = {};
    if (s === "category") {
      if (!category) e.categoryId = t.errors.required;
      else if (!category.isLeaf) e.categoryId = t.errors.not_leaf;
    }
    if (s === "details") {
      if (form.title.trim().length < 5) e.title = t.errors.too_short;
      if (form.description.trim().length < 20) e.description = t.errors.too_short;
      if (form.type !== "service" && !form.price.trim() && !form.isNegotiable) e.price = t.errors.required;
      if (form.price.trim() && !(Number(form.price.replace(/\s/g, "").replace(",", ".")) >= 0)) e.price = t.errors.invalid;
      if (form.type === "rent" && form.price.trim() && !form.pricePeriod) e.pricePeriod = t.errors.required;
      if (category?.hasCondition && form.type === "sale" && !form.condition) e.condition = t.errors.required;
    }
    if (s === "attributes" && attrs) {
      for (const a of attrs) {
        const v = form.attributes[a.key];
        const empty = v === undefined || v === "" || (Array.isArray(v) && !v.length);
        if (a.required && a.type !== "boolean" && empty) e[`attr.${a.key}`] = t.errors.required;
      }
    }
    if (s === "contacts") {
      if (!form.cityId) e.cityId = t.errors.required;
      if (form.phone && !normalizePhone(form.phone)) e.phone = t.errors.invalid_phone;
      if (form.telegram && !normalizeTelegram(form.telegram)) e.telegram = t.errors.invalid_telegram;
      if (!form.phone && !form.telegram) e.phone = t.errors.contact_required_field;
    }
    return e;
  }

  async function goNext() {
    const e = validateStep(step);
    setErrors(e);
    setFormError(null);
    if (Object.keys(e).length) return;
    const idx = STEPS.indexOf(step);
    const next = STEPS[idx + 1]!;
    if (next === "photos" && !listingId) {
      const id = await saveDraft(true);
      if (!id) return;
    } else if (dirty.current) startSaving(async () => void (await saveDraft(true)));
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]!);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submit() {
    startSaving(async () => {
      setFormError(null);
      const res = await saveListingAction(listingId, toPayload(formRef.current), true);
      if (res.ok && res.data) {
        dirty.current = false;
        setSubmitted(res.data);
        window.scrollTo({ top: 0 });
        return;
      }
      if (!res.ok) {
        const fe = res.fieldErrors ?? {};
        setErrors(fe);
        setFormError(res.error);
        const first = Object.keys(fe)[0];
        if (first) setStep(first.startsWith("attr.") ? "attributes" : (FIELD_STEP[first] ?? "preview"));
      }
    });
  }

  if (submitted) {
    const moderated = submitted.status === "pending";
    return (
      <div className="mx-auto max-w-xl rounded-[var(--radius-xl)] border border-line bg-surface p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-lime text-ink">
          <Check className="h-7 w-7" strokeWidth={2.6} />
        </span>
        <h1 className="t-1 mt-5">{t.post.submittedTitle}</h1>
        <p className="mt-3 text-muted">{moderated ? t.post.submittedModeration : t.post.submittedActive}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <LinkButton href="/account/listings" variant="primary">
            {t.post.toMyListings}
          </LinkButton>
          <LinkButton href={`/l/${submitted.id}-x`} variant="secondary">
            {t.post.viewListing}
          </LinkButton>
        </div>
      </div>
    );
  }

  const stepLabels: Record<Step, string> = {
    category: t.post.stepCategory,
    details: t.post.stepDetails,
    photos: t.post.stepPhotos,
    attributes: t.post.stepAttributes,
    contacts: t.post.stepContacts,
    preview: t.post.stepPreview,
  };
  const idx = STEPS.indexOf(step);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="t-1">{initial.id ? t.post.editTitle : t.post.title}</h1>
        <p className="text-sm text-muted">{fmt(t.post.limitInfo, { used: limits.used, limit: limits.limit })}</p>
      </div>

      {/* Progress */}
      <ol className="mt-6 grid grid-cols-6 gap-1.5" aria-label="progress">
        {STEPS.map((s, i) => (
          <li key={s} className="min-w-0">
            <button
              type="button"
              disabled={i > idx}
              onClick={() => i < idx && setStep(s)}
              aria-current={s === step ? "step" : undefined}
              className="group w-full text-left disabled:cursor-default"
            >
              <span className={cn("block h-1.5 rounded-full transition-colors", i <= idx ? "bg-ink" : "bg-line")} />
              <span className={cn("mt-2 hidden truncate text-xs font-semibold md:block", i === idx ? "text-ink" : "text-muted")}>{stepLabels[s]}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm font-semibold md:hidden">
        {idx + 1}/{STEPS.length} · {stepLabels[step]}
      </p>

      <div className="mt-6 rounded-[var(--radius-xl)] border border-line bg-surface p-5 md:p-8">
        {step === "category" && (
          <CategoryStep categories={categories} chain={chain} selected={category} errors={errors} onSelect={(c) => {
            update("categoryId", c.id);
            if (!c.allowedTypes.includes(form.type)) update("type", c.allowedTypes[0]!);
            if (form.categoryId !== c.id) update("attributes", {});
          }} onReset={() => update("categoryId", null)} type={form.type} onType={(v) => update("type", v)} />
        )}

        {step === "details" && (
          <div className="space-y-5">
            <Field label={t.post.titleLabel} hint={t.post.titleHint} error={errors.title} required>
              {(p) => <Input {...p} value={form.title} maxLength={120} onChange={(e) => update("title", e.target.value)} />}
            </Field>
            <Field label={t.post.descriptionLabel} hint={`${t.post.descriptionHint} · ${form.description.length}/5000`} error={errors.description} required>
              {(p) => <Textarea {...p} rows={7} value={form.description} maxLength={5000} onChange={(e) => update("description", e.target.value)} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <Field label={form.type === "service" ? `${t.post.price} (${t.listing.from})` : t.post.price} error={errors.price} required={form.type !== "service" && !form.isNegotiable}>
                {(p) => <Input {...p} inputMode="decimal" value={form.price} onChange={(e) => update("price", e.target.value.replace(/[^\d.,\s]/g, ""))} />}
              </Field>
              <Field label={t.post.currency}>
                {(p) => (
                  <Select {...p} value={form.currency} onChange={(e) => update("currency", e.target.value as "UZS" | "USD")}>
                    <option value="UZS">UZS — {locale === "uz" ? "soʻm" : locale === "en" ? "sum" : "сум"}</option>
                    <option value="USD">USD — $</option>
                  </Select>
                )}
              </Field>
            </div>
            {form.type === "service" && (
              <Field label={t.post.priceMax} error={errors.priceMax}>
                {(p) => <Input {...p} inputMode="decimal" value={form.priceMax} onChange={(e) => update("priceMax", e.target.value.replace(/[^\d.,\s]/g, ""))} />}
              </Field>
            )}
            {form.type === "rent" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t.post.pricePeriod} error={errors.pricePeriod} required>
                  {(p) => (
                    <Select {...p} value={form.pricePeriod} onChange={(e) => update("pricePeriod", e.target.value as WizardInitial["pricePeriod"])}>
                      <option value="">{t.post.choose}</option>
                      <option value="hour">{t.listing.perHour.replace("/ ", "")}</option>
                      <option value="day">{t.listing.perDay.replace("/ ", "")}</option>
                      <option value="week">{t.listing.perWeek.replace("/ ", "")}</option>
                      <option value="month">{t.listing.perMonth.replace("/ ", "")}</option>
                    </Select>
                  )}
                </Field>
                <Field label={t.post.deposit} error={errors.deposit}>
                  {(p) => <Input {...p} inputMode="decimal" value={form.deposit} onChange={(e) => update("deposit", e.target.value.replace(/[^\d.,\s]/g, ""))} />}
                </Field>
              </div>
            )}
            <Checkbox label={t.post.negotiable} checked={form.isNegotiable} onChange={(e) => update("isNegotiable", e.target.checked)} />
            {category?.hasCondition && form.type === "sale" && (
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">
                  {t.post.condition}
                  <span className="ml-0.5 text-danger">*</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {(["new", "like_new", "used", "for_parts"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={form.condition === c}
                      onClick={() => update("condition", c)}
                      className={cn("rounded-full border px-4 py-2 text-sm font-semibold", form.condition === c ? "border-ink bg-ink text-white" : "border-line-strong hover:border-ink/40")}
                    >
                      {conditionLabel(c, t)}
                    </button>
                  ))}
                </div>
                {errors.condition && <p className="mt-1.5 text-[13px] font-medium text-danger">{errors.condition}</p>}
              </fieldset>
            )}
          </div>
        )}

        {step === "photos" && listingId && (
          <PhotosStep listingId={listingId} images={form.images} onChange={(imgs) => setForm((f) => ({ ...f, images: imgs }))} maxImages={limits.maxImages} maxMb={limits.maxMb} />
        )}

        {step === "attributes" && (
          <AttributesStep attrs={attrs} values={form.attributes} errors={errors} onChange={(k, v) => update("attributes", { ...formRef.current.attributes, [k]: v })} />
        )}

        {step === "contacts" && (
          <div className="space-y-5">
            <Field label={t.post.city} error={errors.cityId} required>
              {(p) => (
                <Select {...p} value={form.cityId ?? ""} onChange={(e) => update("cityId", e.target.value ? Number(e.target.value) : null)}>
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
              )}
            </Field>
            <Alert tone="neutral">{t.post.contactHint}</Alert>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.post.phone} error={errors.phone}>
                {(p) => <Input {...p} type="tel" inputMode="tel" autoComplete="tel" placeholder={t.post.phoneHint} value={form.phone} maxLength={30} onChange={(e) => update("phone", e.target.value)} />}
              </Field>
              <Field label={t.post.telegram} error={errors.telegram}>
                {(p) => <Input {...p} placeholder={t.post.telegramHint} value={form.telegram} maxLength={60} onChange={(e) => update("telegram", e.target.value)} />}
              </Field>
            </div>
            <Checkbox label={t.post.hidePhone} checked={form.hidePhone} onChange={(e) => update("hidePhone", e.target.checked)} />
          </div>
        )}

        {step === "preview" && (
          <Preview form={form} chain={chain} regions={regions} attrs={attrs ?? []} />
        )}

        {formError && (
          <Alert tone="danger" className="mt-6">
            {formError}
          </Alert>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
          {idx > 0 ? (
            <Button variant="ghost" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" />
              {t.post.back}
            </Button>
          ) : (
            <Link href="/account/listings" className="text-sm font-semibold text-muted hover:text-ink">
              {t.common.cancel}
            </Link>
          )}
          <span className="ml-auto flex items-center gap-2 text-xs text-muted">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : savedAt ? fmt(t.post.autosaved, { time: savedAt.toLocaleTimeString(locale === "en" ? "en-US" : "ru-RU", { hour: "2-digit", minute: "2-digit" }) }) : null}
          </span>
          {form.categoryId && step !== "category" && (
            <Button variant="secondary" onClick={() => startSaving(async () => void (await saveDraft(false)))} disabled={saving}>
              {t.post.saveDraft}
            </Button>
          )}
          {step === "preview" ? (
            <Button variant="accent" onClick={submit} loading={saving}>
              {limits.premoderation ? t.post.submitModeration : t.post.submit}
            </Button>
          ) : (
            <Button onClick={goNext} disabled={saving && step === "details" && !listingId}>
              {t.post.next}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function CategoryStep({
  categories,
  chain,
  selected,
  errors,
  onSelect,
  onReset,
  type,
  onType,
}: {
  categories: WizardCategory[];
  chain: WizardCategory[];
  selected?: WizardCategory;
  errors: Record<string, string>;
  onSelect: (c: WizardCategory) => void;
  onReset: () => void;
  type: "sale" | "rent" | "service";
  onType: (t: "sale" | "rent" | "service") => void;
}) {
  const { t } = useI18n();
  const parentId = selected ? (selected.isLeaf ? selected.parentId : selected.id) : null;
  const options = categories.filter((c) => c.parentId === parentId);
  return (
    <div>
      <h2 className="t-3 text-lg">{parentId ? t.post.chooseSubcategory : t.post.chooseCategory}</h2>
      {chain.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1 text-sm">
          <button type="button" onClick={onReset} className="font-semibold text-muted hover:text-ink">
            {t.nav.allCategories}
          </button>
          {chain.map((c) => (
            <span key={c.id} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-subtle" />
              <button type="button" onClick={() => onSelect(c)} className="font-semibold hover:underline">
                {c.name}
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {options.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c)}
            className={cn(
              "flex items-center justify-between rounded-[12px] border px-4 py-3 text-left text-[15px] font-semibold transition-colors",
              selected?.id === c.id ? "border-ink bg-lime-soft" : "border-line hover:border-ink/40",
            )}
          >
            {c.name}
            {c.isLeaf ? selected?.id === c.id && <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 text-muted" />}
          </button>
        ))}
      </div>
      {errors.categoryId && <p className="mt-2 text-[13px] font-medium text-danger">{errors.categoryId}</p>}

      {selected?.isLeaf && selected.allowedTypes.length > 1 && (
        <fieldset className="mt-6">
          <legend className="mb-2 text-sm font-semibold">{t.post.type}</legend>
          <div className="flex flex-wrap gap-2">
            {selected.allowedTypes.map((ty) => (
              <button
                key={ty}
                type="button"
                aria-pressed={type === ty}
                onClick={() => onType(ty)}
                className={cn("rounded-full border px-4 py-2 text-sm font-semibold", type === ty ? "border-ink bg-ink text-white" : "border-line-strong hover:border-ink/40")}
              >
                {typeLabel(ty, t)}
              </button>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}

function PhotosStep({
  listingId,
  images,
  onChange,
  maxImages,
  maxMb,
}: {
  listingId: number;
  images: Img[];
  onChange: (imgs: Img[]) => void;
  maxImages: number;
  maxMb: number;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [uploading, setUploading] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  async function upload(files: FileList) {
    const room = maxImages - imagesRef.current.length;
    const list = Array.from(files).slice(0, Math.max(0, room));
    if (files.length > room) toast(t.errors.too_many_images, "error");
    for (const file of list) {
      if (file.size > maxMb * 1024 * 1024) {
        toast(`${file.name}: ${t.errors.image_too_large}`, "error");
        continue;
      }
      setUploading((n) => n + 1);
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch(`/api/listings/${listingId}/images`, { method: "POST", body });
        const data = await res.json();
        if (!res.ok) toast(data.error ?? t.errors.generic, "error");
        else {
          imagesRef.current = [...imagesRef.current, { id: data.id, url: data.url, thumb: data.thumb }];
          onChange(imagesRef.current);
        }
      } catch {
        toast(t.errors.generic, "error");
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  async function reorder(next: Img[]) {
    onChange(next);
    const res = await reorderImagesAction(listingId, next.map((i) => i.id));
    if (!res.ok) toast(res.error, "error");
  }

  return (
    <div>
      <h2 className="t-3 text-lg">{t.post.photos}</h2>
      <p className="mt-1 text-sm text-muted">{fmt(t.post.photosHint, { max: maxImages, mb: maxMb })}</p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((img, i) => (
          <div key={img.id} className="group relative aspect-square overflow-hidden rounded-[14px] bg-soft ring-1 ring-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.thumb} alt="" className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-lime">{t.post.main}</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-ink/70 to-transparent p-2">
              <div className="flex gap-1">
                <IconBtn label={t.post.moveLeft} disabled={i === 0} onClick={() => reorder(swap(images, i, i - 1))}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn label={t.post.moveRight} disabled={i === images.length - 1} onClick={() => reorder(swap(images, i, i + 1))}>
                  <ArrowRight className="h-3.5 w-3.5" />
                </IconBtn>
                {i > 0 && (
                  <IconBtn label={t.post.makeMain} onClick={() => reorder([img, ...images.filter((x) => x.id !== img.id)])}>
                    <Star className="h-3.5 w-3.5" />
                  </IconBtn>
                )}
              </div>
              <IconBtn
                label={t.post.remove}
                onClick={async () => {
                  const res = await removeImageAction(listingId, img.id);
                  if (res.ok) onChange(imagesRef.current.filter((x) => x.id !== img.id));
                  else toast(res.error, "error");
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </IconBtn>
            </div>
          </div>
        ))}
        {Array.from({ length: uploading }).map((_, i) => (
          <div key={`u${i}`} className="skeleton grid aspect-square place-items-center rounded-[14px]">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        ))}
        {images.length + uploading < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-line-strong text-sm font-semibold text-muted transition-colors hover:border-ink hover:text-ink"
          >
            <ImagePlus className="h-7 w-7" strokeWidth={1.6} />
            {t.post.addPhotos}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) void upload(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function swap<T>(arr: T[], a: number, b: number): T[] {
  const out = [...arr];
  [out[a], out[b]] = [out[b]!, out[a]!];
  return out;
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="grid h-7 w-7 place-items-center rounded-full bg-surface/95 text-ink disabled:opacity-30">
      {children}
    </button>
  );
}

function AttributesStep({
  attrs,
  values,
  errors,
  onChange,
}: {
  attrs: AttributeDTO[] | null;
  values: Record<string, AttrValue>;
  errors: Record<string, string>;
  onChange: (key: string, v: AttrValue) => void;
}) {
  const { t } = useI18n();
  if (!attrs) return <div className="skeleton h-40" />;
  if (!attrs.length) return <p className="text-muted">{t.post.noAttributes}</p>;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {attrs.map((a) => {
        const err = errors[`attr.${a.key}`];
        const label = `${a.label}${a.unit ? `, ${a.unit}` : ""}`;
        const v = values[a.key];
        if (a.type === "boolean")
          return <Checkbox key={a.key} className="sm:col-span-2" label={a.label} checked={v === true} onChange={(e) => onChange(a.key, e.target.checked)} />;
        if (a.type === "multiselect") {
          const arr = Array.isArray(v) ? v : [];
          return (
            <fieldset key={a.key} className="sm:col-span-2">
              <legend className="mb-2 text-sm font-semibold">
                {label}
                {a.required && <span className="ml-0.5 text-danger">*</span>}
              </legend>
              <div className="flex flex-wrap gap-2">
                {a.options.map((o) => {
                  const on = arr.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => onChange(a.key, on ? arr.filter((x) => x !== o.value) : [...arr, o.value])}
                      className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium", on ? "border-ink bg-ink text-white" : "border-line-strong hover:border-ink/40")}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
              {err && <p className="mt-1.5 text-[13px] font-medium text-danger">{err}</p>}
            </fieldset>
          );
        }
        return (
          <Field key={a.key} label={label} error={err} required={a.required} className={a.type === "text" && (a.maxLength ?? 0) > 200 ? "sm:col-span-2" : undefined}>
            {(p) =>
              a.type === "select" ? (
                <Select {...p} value={typeof v === "string" ? v : ""} onChange={(e) => onChange(a.key, e.target.value)}>
                  <option value="">{t.post.choose}</option>
                  {a.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              ) : a.type === "text" && (a.maxLength ?? 0) > 200 ? (
                <Textarea {...p} rows={3} value={typeof v === "string" ? v : ""} maxLength={a.maxLength ?? 200} onChange={(e) => onChange(a.key, e.target.value)} />
              ) : (
                <Input
                  {...p}
                  type={a.type === "date" ? "date" : "text"}
                  inputMode={a.type === "number" ? "decimal" : undefined}
                  min={a.type === "number" && a.min != null ? a.min : undefined}
                  max={a.type === "number" && a.max != null ? a.max : undefined}
                  maxLength={a.type === "text" ? (a.maxLength ?? 200) : undefined}
                  value={typeof v === "string" ? v : ""}
                  onChange={(e) => onChange(a.key, a.type === "number" ? e.target.value.replace(/[^\d.,]/g, "") : e.target.value)}
                />
              )
            }
          </Field>
        );
      })}
    </div>
  );
}

function Preview({ form, chain, regions, attrs }: { form: WizardInitial; chain: WizardCategory[]; regions: Region[]; attrs: AttributeDTO[] }) {
  const { t, locale } = useI18n();
  const city = regions.flatMap((r) => r.cities).find((c) => c.id === form.cityId);
  const price = formatListingPrice(
    {
      type: form.type,
      price: form.price ? Number(form.price.replace(/\s/g, "").replace(",", ".")) : null,
      priceMax: form.priceMax ? Number(form.priceMax.replace(/\s/g, "").replace(",", ".")) : null,
      currency: form.currency,
      pricePeriod: form.pricePeriod || null,
      isNegotiable: form.isNegotiable,
    },
    t,
    locale,
  );
  const phone = normalizePhone(form.phone);
  const tg = normalizeTelegram(form.telegram);
  const attrRows = attrs
    .map((a) => {
      const v = form.attributes[a.key];
      if (v === undefined || v === "" || v === false || (Array.isArray(v) && !v.length)) return null;
      const value =
        a.type === "boolean"
          ? t.listing.yes
          : a.type === "select"
            ? a.options.find((o) => o.value === v)?.label
            : a.type === "multiselect"
              ? a.options.filter((o) => (v as string[]).includes(o.value)).map((o) => o.label).join(", ")
              : `${v}${a.unit ? ` ${a.unit}` : ""}`;
      return { label: a.label, value };
    })
    .filter(Boolean) as { label: string; value: string }[];
  return (
    <div>
      <p className="text-sm font-semibold text-muted">{t.post.previewNote}</p>
      <div className="mt-4 overflow-hidden rounded-[var(--radius-lg)] ring-1 ring-line">
        {form.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={form.images[0].url} alt="" className="aspect-[16/10] w-full bg-soft object-contain" />
        ) : (
          <div className="grid aspect-[16/10] place-items-center bg-soft text-muted">{t.listing.noPhoto}</div>
        )}
        <div className="p-5">
          <p className="text-sm text-muted">{chain.map((c) => c.name).join(" › ")}</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight">{form.title || "—"}</h2>
          <p className="mt-2 text-2xl font-extrabold">{price}</p>
          {form.deposit && form.type === "rent" && (
            <p className="mt-1 text-sm text-muted">
              {t.listing.deposit}: {formatMoney(Number(form.deposit.replace(/\s/g, "").replace(",", ".")), form.currency, locale)}
            </p>
          )}
          <p className="mt-1 text-sm text-muted">
            {typeLabel(form.type, t)}
            {form.condition ? ` · ${conditionLabel(form.condition, t)}` : ""}
            {city ? ` · ${city.name}` : ""}
          </p>
          {attrRows.length > 0 && (
            <dl className="mt-4 grid gap-x-6 sm:grid-cols-2">
              {attrRows.map((r) => (
                <div key={r.label} className="flex justify-between gap-3 border-b border-line py-2 text-sm">
                  <dt className="text-muted">{r.label}</dt>
                  <dd className="text-right font-semibold">{r.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{form.description}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {phone && <span className="rounded-full bg-soft px-3 py-1 font-semibold">{formatPhone(phone)}</span>}
            {tg && <span className="rounded-full bg-soft px-3 py-1 font-semibold">@{tg}</span>}
          </div>
        </div>
      </div>
      {form.images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {form.images.slice(1).map((i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i.id} src={i.thumb} alt="" className="h-16 w-16 shrink-0 rounded-[10px] object-cover" />
          ))}
        </div>
      )}
    </div>
  );
}

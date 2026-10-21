"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, Share2 } from "lucide-react";
import { reportAction } from "@/app/actions/listing-public";
import { useI18n } from "@/lib/i18n/client";
import type { ActionResult } from "@/server/errors";
import { Button } from "../ui/button";
import { Alert } from "../ui/misc";
import { Modal } from "../ui/modal";
import { useToast } from "../ui/toast";

const REASONS = ["fraud", "prohibited", "wrong_category", "wrong_price", "duplicate", "offensive", "sold", "fake_contacts", "other"] as const;

export function ShareButton({ title }: { title: string }) {
  const { t } = useI18n();
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={async () => {
        const url = window.location.href;
        try {
          if (navigator.share) await navigator.share({ title, url });
          else {
            await navigator.clipboard.writeText(url);
            toast(t.listing.linkCopied);
          }
        } catch {}
      }}
      className="inline-flex h-11 items-center gap-2 rounded-[12px] border border-line-strong bg-surface px-4 text-[15px] font-semibold hover:bg-canvas"
    >
      <Share2 className="h-[18px] w-[18px]" strokeWidth={1.9} />
      <span className="hidden sm:inline">{t.listing.share}</span>
    </button>
  );
}

export function ReportButton({
  listingId,
  targetUserId,
  loggedIn,
  variant = "link",
}: {
  listingId?: number;
  targetUserId?: string;
  loggedIn: boolean;
  variant?: "link" | "button";
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(reportAction, null);
  const isUser = !listingId;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!loggedIn) router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          else setOpen(true);
        }}
        className={
          variant === "link"
            ? "inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-danger"
            : "inline-flex h-11 items-center gap-2 rounded-[12px] border border-line-strong bg-surface px-4 text-[15px] font-semibold hover:bg-canvas"
        }
      >
        <Flag className="h-4 w-4" />
        {isUser ? t.report.titleUser : t.listing.report}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={isUser ? t.report.titleUser : t.report.title} closeLabel={t.common.close}>
        {state?.ok ? (
          <div className="space-y-4">
            <Alert tone="success">{state.message}</Alert>
            <Button onClick={() => setOpen(false)} className="w-full">
              {t.common.close}
            </Button>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <input type="hidden" name="targetType" value={isUser ? "user" : "listing"} />
            {listingId && <input type="hidden" name="listingId" value={listingId} />}
            {targetUserId && <input type="hidden" name="targetUserId" value={targetUserId} />}
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">{t.report.reason}</legend>
              <div className="grid gap-1.5">
                {REASONS.map((r, i) => (
                  <label key={r} className="flex cursor-pointer items-center gap-3 rounded-[10px] px-2 py-1.5 text-[15px] hover:bg-soft">
                    <input type="radio" name="reason" value={r} required defaultChecked={i === 0} className="h-4 w-4 accent-ink" />
                    {t.report.reasons[r]}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="report-details" className="mb-1.5 block text-sm font-semibold">
                {t.report.details}
              </label>
              <textarea id="report-details" name="details" maxLength={1000} rows={3} className="w-full rounded-[12px] border border-line-strong p-3 text-[15px] outline-none focus:border-ink" />
            </div>
            {state && !state.ok && <Alert tone="danger">{state.error}</Alert>}
            <Button type="submit" loading={pending} className="w-full">
              {t.report.submit}
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Copy, Phone, Send } from "lucide-react";
import { revealPhoneAction, trackContactAction } from "@/app/actions/listing-public";
import { formatPhone, telegramUrl, telUrl } from "@/lib/contacts";
import { useI18n } from "@/lib/i18n/client";
import { buttonClass } from "../ui/button";
import { useToast } from "../ui/toast";

/**
 * "Call" and "Telegram" CTAs. A hidden phone is fetched only after an explicit click.
 * Buttons for missing contacts are not rendered at all.
 */
export function ContactButtons({
  listingId,
  hasPhone,
  phoneMasked,
  phonePublic,
  telegram,
}: {
  listingId: number;
  hasPhone: boolean;
  /** Masked form like "+998 90 123 XX XX" (only when the phone is hidden). */
  phoneMasked: string | null;
  /** Full number when the seller chose not to hide it. */
  phonePublic: string | null;
  telegram: string | null;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [phone, setPhone] = useState<string | null>(phonePublic);
  const [pending, start] = useTransition();

  if (!hasPhone && !telegram) {
    return <p className="rounded-[12px] bg-soft px-4 py-3 text-sm text-muted">{t.listing.noContacts}</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {hasPhone &&
        (phone ? (
          <div className="flex gap-2">
            <a
              href={telUrl(phone)}
              onClick={() => void trackContactAction(listingId, "call")}
              className={buttonClass("primary", "lg", "flex-1")}
            >
              <Phone className="h-[18px] w-[18px]" />
              <span className="flex flex-col items-start leading-tight">
                <span>{t.listing.call}</span>
                <span className="text-xs font-medium text-white/70">{formatPhone(phone)}</span>
              </span>
            </a>
            <button
              type="button"
              aria-label={t.listing.copyPhone}
              title={t.listing.copyPhone}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(phone);
                  toast(t.listing.copied);
                } catch {}
              }}
              className={buttonClass("secondary", "lg", "w-14 px-0")}
            >
              <Copy className="h-[18px] w-[18px]" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await revealPhoneAction(listingId);
                if (res.ok && res.data) setPhone(res.data.phone);
                else if (!res.ok) toast(res.error, "error");
              })
            }
            className={buttonClass("primary", "lg", "w-full")}
          >
            <Phone className="h-[18px] w-[18px]" />
            <span className="flex flex-col items-start leading-tight">
              <span>{t.listing.showPhone}</span>
              {phoneMasked && <span className="text-xs font-medium text-white/70">{phoneMasked}</span>}
            </span>
          </button>
        ))}
      {telegram && (
        <a
          href={telegramUrl(telegram)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => void trackContactAction(listingId, "telegram")}
          className={buttonClass(hasPhone ? "secondary" : "primary", "lg", "w-full")}
        >
          <Send className="h-[18px] w-[18px]" />
          {t.listing.telegram}
        </a>
      )}
    </div>
  );
}


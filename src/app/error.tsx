"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center px-4 text-center">
      <h1 className="t-1">{t.errors.errorTitle}</h1>
      <p className="mt-2 max-w-md text-muted">{t.errors.generic}</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-subtle">#{error.digest}</p>}
      <Button className="mt-6" onClick={reset}>
        {t.errors.retry}
      </Button>
    </div>
  );
}

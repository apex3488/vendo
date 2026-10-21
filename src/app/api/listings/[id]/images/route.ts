import { NextResponse, type NextRequest } from "next/server";
import { getDict } from "@/lib/i18n/server";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/site";
import { getCurrentUser } from "@/server/auth/current";
import { ServiceError } from "@/server/errors";
import { addListingImage } from "@/server/services/images";
import { hit } from "@/server/services/rate-limit";
import { mediaUrl } from "@/server/storage";

/** Same-origin check for state-changing requests that are not Server Actions. */
function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const allowed = new Set([new URL(siteUrl()).origin, req.nextUrl.origin]);
  return allowed.has(origin);
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/listings/[id]/images">) {
  const locale = req.cookies.get(LOCALE_COOKIE)?.value;
  const t = getDict(isLocale(locale) ? locale : "ru");
  if (!sameOrigin(req)) return NextResponse.json({ error: t.errors.forbidden }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: t.errors.unauthenticated }, { status: 401 });
  if (!(await hit(`upload:${user.id}`, 120, 3600))) return NextResponse.json({ error: t.errors.rate_limited }, { status: 429 });

  const id = Number((await ctx.params).id);
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: t.errors.not_found }, { status: 404 });

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 16 * 1024 * 1024) return NextResponse.json({ error: t.errors.image_too_large }, { status: 413 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: t.errors.image_invalid }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    const img = await addListingImage(user.id, id, buf);
    return NextResponse.json({ id: img.id, url: mediaUrl(img.storageKey), thumb: mediaUrl(img.thumbKey) });
  } catch (e) {
    if (e instanceof ServiceError) {
      const status = e.code === "not_found" ? 404 : e.code === "forbidden" ? 403 : 400;
      return NextResponse.json({ error: (t.errors as Record<string, string>)[e.code] ?? t.errors.generic }, { status });
    }
    console.error("[upload] failed", e);
    return NextResponse.json({ error: t.errors.generic }, { status: 500 });
  }
}

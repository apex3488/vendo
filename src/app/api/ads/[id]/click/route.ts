import { NextResponse, type NextRequest } from "next/server";
import { hashIp, hit } from "@/server/services/rate-limit";
import { registerAdClick } from "@/server/services/monetization";
import { getDb } from "@/server/db";
import { adCampaigns } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/** Counts an ad click (deduplicated per visitor) and redirects to the advertiser's https URL. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/ads/[id]/click">) {
  const id = Number((await ctx.params).id);
  if (!Number.isSafeInteger(id) || id <= 0) return new NextResponse(null, { status: 404 });
  const ip = hashIp(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim());
  let url: string | null;
  if (await hit(`adclick:${ip}:${id}`, 1, 3600)) url = await registerAdClick(id);
  else {
    const db = await getDb();
    const [c] = await db.select({ url: adCampaigns.targetUrl }).from(adCampaigns).where(eq(adCampaigns.id, id));
    url = c?.url ?? null;
  }
  if (!url || !/^https:\/\//i.test(url)) return new NextResponse(null, { status: 404 });
  return NextResponse.redirect(url, 302);
}

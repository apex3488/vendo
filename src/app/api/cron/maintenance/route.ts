import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runMaintenance } from "@/server/services/maintenance";

/**
 * Housekeeping endpoint for a scheduler (e.g. Vercel Cron, GitHub Actions, cron-job.org).
 * Requires `Authorization: Bearer <CRON_SECRET>`. Disabled when CRON_SECRET is not set.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return new NextResponse(null, { status: 404 });
  }
  const res = await runMaintenance();
  return NextResponse.json(res);
}

import { NextResponse, type NextRequest } from "next/server";
import { hashIp, hit } from "@/server/services/rate-limit";
import { suggest } from "@/server/services/search";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ items: [] });
  const ip = hashIp(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim());
  if (!(await hit(`suggest:${ip}`, 120, 60))) return NextResponse.json({ items: [] }, { status: 429 });
  const items = await suggest(q);
  return NextResponse.json({ items }, { headers: { "Cache-Control": "private, max-age=30" } });
}

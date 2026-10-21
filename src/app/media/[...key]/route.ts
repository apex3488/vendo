import { NextResponse, type NextRequest } from "next/server";
import { getStorage, isValidKey } from "@/server/storage";

/** Serves locally stored images (STORAGE_DRIVER=local). Keys are random and immutable. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/media/[...key]">) {
  const key = (await ctx.params).key.join("/");
  if (!isValidKey(key)) return new NextResponse(null, { status: 404 });
  const data = await getStorage().get(key);
  if (!data) return new NextResponse(null, { status: 404 });
  const type = key.endsWith(".webp") ? "image/webp" : key.endsWith(".png") ? "image/png" : "image/jpeg";
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}

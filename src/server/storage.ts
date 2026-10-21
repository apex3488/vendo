import fs from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Pluggable object storage for images.
 *  - "local": files under LOCAL_UPLOAD_DIR, served by /media/[...key]. For development and
 *    single-server deployments with a persistent disk.
 *  - "supabase": Supabase Storage via its REST API using the service role key (server only).
 */
export interface Storage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  remove(keys: string[]): Promise<void>;
  publicUrl(key: string): string;
}

const KEY_RE = /^[a-z0-9][a-z0-9/_-]{0,200}\.(webp|jpg|png)$/;
export function isValidKey(key: string) {
  return KEY_RE.test(key) && !key.includes("..");
}

export function newKey(prefix: string, ext = "webp") {
  const d = new Date();
  return `${prefix}/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${randomBytes(12).toString("hex")}.${ext}`;
}

class LocalStorage implements Storage {
  constructor(private root: string) {}
  private file(key: string) {
    if (!isValidKey(key)) throw new Error("Invalid storage key");
    return path.join(/*turbopackIgnore: true*/ this.root, ...key.split("/"));
  }
  async put(key: string, data: Buffer) {
    const f = this.file(key);
    await fs.mkdir(path.dirname(f), { recursive: true });
    await fs.writeFile(f, data);
  }
  async get(key: string) {
    try {
      return await fs.readFile(this.file(key));
    } catch {
      return null;
    }
  }
  async remove(keys: string[]) {
    await Promise.all(keys.map((k) => fs.rm(this.file(k), { force: true })));
  }
  publicUrl(key: string) {
    return `/media/${key}`;
  }
}

class SupabaseStorage implements Storage {
  constructor(
    private url: string,
    private serviceKey: string,
    private bucket: string,
  ) {}
  private headers(extra: Record<string, string> = {}) {
    return { Authorization: `Bearer ${this.serviceKey}`, apikey: this.serviceKey, ...extra };
  }
  async put(key: string, data: Buffer, contentType: string) {
    if (!isValidKey(key)) throw new Error("Invalid storage key");
    const res = await fetch(`${this.url}/storage/v1/object/${this.bucket}/${key}`, {
      method: "POST",
      headers: this.headers({ "Content-Type": contentType, "x-upsert": "false", "cache-control": "31536000" }),
      body: new Uint8Array(data),
    });
    if (!res.ok) throw new Error(`Storage upload failed: ${res.status}`);
  }
  async get(key: string) {
    const res = await fetch(this.publicUrl(key));
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  }
  async remove(keys: string[]) {
    if (!keys.length) return;
    await fetch(`${this.url}/storage/v1/object/${this.bucket}`, {
      method: "DELETE",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ prefixes: keys }),
    });
  }
  publicUrl(key: string) {
    return `${this.url}/storage/v1/object/public/${this.bucket}/${key}`;
  }
}

/** Public base URL of a Vercel Blob store, derived from its token (vercel_blob_rw_<storeId>_<secret>). */
function blobBaseUrl(): string {
  if (process.env.BLOB_PUBLIC_BASE_URL) return process.env.BLOB_PUBLIC_BASE_URL.replace(/\/$/, "");
  const storeId = process.env.BLOB_READ_WRITE_TOKEN?.split("_")[3];
  if (!storeId) throw new Error("BLOB_READ_WRITE_TOKEN is required for vercel-blob storage");
  return `https://${storeId.toLowerCase()}.public.blob.vercel-storage.com`;
}

class VercelBlobStorage implements Storage {
  async put(key: string, data: Buffer, contentType: string) {
    if (!isValidKey(key)) throw new Error("Invalid storage key");
    const { put } = await import("@vercel/blob");
    await put(key, data, { access: "public", contentType, addRandomSuffix: false, cacheControlMaxAge: 31536000 });
  }
  async get(key: string) {
    const res = await fetch(this.publicUrl(key));
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  }
  async remove(keys: string[]) {
    if (!keys.length) return;
    const { del } = await import("@vercel/blob");
    await del(keys.map((k) => this.publicUrl(k)));
  }
  publicUrl(key: string) {
    return `${blobBaseUrl()}/${key}`;
  }
}

let instance: Storage | undefined;
export function getStorage(): Storage {
  if (instance) return instance;
  if (process.env.STORAGE_DRIVER === "vercel-blob") {
    instance = new VercelBlobStorage();
  } else if (process.env.STORAGE_DRIVER === "supabase") {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for supabase storage");
    instance = new SupabaseStorage(url.replace(/\/$/, ""), key, process.env.SUPABASE_STORAGE_BUCKET || "listing-images");
  } else {
    instance = new LocalStorage(path.resolve(/*turbopackIgnore: true*/ process.env.LOCAL_UPLOAD_DIR || "./.data/uploads"));
  }
  return instance;
}

/** Public URL for a stored key (safe to call in server components). */
export function mediaUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (process.env.STORAGE_DRIVER === "vercel-blob") return `${blobBaseUrl()}/${key}`;
  if (process.env.STORAGE_DRIVER === "supabase" && process.env.SUPABASE_URL) {
    return `${process.env.SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${process.env.SUPABASE_STORAGE_BUCKET || "listing-images"}/${key}`;
  }
  return `/media/${key}`;
}

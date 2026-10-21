import { describe, expect, it } from "vitest";
import { formatPhone, maskPhone, normalizePhone, normalizeTelegram, telegramUrl, telUrl } from "@/lib/contacts";
import { parseListingParam, slugify } from "@/lib/slug";
import { parseSearchParams } from "@/lib/search-params";

describe("phone", () => {
  it("normalizes Uzbek formats to E.164", () => {
    expect(normalizePhone("+998 90 123-45-67")).toBe("+998901234567");
    expect(normalizePhone("901234567")).toBe("+998901234567");
    expect(normalizePhone("998901234567")).toBe("+998901234567");
    expect(normalizePhone("00998901234567")).toBe("+998901234567");
  });
  it("rejects garbage", () => {
    expect(normalizePhone("javascript:alert(1)")).toBeNull();
    expect(normalizePhone("+99890123")).toBeNull();
    expect(normalizePhone("12345")).toBeNull();
  });
  it("builds tel: link and masks", () => {
    expect(telUrl("+998901234567")).toBe("tel:+998901234567");
    expect(formatPhone("+998901234567")).toBe("+998 90 123 45 67");
    expect(maskPhone("+998901234567")).not.toContain("45 67");
  });
});

describe("telegram", () => {
  it("accepts usernames in different forms", () => {
    expect(normalizeTelegram("@vendo_shop")).toBe("vendo_shop");
    expect(normalizeTelegram("https://t.me/vendo_shop")).toBe("vendo_shop");
    expect(normalizeTelegram("t.me/vendo_shop?start=1")).toBe("vendo_shop");
  });
  it("rejects dangerous or invalid values", () => {
    expect(normalizeTelegram("javascript:alert(1)")).toBeNull();
    expect(normalizeTelegram("https://evil.com/x")).toBeNull();
    expect(normalizeTelegram("ab")).toBeNull();
    expect(normalizeTelegram("<script>")).toBeNull();
  });
  it("only ever produces https://t.me links", () => {
    expect(telegramUrl("vendo_shop")).toBe("https://t.me/vendo_shop");
  });
});

describe("slugs and params", () => {
  it("transliterates", () => {
    expect(slugify("Продам iPhone 13 Pro")).toBe("prodam-iphone-13-pro");
    expect(slugify("Oʻzbekiston")).toBe("ozbekiston");
  });
  it("parses listing params", () => {
    expect(parseListingParam("123-iphone")).toBe(123);
    expect(parseListingParam("abc")).toBeNull();
  });
  it("parses search params safely", () => {
    const p = parseSearchParams({ q: "iphone", min: "100", max: "x", sort: "drop table", cond: ["new", "bad"], a_year_min: "2015", a_year_max: "2020", a_color: "black" });
    expect(p.q).toBe("iphone");
    expect(p.minPrice).toBe(100);
    expect(p.maxPrice).toBeUndefined();
    expect(p.sort).toBeUndefined();
    expect(p.attrs).toEqual({ year: ["2015..2020"], color: ["black"] });
  });
});

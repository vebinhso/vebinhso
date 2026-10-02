import { describe, expect, it } from "vitest";
import { levelBucket, phonePrefix, registrableDomain } from "./ai-signals";

describe("registrableDomain", () => {
  it("removes deceptive subdomains", () => {
    expect(registrableDomain("https://shopee.vn.uudai-2026.click/dang-nhap?x=1")).toBe("uudai-2026.click");
  });
  it("keeps Vietnamese compound suffixes", () => {
    expect(registrableDomain("abc.com.vn")).toBe("abc.com.vn");
  });
  it("rejects invalid values", () => {
    expect(registrableDomain("not a host" )).toBeNull();
  });
});

describe("phonePrefix", () => {
  it("normalizes Vietnamese numbers", () => {
    expect(phonePrefix("0912 345 678")).toBe("0912");
    expect(phonePrefix("+84 912 345 678")).toBe("0912");
  });
  it("keeps an international calling code", () => {
    expect(phonePrefix("+1 202 555 0199")).toBe("+120");
  });
});

describe("levelBucket", () => {
  it("uses the documented thresholds", () => {
    expect(levelBucket(70)).toBe("high");
    expect(levelBucket(40)).toBe("mid");
    expect(levelBucket(39)).toBe("low");
  });
});
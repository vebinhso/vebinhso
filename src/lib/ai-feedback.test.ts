import { describe, expect, it } from "vitest";
import { pickScores, redactForFeedback, summarizeFeedback } from "./ai-feedback";

describe("redactForFeedback", () => {
  it("masks VN phone numbers", () => {
    expect(redactForFeedback("Gọi 0912 345 678")).toBe("Gọi 0912xxxx78");
    expect(redactForFeedback("số 0912.345.678 nhé")).toBe("số 0912xxxx78 nhé");
    expect(redactForFeedback("+84 912 345 678")).toBe("+849xxxxx78");
  });
  it("masks emails", () => {
    expect(redactForFeedback("liên hệ a.b@gmail.com")).toBe("liên hệ [email]");
  });
  it("strips link query and fragment", () => {
    expect(redactForFeedback("https://shopee.vn.uudai.click/dang-nhap?x=1&t=2 ok"))
      .toBe("https://shopee.vn.uudai.click/dang-nhap ok");
    expect(redactForFeedback("www.abc.com/a#token")).toBe("www.abc.com/a");
  });
  it("masks long digit runs", () => {
    expect(redactForFeedback("CCCD 079203001234")).toBe("CCCD [số]");
  });
  it("caps length", () => {
    expect(redactForFeedback("a".repeat(3000)).length).toBe(2000);
  });
});

describe("pickScores", () => {
  it("keeps only numeric score fields", () => {
    expect(pickScores({ riskScore: 80, level: "high", aiScore: "x", confidence: 0.5 }))
      .toEqual({ riskScore: 80, confidence: 0.5 });
  });
});

describe("summarizeFeedback", () => {
  it("groups by skill version", () => {
    const out = summarizeFeedback([
      { skill_key: "a", skill_version: 1, reporter_role: "student", rating: 1, reason: null },
      { skill_key: "a", skill_version: 1, reporter_role: "teacher", rating: -1, reason: "typo" },
      { skill_key: "a", skill_version: 1, reporter_role: "student", rating: -1, reason: "typo" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].students).toEqual({ total: 2, up: 1 });
    expect(out[0].staff).toEqual({ total: 1, up: 0 });
    expect(out[0].topReasons).toEqual([{ reason: "typo", count: 2 }]);
  });
});

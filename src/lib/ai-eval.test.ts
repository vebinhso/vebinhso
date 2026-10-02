import { describe, it, expect } from "vitest";
import { parseEvalCsv, computeMetrics, compareRuns, fmtPct, SAMPLE_EVAL_CSV, type EvalResultLite } from "./ai-eval";

describe("parseEvalCsv", () => {
  it("đọc file mẫu không lỗi", () => {
    const { rows, errors } = parseEvalCsv(SAMPLE_EVAL_CSV);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(4);
    expect(rows[0].label).toBe("scam");
    expect(rows[1].label).toBe("legit");
  });
  it("báo lỗi đúng số dòng", () => {
    const csv = SAMPLE_EVAL_CSV + "\ntext,ngắn quá,that,,,\ntext,\"Một nội dung đủ dài để qua kiểm tra độ dài\",sai_nhan,,,\nphone,0901 23,lua_dao,,,";
    const { rows, errors } = parseEvalCsv(csv);
    expect(rows).toHaveLength(4);
    expect(errors.map((e) => e.line)).toEqual([6, 7, 8]);
  });
  it("báo thiếu cột", () => {
    expect(parseEvalCsv("a,b\n1,2").errors[0].line).toBe(1);
  });
});

const r = (id: string, label: string, score: number, extra: Partial<EvalResultLite> = {}): EvalResultLite => ({
  case_id: id, attempt: 1, check_kind: "text", label, risk_score: score,
  band: score >= 70 ? "high" : score >= 40 ? "mid" : "low",
  predicted: score >= 70 ? "scam" : "legit",
  correct: (score >= 70 ? "scam" : "legit") === label,
  skill_key: "vbs-van-ban-ai", skill_version: 1, margin: 4, error: null, ...extra,
});

describe("computeMetrics", () => {
  it("tính tỷ lệ báo nhầm và bỏ sót", () => {
    const m = computeMetrics([
      r("a", "scam", 90), r("b", "scam", 80), r("c", "scam", 50),
      r("d", "legit", 75), r("e", "legit", 10), r("f", "legit", 20),
      { ...r("g", "legit", 0), risk_score: null, predicted: null, band: null, correct: null, error: "429" },
    ]);
    expect(m.total).toBe(6);
    expect(m.correct).toBe(4);
    expect(m.falsePositives).toBe(1);
    expect(fmtPct(m.falsePositives, m.legitTotal)).toBe("33,3% (1/3)");
    expect(m.misses).toBe(1);
    expect(m.midCount).toBe(1);
    expect(m.errorCount).toBe(1);
    expect(m.versionsUsed).toEqual(["vbs-van-ban-ai@1"]);
    expect(m.stability).toBeNull();
  });
  it("tính độ ổn định khi chạy 2 lần", () => {
    const m = computeMetrics([r("a", "scam", 90), r("a", "scam", 30, { attempt: 2 }), r("b", "legit", 5), r("b", "legit", 6, { attempt: 2 })]);
    expect(m.stability).toEqual({ same: 1, total: 2, rate: 0.5 });
  });
  it("compareRuns", () => {
    const { fixed, broken } = compareRuns([r("a", "scam", 30), r("b", "legit", 5)], [r("a", "scam", 90), r("b", "legit", 80)]);
    expect(fixed.map((x) => x.caseId)).toEqual(["a"]);
    expect(broken.map((x) => x.caseId)).toEqual(["b"]);
  });
});

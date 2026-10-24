import { describe, expect, it } from "vitest";
import { validateClassroomOcrFile } from "./classroom-ocr";

describe("classroom OCR upload validation", () => {
  it("accepts PNG, JPEG and WebP images", () => {
    for (const type of ["image/png", "image/jpeg", "image/webp"]) {
      expect(() => validateClassroomOcrFile({ type, size: 1024 })).not.toThrow();
    }
  });
  it("rejects other file types", () => {
    expect(() => validateClassroomOcrFile({ type: "application/pdf", size: 100 })).toThrow();
    expect(() => validateClassroomOcrFile({ type: "image/svg+xml", size: 100 })).toThrow();
  });
  it("rejects files larger than 8 MiB", () => {
    expect(() => validateClassroomOcrFile({ type: "image/png", size: 8 * 1024 * 1024 + 1 })).toThrow();
  });
});

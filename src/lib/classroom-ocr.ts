/** Browser-side OCR: the image stays on the user's device.
 * OCR only extracts visible text; it does not understand diagrams or photos.
 */
export function validateClassroomOcrFile(file: Pick<File, "type" | "size">): void {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("OCR chỉ hỗ trợ ảnh PNG, JPEG hoặc WebP.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Ảnh quá lớn (tối đa 8 MB).");
  }
}

export async function readClassroomImageText(file: File): Promise<string> {
  validateClassroomOcrFile(file);
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("vie+eng");
  try {
    const result = await worker.recognize(file);
    const text = result.data.text.trim().slice(0, 12000);
    if (text.length < 15) {
      throw new Error("Không đọc được đủ chữ từ ảnh. Hãy nhập nội dung bằng tay hoặc dùng ảnh rõ nét hơn.");
    }
    return text;
  } finally {
    await worker.terminate();
  }
}

// Ngoại hình nhân vật: khuôn mặt, cảm xúc, dáng người, màu da. Miễn phí đổi.
export const FACE_SHAPES = [
  { id: "oval", vi: "Oval", en: "Oval", d: "M40 23 C52 23 57 32 57 42 C57 54 50 62 40 62 C30 62 23 54 23 42 C23 32 28 23 40 23 Z", s3: [1, 1.08, 1] },
  { id: "long", vi: "Dài", en: "Long", d: "M40 21 C51 21 55 30 55 42 C55 56 49 64 40 64 C31 64 25 56 25 42 C25 30 29 21 40 21 Z", s3: [0.92, 1.18, 0.95] },
  { id: "round", vi: "Tròn", en: "Round", d: "M40 24 C51 24 59 32 59 43 C59 54 51 61 40 61 C29 61 21 54 21 43 C21 32 29 24 40 24 Z", s3: [1.08, 1, 1.05] },
  { id: "square", vi: "Vuông", en: "Square", d: "M24 30 Q24 24 32 24 L48 24 Q56 24 56 30 L57 52 Q56 60 48 61 L32 61 Q24 60 23 52 Z", s3: [1.08, 1.02, 1] },
  { id: "heart", vi: "Trái tim", en: "Heart", d: "M40 26 C46 22 57 24 57 36 C57 48 47 58 40 63 C33 58 23 48 23 36 C23 24 34 22 40 26 Z", s3: [1.05, 1.05, 1] },
  { id: "diamond", vi: "Kim cương", en: "Diamond", d: "M40 22 C46 24 52 30 57 40 C54 52 47 60 40 63 C33 60 26 52 23 40 C28 30 34 24 40 22 Z", s3: [0.98, 1.1, 1] },
] as const;

export const EXPRESSIONS = [
  { id: "smile", vi: "Cười", en: "Smile" },
  { id: "laugh", vi: "Cười lớn", en: "Laugh" },
  { id: "wink", vi: "Nháy mắt", en: "Wink" },
  { id: "tongue", vi: "Lè lưỡi", en: "Tongue" },
  { id: "blush", vi: "Ngại ngùng", en: "Blush" },
  { id: "smirk", vi: "Cười nhếch", en: "Smirk" },
  { id: "neutral", vi: "Bình thản", en: "Neutral" },
  { id: "love", vi: "Mê mẩn", en: "In love" },
  { id: "tears", vi: "Cười ra nước mắt", en: "Tears of joy" },
  { id: "sad", vi: "Buồn", en: "Sad" },
  { id: "upset", vi: "Khó chịu", en: "Upset" },
  { id: "grin", vi: "Nhe răng", en: "Grin" },
] as const;

export const BODY_SHAPES = [
  { id: "apple", vi: "Quả táo", en: "Apple", top: 32, waist: 36, hip: 30 },
  { id: "pear", vi: "Quả lê", en: "Pear", top: 28, waist: 26, hip: 36 },
  { id: "hourglass", vi: "Đồng hồ cát", en: "Hourglass", top: 34, waist: 24, hip: 34 },
  { id: "triangle", vi: "Tam giác ngược", en: "Inverted triangle", top: 38, waist: 28, hip: 26 },
  { id: "rectangle", vi: "Chữ nhật", en: "Rectangle", top: 32, waist: 32, hip: 32 },
] as const;

export const SKIN_TONES = [
  "#e8d8d8", "#f0d2c4", "#d9bea6", "#c9a28a", "#ab8873",
  "#f6deb0", "#f7c4a8", "#e6c4a2", "#e3c7ad", "#d7b495",
  "#e2c1a3", "#c39a80", "#b48a6c", "#9b7867", "#6b5d50",
  "#efcfc4", "#bf8c7c", "#9f6e5c", "#8a6a61", "#2a0606",
];

export type FaceShapeId = (typeof FACE_SHAPES)[number]["id"];
export type ExpressionId = (typeof EXPRESSIONS)[number]["id"];
export type BodyShapeId = (typeof BODY_SHAPES)[number]["id"];

export const faceOf = (v?: string) => FACE_SHAPES.find((f) => f.id === v) ?? FACE_SHAPES[0];
export const bodyOf = (v?: string) => BODY_SHAPES.find((b) => b.id === v) ?? BODY_SHAPES[4];
export const exprOf = (v?: string): ExpressionId => (EXPRESSIONS.find((e) => e.id === v)?.id ?? "smile");

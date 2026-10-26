/** Quy tắc sinh trưởng Vệ Binh Số - thuần logic, không ghi dữ liệu. */
export const GROWTH_MILESTONES = [3, 5, 10, 20, 30] as const;
export const SHOVEL_PRICE = 20;
export const BOOST_PRICE = 30;
export const BOOST_FACTOR = 1.3;
export const BOOST_QUIZ_STREAK = 5;
export const WILT_AFTER_DAYS = 3;
const DAY_MS = 86_400_000;
const VN_OFFSET_MS = 7 * 3_600_000;
export function vietnamDay(iso: string): number {
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp)) throw new Error("Invalid timestamp");
  return Math.floor((timestamp + VN_OFFSET_MS) / DAY_MS);
}
export function gardenStatus(input: {
  plantedAt: string;
  lastWateredAt: string | null;
  now: string;
  boosted: boolean;
}) {
  const planted = vietnamDay(input.plantedAt);
  const today = vietnamDay(input.now);
  const lastWatered = input.lastWateredAt ? vietnamDay(input.lastWateredAt) : planted;
  const elapsedDays = Math.max(0, today - planted);
  const dryDays = Math.max(0, today - lastWatered);
  const wilted = dryDays >= WILT_AFTER_DAYS;
  const effectiveDays = elapsedDays * (input.boosted ? BOOST_FACTOR : 1);
  const level = wilted ? 0 : GROWTH_MILESTONES.filter(day => effectiveDays >= day).length;
  return {
    elapsedDays,
    dryDays,
    wilted,
    level,
    needsWater: !wilted && dryDays > 0,
    canWaterToday: !wilted && lastWatered < today,
    effectiveDays,
    nextMilestone: level < 5 ? GROWTH_MILESTONES[level] : null,
  };
}
export function nextBoostStreak(current: number, correct: boolean) {
  return correct ? Math.min(BOOST_QUIZ_STREAK, current + 1) : 0;
}

export function PaintBucketIcon({ color, size = 40 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path d="M18 22 L22 6 L48 4 L50 20" fill="none" stroke="#9ca3af" strokeWidth="4" strokeLinejoin="round" />
      <path d="M12 22 L16 58 Q32 62 48 58 L52 22 Z" fill="#d1d5db" stroke="#9ca3af" strokeWidth="1.5" />
      <ellipse cx="32" cy="22" rx="20" ry="6" fill="#9ca3af" />
      <ellipse cx="32" cy="22.5" rx="17" ry="4.5" fill={color} />
      <path d="M20 23 Q19 36 21 38 Q23 36 22 24 Z" fill={color} />
      <circle cx="16" cy="30" r="2.5" fill="#9ca3af" />
    </svg>
  );
}

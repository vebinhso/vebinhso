import { validatePassword } from "@/lib/password";
import { useLocale } from "@/lib/locale";

const LABELS: [keyof ReturnType<typeof validatePassword>, string][] = [
  ["minLength", "Ít nhất 13 ký tự"],
  ["hasUpper", "Có chữ in hoa (A–Z)"],
  ["hasLower", "Có chữ thường (a–z)"],
  ["hasNumber", "Có số (0–9)"],
  ["hasSymbol", "Có ký hiệu (!@#$%...)"],
];

export function PasswordChecklist({ password }: { password: string }) {
  const en = useLocale() === "en";
  const checks = validatePassword(password);
  const labels = en ? [
    "At least 13 characters",
    "One uppercase letter (A–Z)",
    "One lowercase letter (a–z)",
    "One number (0–9)",
    "One symbol (!@#$%...)",
  ] : LABELS.map(([, label]) => label);
  return (
    <div className="rounded-xl bg-gray-50 p-3 space-y-1">
      {LABELS.map(([key], index) => (
        <div
          key={key}
          className={`text-sm font-bold flex items-center gap-2 ${checks[key] ? "text-green-600" : "text-red-500"}`}
        >
          <span>{checks[key] ? "✓" : "✗"}</span>
          <span>{labels[index]}</span>
        </div>
      ))}
    </div>
  );
}

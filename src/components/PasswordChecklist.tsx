import { validatePassword } from "@/lib/password";

const LABELS: [keyof ReturnType<typeof validatePassword>, string][] = [
  ["minLength", "Ít nhất 13 ký tự"],
  ["hasUpper", "Có chữ in hoa (A–Z)"],
  ["hasLower", "Có chữ thường (a–z)"],
  ["hasNumber", "Có số (0–9)"],
  ["hasSymbol", "Có ký hiệu (!@#$%...)"],
];

export function PasswordChecklist({ password }: { password: string }) {
  const checks = validatePassword(password);
  return (
    <div className="rounded-xl bg-gray-50 p-3 space-y-1">
      {LABELS.map(([key, label]) => (
        <div
          key={key}
          className={`text-sm font-bold flex items-center gap-2 ${checks[key] ? "text-green-600" : "text-red-500"}`}
        >
          <span>{checks[key] ? "✓" : "✗"}</span>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

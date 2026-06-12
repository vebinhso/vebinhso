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
    <div>
      {LABELS.map(([key, label]) => (
        <div key={key}>
          <span>{checks[key] ? "✓" : "✗"}</span> {label}
        </div>
      ))}
    </div>
  );
}

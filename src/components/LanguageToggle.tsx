import { setLocale, useLocale } from "@/lib/locale";

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  return (
    <div
      className={`inline-flex items-center border-2 border-white bg-background/95 shadow-lg ${compact ? "rounded-full p-0.5" : "rounded-lg p-1"}`}
      role="group"
      aria-label={locale === "en" ? "Language" : "Ngôn ngữ"}
    >
      {(["vi", "en"] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setLocale(value)}
          aria-pressed={locale === value}
          className={`${compact ? "h-8 min-w-9 rounded-full text-[11px]" : "h-9 min-w-11 rounded-md text-xs"} font-black transition-colors ${
            locale === value ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
          }`}
        >
          {value.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
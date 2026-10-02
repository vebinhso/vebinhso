import { getDomain } from "tldts";

export type SignalBucket = "high" | "mid" | "low";

export function registrableDomain(urlOrHost: string): string | null {
  const raw = String(urlOrHost ?? "").trim().toLowerCase();
  if (!raw) return null;
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const hostname = new URL(candidate).hostname.replace(/^www\./, "");
    return getDomain(hostname, { allowPrivateDomains: false }) ?? null;
  } catch {
    return null;
  }
}

export function phonePrefix(phone: string): string | null {
  const raw = String(phone ?? "").trim();
  if (!raw) return null;
  const compact = raw.replace(/[\s().-]/g, "");
  if (compact.startsWith("+84")) {
    const local = `0${compact.slice(3).replace(/\D/g, "")}`;
    return local.length >= 4 ? local.slice(0, 4) : null;
  }
  if (compact.startsWith("0")) {
    const local = compact.replace(/\D/g, "");
    return local.length >= 4 ? local.slice(0, 4) : null;
  }
  const international = compact.match(/^\+(\d{1,3})/);
  return international ? `+${international[1]}` : null;
}

export function levelBucket(score: number): SignalBucket {
  if (score >= 70) return "high";
  if (score >= 40) return "mid";
  return "low";
}
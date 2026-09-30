import { useEffect, useState } from "react";

export type Locale = "vi" | "en";

const STORAGE_KEY = "vebinhso_locale_v1";
const CHANGE_EVENT = "vebinhso-locale-change";

let currentLocale: Locale = "vi";

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "vi";
  return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "vi";
}

export function getLocale(): Locale {
  if (typeof window !== "undefined") currentLocale = readStoredLocale();
  return currentLocale;
}

export function setLocale(locale: Locale) {
  currentLocale = locale;
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.lang = locale;
  window.dispatchEvent(new CustomEvent<Locale>(CHANGE_EVENT, { detail: locale }));
}

export function useLocale(): Locale {
  const [locale, updateLocale] = useState<Locale>("vi");
  useEffect(() => {
    const sync = () => updateLocale(getLocale());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return locale;
}

export function localize<T>(locale: Locale, vi: T, en: T): T {
  return locale === "en" ? en : vi;
}

export function localeCode(locale: Locale) {
  return locale === "en" ? "en-US" : "vi-VN";
}
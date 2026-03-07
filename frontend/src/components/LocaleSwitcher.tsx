"use client";

import { useLocale } from "@/contexts/LocaleContext";

export default function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();
  return (
    <button
      onClick={() => setLocale(locale === "en" ? "es" : "en")}
      className="text-sm font-medium text-gray-600 hover:text-blue-600 border border-gray-200 hover:border-blue-400 px-2.5 py-1 rounded-lg transition-colors"
      aria-label={locale === "en" ? "Switch to Spanish" : "Cambiar a Inglés"}
    >
      {locale === "en" ? "ES" : "EN"}
    </button>
  );
}

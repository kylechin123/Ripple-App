"use client";

import { LANGUAGES, useI18n, type Lang } from "@/i18n";

/** Language switcher. `compact` is a small pill for headers; the full version is a row of buttons. */
export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useI18n();
  if (compact) {
    return (
      <label className="relative">
        <span className="sr-only">{t("lang.label")}</span>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          className="appearance-none rounded-full bg-white/90 py-1.5 pl-3 pr-7 text-xs font-bold text-[#4c1d95] shadow outline-none"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              🌐 {l.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#4c1d95]">▾</span>
      </label>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          className={`rounded-2xl border-2 px-3 py-2.5 text-sm font-semibold transition ${lang === l.code ? "border-transparent bg-grad text-white" : "border-line hover:border-brand"}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

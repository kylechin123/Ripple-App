"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { en, type MessageKey, type Messages } from "./en";
import { ta } from "./ta";
import { zhHans } from "./zh-Hans";
import { zhHant } from "./zh-Hant";

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "zh-Hans", label: "简体中文" },
  { code: "zh-Hant", label: "繁體中文" },
  { code: "ta", label: "தமிழ்" },
] as const;
export type Lang = (typeof LANGUAGES)[number]["code"];

const DICTS: Record<Lang, Messages> = { en, "zh-Hans": zhHans, "zh-Hant": zhHant, ta };
const STORAGE_KEY = "ripple.lang";
const isLang = (v: unknown): v is Lang => LANGUAGES.some((l) => l.code === v);

// The chosen language lives in localStorage; useSyncExternalStore keeps SSR ("en") and the client in sync without effects.
const listeners = new Set<() => void>();
function readLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (isLang(v)) return v;
  } catch {}
  return "en";
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function writeLang(lang: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {}
  listeners.forEach((l) => l());
}

export type T = (key: MessageKey, vars?: Record<string, string | number>) => string;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: T; opt: (value: string) => string };
const I18nContext = createContext<Ctx | null>(null);

function format(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readLang, () => "en" as Lang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback<T>((key, vars) => format(DICTS[lang][key] ?? en[key] ?? key, vars), [lang]);

  /** Translate a preset option (interest, skill, dislike). Custom entries are shown as typed. */
  const opt = useCallback(
    (value: string) => {
      return DICTS[lang][`opt.${value}`] ?? value;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang: writeLang, t, opt }), [lang, t, opt]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export function useT() {
  return useI18n().t;
}

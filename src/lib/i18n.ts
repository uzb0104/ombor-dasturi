import { create } from "zustand";
import { persist } from "zustand/middleware";
import { translate, type Lang } from "./i18n/translations";

export type { Lang };

export const LANG_LABELS: Record<Exclude<Lang, "uz_cyr">, string> = {
  uz: "O'zbekcha",
  ru: "Русский",
};

export const UI_LANGS = ["uz", "ru"] as const satisfies readonly Lang[];

export const useLang = create<{ lang: Lang; setLang: (l: Lang) => void }>()(
  persist(
    (set) => ({ lang: "uz", setLang: (l) => set({ lang: l }) }),
    { name: "autoerp-lang-v1" }
  )
);

export function useT() {
  const rawLang = useLang((s) => s.lang);
  const lang = rawLang === "uz_cyr" ? "uz" : rawLang;
  return (key: string, params?: Record<string, string | number>) => translate(lang, key, params);
}

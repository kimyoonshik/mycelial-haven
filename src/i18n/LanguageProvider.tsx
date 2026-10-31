import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "ko";
// 모든 다국어 문구의 기본 단위
export type L = Record<Lang, string>;

const STORAGE_KEY = "mycerra.lang";

const readStored = (): Lang => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "ko" ? "ko" : "en";
  } catch {
    return "en";
  }
};

interface LanguageValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** 다국어 문구에서 현재 언어 값을 꺼낸다 */
  t: (text: L) => string;
}

const LanguageContext = createContext<LanguageValue | null>(null);

// 기본 영문. 사용자가 고른 언어는 브라우저에 기억한다.
export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(readStored);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 저장소를 쓸 수 없는 환경(사파리 비공개 모드 등)에서는 세션 동안만 유지
    }
  }, []);

  const value = useMemo(() => ({ lang, setLang, t: (text: L) => text[lang] }), [lang, setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
};

/** 페이지별 문구 사전: { en: {...}, ko: {...} } 중 현재 언어 쪽을 돌려준다 */
export const useCopy = <T,>(copy: Record<Lang, T>): T => copy[useLang().lang];

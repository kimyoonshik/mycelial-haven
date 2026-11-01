import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { pathFor } from "./paths";

export type Lang = "en" | "ko";
// 모든 다국어 문구의 기본 단위
export type L = Record<Lang, string>;

const STORAGE_KEY = "mycerra.lang";

export const readStoredLang = (): Lang | null => {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "ko" || v === "en" ? v : null;
  } catch {
    return null;
  }
};
const storeLang = (lang: Lang) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // 저장소를 쓸 수 없는 환경(사파리 비공개 모드 등)에서는 기억하지 않음
  }
};

interface LanguageValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** 주소로 언어를 정하는 방식(/ko/…)인지 — 전환 버튼을 링크로 그린다 */
  urlMode: boolean;
  /** 다국어 문구에서 현재 언어 값을 꺼낸다 */
  t: (text: L) => string;
}

const LanguageContext = createContext<LanguageValue | null>(null);

/**
 * lang 을 넘기면 주소 방식: 언어는 주소(/ko/…)가 정하고, 전환하면 같은 페이지의 다른 언어 주소로 이동한다.
 * lang 을 넘기지 않으면(주소를 쓸 수 없는 미리보기) 화면 안에서만 바꾸고 브라우저에 기억한다.
 */
export const LanguageProvider = ({ children, lang: urlLang }: { children: ReactNode; lang?: Lang }) => {
  const urlMode = urlLang !== undefined;
  const [stateLang, setStateLang] = useState<Lang>(() => urlLang ?? readStoredLang() ?? "en");
  const lang = urlLang ?? stateLang;

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // 한글을 골랐던 방문자가 바깥(검색·링크)에서 영문 주소로 들어오면 한국어 주소로 안내한다.
  // 검색엔진 수집기는 저장된 선택이 없으므로 영향 없음.
  useEffect(() => {
    if (!urlMode || urlLang !== "en" || readStoredLang() !== "ko") return;
    let internal = false;
    try {
      internal = !!document.referrer && new URL(document.referrer).origin === window.location.origin;
    } catch {
      internal = false;
    }
    if (!internal) {
      const { pathname, search, hash } = window.location;
      window.location.replace(pathFor("ko", pathname) + search + hash);
    }
    // 첫 진입 때 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLang = useCallback(
    (next: Lang) => {
      storeLang(next);
      if (urlMode) {
        const { pathname, search, hash } = window.location;
        window.location.assign(pathFor(next, pathname) + search + hash);
      } else {
        setStateLang(next);
      }
    },
    [urlMode],
  );

  const value = useMemo(() => ({ lang, setLang, urlMode, t: (text: L) => text[lang] }), [lang, setLang, urlMode]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
};

/** 화면 문구 묶음 { en: {...}, ko: {...} } 에서 현재 언어 쪽을 꺼낸다 */
export const useCopy = <T,>(copy: Record<Lang, T>): T => copy[useLang().lang];

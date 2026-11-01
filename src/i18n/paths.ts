// 언어별 주소: 영문 /technology · 한국어 /ko/technology
// 한국어 페이지를 따로 두어야 네이버·구글이 한국어 내용을 색인한다.
import type { Lang } from "./LanguageProvider";

export const KO_BASE = "/ko";

export const isKoPath = (pathname: string) => pathname === KO_BASE || pathname.startsWith(`${KO_BASE}/`);

/** 언어 접두어를 뺀 경로 ("/ko/shop" → "/shop", "/ko" → "/") */
export const stripLang = (pathname: string) => (isKoPath(pathname) ? pathname.slice(KO_BASE.length) || "/" : pathname);

/** 같은 페이지의 다른 언어 주소 */
export const pathFor = (lang: Lang, pathname: string) => {
  const p = stripLang(pathname);
  return lang === "ko" ? (p === "/" ? KO_BASE : `${KO_BASE}${p}`) : p;
};

// 페이지 문구·사진·섹션 순서 — 데이터는 src/content/data/site.json (운영 도구 CMS의 "페이지" 탭으로 편집).
//  - pages.<페이지>.order    : 섹션 순서와 표시 여부
//  - pages.<페이지>.content  : 섹션별 문구({en, ko})와 사진(/media/…)
//  - shared                  : 여러 페이지가 함께 쓰는 콘텐츠 (소재 라이브러리, 공정, 임팩트 수치 등)

import { useMemo } from "react";
import siteData from "./data/site.json";
import { media } from "@/lib/media";
import { useLang, type Lang } from "@/i18n/LanguageProvider";

export const site = siteData;
export type PageId = keyof typeof siteData.pages;

type Lx = { en: string; ko: string };
type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

/** {en, ko} 를 현재 언어 문자열로 바꾼 타입 */
export type Localized<T> = T extends Lx
  ? string
  : T extends (infer U)[]
    ? Localized<U>[]
    : T extends object
      ? { [K in keyof T]: Localized<T[K]> }
      : T;

const isL = (v: unknown): v is Lx =>
  typeof v === "object" && v !== null && !Array.isArray(v) && "en" in v && "ko" in v && Object.keys(v).length === 2;

/** 데이터 전체를 현재 언어로 변환하고, /media 경로는 빌드 기준 경로에 맞춘다 */
export const localize = <T,>(v: T, lang: Lang): Localized<T> => {
  if (isL(v)) return v[lang] as Localized<T>;
  if (typeof v === "string") return media(v) as Localized<T>;
  if (Array.isArray(v)) return v.map((x) => localize(x, lang)) as Localized<T>;
  if (v && typeof v === "object")
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, localize(x, lang)])) as Localized<T>;
  return v as Localized<T>;
};

type PageContent<P extends PageId> = (typeof siteData.pages)[P]["content"];
type MergedCopy<P extends PageId> = UnionToIntersection<PageContent<P>[keyof PageContent<P>]>;

/** 페이지의 모든 섹션 문구를 하나로 합쳐 현재 언어로 (섹션 간 필드 이름은 겹치지 않게 관리) */
export const usePageCopy = <P extends PageId>(page: P): Localized<MergedCopy<P>> => {
  const { lang } = useLang();
  return useMemo(
    () => localize(Object.assign({}, ...Object.values(siteData.pages[page].content)), lang),
    [page, lang],
  ) as Localized<MergedCopy<P>>;
};

/** 섹션별 문구를 따로 (여러 섹션에 같은 필드 이름이 있을 때) */
export const useSectionsCopy = <P extends PageId>(page: P): { [K in keyof PageContent<P>]: Localized<PageContent<P>[K]> } => {
  const { lang } = useLang();
  return useMemo(() => localize(siteData.pages[page].content, lang), [page, lang]) as {
    [K in keyof PageContent<P>]: Localized<PageContent<P>[K]>;
  };
};

/** 표시할 섹션 ID 목록 (운영 도구에서 정한 순서, 숨긴 섹션 제외) */
// 첫 화면 섹션(홈 hero · 다른 페이지 intro)은 순서와 관계없이 항상 맨 위 — 숨기기만 가능
export const OPENER_SECTIONS = ["hero", "intro"];

/** 첫 화면 섹션을 맨 앞으로 옮긴 순서 */
export const pinOpener = <T extends { id: string }>(order: T[]): T[] => {
  const i = order.findIndex((s) => OPENER_SECTIONS.includes(s.id));
  return i > 0 ? [order[i], ...order.slice(0, i), ...order.slice(i + 1)] : order;
};

export const pageSections = (page: PageId): string[] =>
  pinOpener(siteData.pages[page].order)
    .filter((s) => s.visible)
    .map((s) => s.id);

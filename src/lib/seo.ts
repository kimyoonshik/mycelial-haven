// 페이지 제목·설명·SNS 미리보기 메타 태그.
// 같은 데이터(src/content/data/seo.json)를 빌드 후 scripts/prerender.mjs 가 페이지별 HTML에도 써 넣는다.

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import seoData from "@/content/data/seo.json";
import type { Seo } from "@/content/schema";
import { useLang } from "@/i18n/LanguageProvider";

export const seo = seoData as Seo;

interface Meta {
  title: string;
  description: string;
  image?: string;
}

const setMeta = (attr: "name" | "property", key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
};

const apply = (m: Meta, path: string) => {
  const url = `${seo.siteUrl}${path === "/" ? "/" : path}`;
  const image = `${seo.siteUrl}${m.image ?? seo.defaultImage}`;
  document.title = m.title;
  setMeta("name", "description", m.description);
  setMeta("property", "og:title", m.title);
  setMeta("property", "og:description", m.description);
  setMeta("property", "og:url", url);
  setMeta("property", "og:image", image);
  setMeta("name", "twitter:image", image);
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = url;
  setMeta("name", "robots", seo.noindex.some((p) => path.startsWith(p)) ? "noindex, nofollow" : "index, follow");
};

/** 개별 페이지(상품 상세 등)에서 직접 메타를 지정 */
export const useSeo = (meta: Meta | null) => {
  const { pathname } = useLocation();
  useEffect(() => {
    if (meta) apply(meta, pathname);
  }, [meta?.title, meta?.description, meta?.image, pathname]); // eslint-disable-line react-hooks/exhaustive-deps
};

/** seo.json 에 등록된 경로는 레이아웃에서 자동 적용 */
export const useRouteSeo = () => {
  const { pathname } = useLocation();
  const { lang } = useLang();
  useEffect(() => {
    const r = seo.routes[pathname];
    if (r) apply({ title: r.title[lang], description: r.description[lang] }, pathname);
    else if (seo.noindex.some((p) => pathname.startsWith(p))) setMeta("name", "robots", "noindex, nofollow");
  }, [pathname, lang]);
};

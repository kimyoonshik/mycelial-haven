// 방문자 분석 — Google Analytics 4 · 네이버 애널리틱스.
// 측정 ID는 src/content/data/seo.json › analytics (운영 도구 "SEO" 탭). 비어 있으면 아무것도 불러오지 않는다.
// 동의: EU·영국·스위스 방문자는 기본 "거부"(동의해야 쿠키 사용), 그 외 지역은 기본 "허용"이며 배너에서 거부 가능.
import seoData from "@/content/data/seo.json";
import type { Seo } from "@/content/schema";

const ids = (seoData as Seo).analytics;
export const analyticsEnabled = !!(ids.ga4 || ids.naver);

const CONSENT_KEY = "mycerra.consent";
export type Consent = "granted" | "denied";

export const readConsent = (): Consent | null => {
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
};

// EEA + 영국 + 스위스 (Google 동의 모드 지역 코드)
const STRICT_REGIONS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IS", "IE", "IT", "LV", "LI", "LT",
  "LU", "MT", "NL", "NO", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "GB", "CH",
];

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    wcs_add?: Record<string, string>;
    wcs_do?: () => void;
  }
}

const loadScript = (src: string) =>
  new Promise<void>((resolve) => {
    const s = document.createElement("script");
    s.async = true;
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });

let started = false;
let naverReady = false;

/** 사이트가 열릴 때 한 번 */
export const initAnalytics = () => {
  if (started || !analyticsEnabled || typeof window === "undefined") return;
  started = true;
  const choice = readConsent();

  if (ids.ga4) {
    window.dataLayer = window.dataLayer || [];
    // gtag 는 반드시 arguments 객체를 넣어야 한다 (Google 안내 코드와 동일)
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    const denied = { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" };
    window.gtag("consent", "default", { ...denied, analytics_storage: "granted" });
    window.gtag("consent", "default", { ...denied, region: STRICT_REGIONS });
    if (choice) window.gtag("consent", "update", { analytics_storage: choice });
    window.gtag("js", new Date());
    window.gtag("config", ids.ga4, { send_page_view: false });
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${ids.ga4}`);
  }

  if (ids.naver && choice !== "denied") {
    window.wcs_add = window.wcs_add || {};
    window.wcs_add.wa = ids.naver;
    loadScript("https://wcs.naver.net/wcslog.js").then(() => {
      naverReady = true;
      window.wcs_do?.();
    });
  }
};

/** 배너에서 동의·거부를 고른 경우 */
export const setConsent = (choice: Consent) => {
  try {
    window.localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    // 저장할 수 없으면 이번 방문 동안만 적용
  }
  window.gtag?.("consent", "update", { analytics_storage: choice });
};

/** 페이지 이동마다 (한 페이지 앱이라 직접 보낸다) */
export const trackPageView = (path: string, lang: string) => {
  if (!started) return;
  window.gtag?.("event", "page_view", {
    page_location: window.location.href,
    page_path: path,
    page_title: document.title,
    language: lang,
  });
  if (naverReady && readConsent() !== "denied") window.wcs_do?.();
};

/** 주요 행동 (장바구니 담기·발주희망서·문의·결제 완료) */
export const trackEvent = (name: string, params: Record<string, unknown> = {}) => {
  if (!started) return;
  window.gtag?.("event", name, params);
};

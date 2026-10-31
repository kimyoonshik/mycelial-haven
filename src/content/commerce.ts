// 쇼핑몰 거래 조건 단일 소스. 가격·물량 기준을 바꿀 때는 이 파일만 수정한다.
// 원가 모델·IR 자료의 단가와 일치하는지 확인 후 반영할 것.
//
// 주문 경로
//   개인 주문(Retail):   최소 20 sqft ~ 개인 주문 상한, sqft당 USD 30, PayPal 즉시 결제
//   발주(PO Request):    개인 주문 상한 초과, 또는 국내(한국) 구매자, 또는 구매자가 기업 거래를 원할 때
//                        → 발주희망서 접수 → 가격·물량·거래조건 승인 인보이스 발송 → 결제 → 원단 발송

import type { L } from "@/i18n/LanguageProvider";

export const CURRENCY = "USD";

export const retail = {
  unitPriceUSD: 30, // sqft당 단가
  minSqft: 20, // 개인 주문 최소 물량 (주문 합계 기준)
  // TODO(확정 필요): 개인 주문으로 받을 최대 물량. 초과 시 발주서 경로로 전환된다.
  maxSqft: 100,
  // TODO(확정 필요): 개인 주문 배송비. 0이면 "단가에 포함"으로 표시된다.
  shippingUSD: 0,
};

// 한국 PayPal 계정끼리는 결제가 불가 (PayPal Korea 정책) → 국내 구매자는 발주·계좌이체 경로
export const DOMESTIC_COUNTRY = "KR";

// PayPal 클라이언트 ID는 빌드 환경변수로 주입한다 (.env: VITE_PAYPAL_CLIENT_ID=...)
// 비어 있으면 결제 버튼 대신 "PayPal 인보이스 요청"으로 동작한다.
export const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID ?? "";

export const seller = {
  company: "SAVE EARTH Inc.",
  brand: "Mycerra™",
  email: "contact@saveearth.kr",
  // TODO(입력 필요): 인보이스에 인쇄되는 판매자 정보
  address: "[Company address, Republic of Korea]",
  businessRegNo: "[Business registration no.]",
  phone: "[Phone]",
  countryOfOrigin: "Republic of Korea",
  // TODO(관세사 확인): 균사 매트의 HS 코드
  hsCode: "[HS code — to be confirmed]",
};

export const incoterms: { code: string; label: L }[] = [
  { code: "EXW", label: { en: "EXW — Ex Works (buyer collects)", ko: "EXW — 공장인도 (구매자 수거)" } },
  { code: "FCA", label: { en: "FCA — Free Carrier", ko: "FCA — 운송인 인도" } },
  { code: "CPT", label: { en: "CPT — Carriage Paid To", ko: "CPT — 운송비 지급 인도" } },
  { code: "DAP", label: { en: "DAP — Delivered at Place", ko: "DAP — 도착지 인도 (관세 구매자 부담)" } },
  { code: "DDP", label: { en: "DDP — Delivered Duty Paid", ko: "DDP — 관세 지급 인도" } },
];

export const paymentTerms: { code: string; label: L }[] = [
  { code: "ADV100", label: { en: "100% advance payment", ko: "100% 선결제" } },
  { code: "ADV50", label: { en: "50% deposit, 50% before shipment", ko: "50% 선금, 50% 선적 전 잔금" } },
  { code: "NET30", label: { en: "Net 30 (approved accounts only)", ko: "30일 후불 (승인 거래처 한정)" } },
];

export const paymentMethods: { code: string; label: L }[] = [
  { code: "PAYPAL", label: { en: "PayPal invoice (card or PayPal)", ko: "PayPal 인보이스 (카드·PayPal)" } },
  { code: "TT", label: { en: "Bank wire transfer (T/T, USD)", ko: "해외송금 (T/T, USD)" } },
  { code: "KRW", label: { en: "Domestic bank transfer (KRW, Korea only)", ko: "원화 계좌이체 (국내 한정)" } },
];

// ---------- 계산 ----------

/** 품목 금액 합계(품목별 단가 × sqft의 합)에 배송비를 더한다 */
export const orderTotals = (itemTotalUSD: number, shippingUSD = retail.shippingUSD) => {
  const itemTotal = round2(itemTotalUSD);
  return { itemTotal, shipping: shippingUSD, total: round2(itemTotal + shippingUSD) };
};

export type OrderRoute = "below-min" | "retail" | "po-volume" | "po-domestic";

/** 주문 합계 물량과 구매자 국가로 결제 경로를 결정한다 */
export const routeFor = (totalSqft: number, country: string | null): OrderRoute => {
  if (totalSqft < retail.minSqft) return "below-min";
  if (country === DOMESTIC_COUNTRY) return "po-domestic";
  if (totalSqft > retail.maxSqft) return "po-volume";
  return "retail";
};

export const round2 = (n: number) => Math.round(n * 100) / 100;

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export const formatUSD = (n: number) => usd.format(n);

// 주문·발주·인보이스 번호: 접두어-YYMMDD-무작위 4자리 (예: MYC-261031-7K2Q)
export const makeRef = (prefix: "MYC" | "POR" | "INV", date = new Date()) => {
  const ymd = date.toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32])
    .join("");
  return `${prefix}-${ymd}-${rand}`;
};

// ---------- 국가 목록 (주문서 선택용, 주요 시장 + 기타) ----------

export const countries: { code: string; name: string }[] = [
  { code: "US", name: "United States" },
  { code: "KR", name: "Korea, Republic of (대한민국)" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
  { code: "TW", name: "Taiwan" },
  { code: "HK", name: "Hong Kong" },
  { code: "SG", name: "Singapore" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "DK", name: "Denmark" },
  { code: "CH", name: "Switzerland" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "OTHER", name: "Other" },
];

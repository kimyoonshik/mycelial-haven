// 쇼핑몰 거래 조건.
// 가격·크기·가공 조건·물량 기준은 src/content/data/commerce.json (운영 도구 CMS로 편집)에서 읽는다.
// 원가 모델·IR 자료의 단가와 일치하는지 확인 후 반영할 것.
//
// 판매 단위: 원단 장(piece). 장당 가격 = 면적(sqft) × 가공 조건별 sqft 단가 (priceOverrides 로 개별 지정 가능)
// 주문 경로
//   개인 주문(Retail):  정규원단 합계 최소~상한 sqft, 또는 샘플만 주문 → PayPal 즉시 결제
//   발주(PO Request):   정규원단 합계가 상한 초과, 또는 국내(한국) 구매자, 또는 기업 거래 조건 요청
//                       → 발주희망서 → 승인 인보이스 → 결제 → 원단 발송

import type { L } from "@/i18n/LanguageProvider";
import type { Commerce, ConditionId, Size } from "./schema";
import commerceData from "./data/commerce.json";

export const commerce = commerceData as Commerce;
export const CURRENCY = commerce.currency;
export const retail = commerce.retail;
export const seller = commerce.seller;
export const sizes: Size[] = commerce.sizes;
export const conditions = commerce.conditions;

// 한국 PayPal 계정끼리는 결제가 불가 (PayPal Korea 정책) → 국내 구매자는 발주·계좌이체 경로
export const DOMESTIC_COUNTRY = "KR";

// PayPal 클라이언트 ID는 빌드 환경변수로 주입한다 (.env: VITE_PAYPAL_CLIENT_ID=...)
// 비어 있으면 결제 버튼 대신 "PayPal 인보이스 요청"으로 동작한다.
export const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID ?? "";

// ---------- 크기·가격 ----------

export const SQFT_PER_M2 = 10.7639104;

export const sizeById = (id: string) => sizes.find((s) => s.id === id);

/** 원단 1장의 면적 (sqft, 소수 2자리) */
export const areaSqft = (s: Size) => round2(((s.widthCm * s.heightCm) / 10000) * SQFT_PER_M2);

/** 크기 표기: "150 × 100 cm" */
export const sizeDims = (s: Size) => `${s.widthCm} × ${s.heightCm} cm`;

/** 가공 조건 × 크기의 장당 가격 (USD) */
export const piecePrice = (condition: ConditionId, sizeId: string): number => {
  const override = commerce.priceOverrides[`${condition}:${sizeId}`];
  if (override !== undefined) return override;
  const size = sizeById(sizeId);
  const cond = conditions.find((c) => c.id === condition);
  if (!size || !cond) return 0;
  return round2(areaSqft(size) * cond.priceUSDPerSqft);
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

/** 품목 금액 합계에 배송비를 더한다 */
export const orderTotals = (itemTotalUSD: number, shippingUSD = retail.shippingUSD) => {
  const itemTotal = round2(itemTotalUSD);
  return { itemTotal, shipping: shippingUSD, total: round2(itemTotal + shippingUSD) };
};

export type OrderRoute = "empty" | "below-min" | "samples-over" | "retail" | "po-volume" | "po-domestic";

export interface OrderVolume {
  regularSqft: number; // 정규원단 면적 합계 (최소·상한 판단 기준)
  sampleCount: number; // 샘플 장수 (최소 물량 계산에서 제외)
}

/**
 * 주문 물량과 구매자 국가로 결제 경로를 결정한다.
 * - 샘플은 최소 물량 계산에서 제외하며, 샘플만 주문할 때는 장수 상한만 적용한다.
 * - 정규원단이 있으면 그 면적 합계가 최소 물량 이상이어야 한다.
 */
export const routeFor = ({ regularSqft, sampleCount }: OrderVolume, country: string | null): OrderRoute => {
  if (regularSqft === 0 && sampleCount === 0) return "empty";
  if (regularSqft > 0 && regularSqft < retail.minSqft) return "below-min";
  if (sampleCount > retail.sampleMaxPerOrder) return "samples-over";
  if (country === DOMESTIC_COUNTRY) return "po-domestic";
  if (regularSqft > retail.maxSqft) return "po-volume";
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

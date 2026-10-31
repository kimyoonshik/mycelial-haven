// Mycerra 쇼핑몰 카탈로그 — 데이터는 src/content/data/products.json (운영 도구 CMS로 편집).
// 가공 조건 4종(순수 / 엠보 적용 / 반응성염료 적용 / 최종 피니시 적용) × 원단 크기(샘플·정규 1~3).
// 실물 사진이 있는 품목만 "available", 나머지는 라인업 확정 전 자리(coming-soon)로 주문 불가.

import type { L } from "@/i18n/LanguageProvider";
import type { ConditionId, ProductData, Size } from "./schema";
import productsData from "./data/products.json";
import { conditions, piecePrice, retail, sizes } from "./commerce";
import { media } from "@/lib/media";

export type CategoryId = ConditionId;
// 쇼핑몰 카테고리 = 가공 조건 (commerce.json conditions)
export const categories = conditions;

export type ProductStatus = ProductData["status"];
export const comingSoonLabel: L = { en: "Coming soon", ko: "준비 중" };

export interface Product extends Omit<ProductData, "condition" | "sizes"> {
  category: CategoryId;
  sizes: Size[]; // 판매 크기 (지정이 없으면 전체)
}

export const products: Product[] = (productsData as ProductData[]).map(({ condition, sizes: only, ...p }) => ({
  ...p,
  image: media(p.image),
  category: condition,
  sizes: only ? sizes.filter((s) => only.includes(s.id)) : sizes,
}));

export const productBySku = (sku: string) => products.find((p) => p.sku === sku);

export const priceOf = (p: Product, sizeId: string) => piecePrice(p.category, sizeId);

/** 이 상품에서 가장 낮은 장당 가격 (목록의 "부터" 표시용) */
export const fromPrice = (p: Product) => Math.min(...p.sizes.map((s) => priceOf(p, s.id)));

// 상세 페이지 사양 — 확정 전 null ("문의"로 표시)
export const productSpecs: { label: L; value: L | null }[] = [
  { label: { en: "Thickness", ko: "두께" }, value: null },
  {
    label: { en: "Minimum order", ko: "최소 주문량" },
    value: {
      en: `${retail.minSqft} sqft of regular sheets per order (samples excluded)`,
      ko: `주문당 정규원단 ${retail.minSqft} sqft (샘플 제외)`,
    },
  },
  {
    label: { en: "Samples per order", ko: "주문당 샘플" },
    value: { en: `Up to ${retail.sampleMaxPerOrder} pieces`, ko: `최대 ${retail.sampleMaxPerOrder}장` },
  },
  { label: { en: "Lead time", ko: "리드타임" }, value: null },
  { label: { en: "Origin", ko: "원산지" }, value: { en: "Korea", ko: "대한민국" } },
];

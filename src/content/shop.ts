// Mycerra 쇼핑몰 카탈로그 — 데이터는 src/content/data/products.json (운영 도구 CMS로 편집).
// 가공 조건 4종(순수 / 엠보 적용 / 반응성염료 적용 / 최종 피니시 적용) × 정규원단 크기 1~3,
// 그리고 가공 조건별 스와치 브로셔(30×30 cm 10장 1세트, SKU SB-xx). 낱장 샘플은 판매하지 않는다.
// 실물 사진이 있는 품목만 "available", 나머지는 라인업 확정 전 자리(coming-soon)로 주문 불가.

import type { L } from "@/i18n/LanguageProvider";
import type { ConditionId, ProductData, Size } from "./schema";
import productsData from "./data/products.json";
import { conditions, piecePrice, regularSizes, retail, sizes } from "./commerce";
import { media } from "@/lib/media";

export type CategoryId = ConditionId;
// 쇼핑몰 카테고리 = 가공 조건 (commerce.json conditions)
export const categories = conditions;

export type ProductStatus = ProductData["status"];
export const comingSoonLabel: L = { en: "Coming soon", ko: "준비 중" };

export interface Product extends Omit<ProductData, "condition" | "sizes"> {
  category: CategoryId;
  sizes: Size[]; // 판매 크기 (지정이 없으면 정규원단 크기 전체)
}

export const isBrochure = (p: Product) => p.sizes.every((s) => s.kind === "brochure");

// 각 가공 조건 안에서 브로셔를 맨 앞에
export const products: Product[] = (productsData as ProductData[])
  .map(({ condition, sizes: only, ...p }) => ({
    ...p,
    image: media(p.image),
    category: condition,
    sizes: only ? sizes.filter((s) => only.includes(s.id)) : regularSizes,
  }))
  .sort((a, b) => Number(isBrochure(b)) - Number(isBrochure(a)));

/** 원단 상품만 (브로셔 제외) — 라인업 집계용 */
export const fabrics = products.filter((p) => !isBrochure(p));

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
      en: `${retail.minSqft} sqft of regular sheets per order (swatch brochures excluded)`,
      ko: `주문당 정규원단 ${retail.minSqft} sqft (스와치 브로셔 제외)`,
    },
  },
  {
    label: { en: "Swatch brochures", ko: "스와치 브로셔" },
    value: {
      en: `Sets of ten 30 × 30 cm swatches, up to ${retail.brochureMaxPerOrder} sets per order — no single swatches`,
      ko: `30 × 30 cm 스와치 10장 1세트, 주문당 최대 ${retail.brochureMaxPerOrder}세트 (낱장 판매 없음)`,
    },
  },
  { label: { en: "Lead time", ko: "리드타임" }, value: null },
  { label: { en: "Origin", ko: "원산지" }, value: { en: "Korea", ko: "대한민국" } },
];

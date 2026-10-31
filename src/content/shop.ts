// Mycerra 쇼핑몰 카탈로그.
// 4개 카테고리: 순수원단 / 순수원단+엠보(20) / 반응성염료 염색(20) / 최종 피니시(20).
// 실물 사진이 있는 품목만 "available", 나머지는 라인업 확정 전 자리(coming-soon)로 주문 불가.
// 가격(null)은 "가격 문의"로 표시되며, 단가가 확정되면 price 에 원화 정수(VAT 별도)를 넣는다.

import type { L } from "@/i18n/LanguageProvider";
import { expressions } from "./mycerra";

export type CategoryId = "pure" | "embossed" | "reactive" | "finished";

export const categories: { id: CategoryId; title: L; summary: L; target: number }[] = [
  {
    id: "pure",
    title: { en: "Pure Mycerra", ko: "순수원단" },
    summary: {
      en: "The material as grown and stabilized — unembossed, undyed pure mycelium mat.",
      ko: "배양·안정화만 거친 그대로의 소재 — 무엠보, 무염색 순수 균사 매트.",
    },
    target: 1,
  },
  {
    id: "embossed",
    title: { en: "Pure + Embossed", ko: "순수원단 + 엠보" },
    summary: {
      en: "Pure mycelium mat with embossed surface grains, undyed.",
      ko: "순수 균사 매트에 표면 엠보 그레인을 더한 무염색 원단.",
    },
    target: 20,
  },
  {
    id: "reactive",
    title: { en: "Reactive-dyed", ko: "반응성염료 염색" },
    summary: {
      en: "Coloured with reactive dyes only — no top finish, keeping the mat's natural handfeel.",
      ko: "반응성염료로만 염색 — 표면 마감 없이 매트 본연의 촉감을 유지.",
    },
    target: 20,
  },
  {
    id: "finished",
    title: { en: "Fully finished", ko: "최종 피니시" },
    summary: {
      en: "Dyed and top-finished, ready for cutting and product making.",
      ko: "염색과 표면 마감까지 완료되어 재단·제품 생산에 바로 쓰는 원단.",
    },
    target: 20,
  },
];

export type ProductStatus = "available" | "coming-soon";

export const comingSoonLabel: L = { en: "Coming soon", ko: "준비 중" };
export type OrderFormat = "swatch" | "sheet";

export const formatLabel: Record<OrderFormat, L> = {
  swatch: { en: "Swatch", ko: "스와치" },
  sheet: { en: "Full sheet", ko: "풀시트" },
};

export interface Product {
  sku: string;
  category: CategoryId;
  name: string;
  libraryCode?: string; // 소재 라이브러리(/mycerra) 코드와 연결
  image?: string;
  description: L;
  status: ProductStatus;
  price: Record<OrderFormat, number | null>;
}

const noPrice = { swatch: null, sheet: null };
const fromLibrary = (code: string) => {
  const e = expressions.find((x) => x.code === code);
  if (!e) throw new Error(`Unknown library code ${code}`);
  return { name: e.name, libraryCode: e.code, image: e.image, description: e.description };
};

// 라인업 확정 전 자리 채우기. 확정되면 해당 항목을 실제 데이터로 교체한다.
const placeholders = (category: CategoryId, prefix: string, from: number, to: number, label: L): Product[] =>
  Array.from({ length: to - from + 1 }, (_, i) => {
    const n = String(from + i).padStart(2, "0");
    return {
      sku: `${prefix}-${n}`,
      category,
      name: `${label.en} ${n}`,
      description: { en: `${label.en} ${n} — in development.`, ko: `${label.ko} ${n} — 개발 중.` },
      status: "coming-soon" as const,
      price: noPrice,
    };
  });

export const products: Product[] = [
  // 순수원단
  { sku: "PU-01", category: "pure", ...fromLibrary("PM-00"), status: "available", price: noPrice },

  // 순수원단 + 엠보 (20)
  { sku: "EM-01", category: "embossed", ...fromLibrary("CR-03"), status: "available", price: noPrice },
  { sku: "EM-02", category: "embossed", ...fromLibrary("MC-06"), status: "available", price: noPrice },
  { sku: "EM-03", category: "embossed", ...fromLibrary("MC-08"), status: "available", price: noPrice },
  { sku: "EM-04", category: "embossed", ...fromLibrary("HP-03"), status: "available", price: noPrice },
  ...placeholders("embossed", "EM", 5, 20, { en: "Emboss pattern", ko: "엠보 패턴" }),

  // 반응성염료 염색 (20)
  // TODO(CTO 확인): 아래 6색은 사이트에 "3회 염색"으로만 표기됨 — 반응성염료 단독(무마감)인지 확인 후 분류 확정
  { sku: "RD-01", category: "reactive", ...fromLibrary("MN-02"), status: "available", price: noPrice },
  { sku: "RD-02", category: "reactive", ...fromLibrary("BG-05"), status: "available", price: noPrice },
  { sku: "RD-03", category: "reactive", ...fromLibrary("SR-07"), status: "available", price: noPrice },
  { sku: "RD-04", category: "reactive", ...fromLibrary("BW-01"), status: "available", price: noPrice },
  { sku: "RD-05", category: "reactive", ...fromLibrary("IB-06"), status: "available", price: noPrice },
  { sku: "RD-06", category: "reactive", ...fromLibrary("MR-08"), status: "available", price: noPrice },
  ...placeholders("reactive", "RD", 7, 20, { en: "Reactive colour", ko: "반응성 컬러" }),

  // 최종 피니시 (20)
  { sku: "FN-01", category: "finished", ...fromLibrary("MG-02"), status: "available", price: noPrice },
  ...placeholders("finished", "FN", 2, 20, { en: "Finished leather", ko: "피니시 원단" }),
];

export const productBySku = (sku: string) => products.find((p) => p.sku === sku);

// 상세 페이지 사양 — 확정 전 null ("문의"로 표시)
export const productSpecs: { label: L; value: L | null }[] = [
  { label: { en: "Thickness", ko: "두께" }, value: null },
  { label: { en: "Sheet size", ko: "시트 규격" }, value: null },
  { label: { en: "Swatch size", ko: "스와치 규격" }, value: null },
  { label: { en: "Minimum order", ko: "최소 주문량" }, value: null },
  { label: { en: "Lead time", ko: "리드타임" }, value: null },
  { label: { en: "Origin", ko: "원산지" }, value: { en: "Korea", ko: "대한민국" } },
];

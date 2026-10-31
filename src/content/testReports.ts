// Mycerra 성능지표 성적서 데이터 — 현재는 표시 자리만 마련한 상태.
// 시험 성적서를 받으면 result / lab / reportDate / reportUrl 을 채운다.
// 시험법은 피혁 물성 평가의 일반적 ISO 기준(안)이며, 실제 의뢰 시험법과 다르면 method 를 수정한다.
// reportUrl 은 public/ 아래 PDF 경로(예: "/reports/tensile-2026.pdf") 또는 외부 URL.

import type { L } from "@/i18n/LanguageProvider";

export type TestGroup = "physical" | "colour" | "comfort";

export const testGroupLabel: Record<TestGroup, L> = {
  physical: { en: "Physical properties", ko: "물리적 특성" },
  colour: { en: "Colour fastness", ko: "염색 견뢰도" },
  comfort: { en: "Comfort & composition", ko: "쾌적성·소재 구성" },
};

export interface TestItem {
  id: string;
  group: TestGroup;
  name: L;
  method: string;
  unit: string;
  result: string | null;
  lab: string | null;
  reportDate: string | null; // YYYY-MM-DD
  reportUrl: string | null;
}

const pending = { result: null, lab: null, reportDate: null, reportUrl: null };

export const testItems: TestItem[] = [
  { id: "thickness", group: "physical", name: { en: "Thickness", ko: "두께" }, method: "ISO 2589", unit: "mm", ...pending },
  { id: "density", group: "physical", name: { en: "Apparent density", ko: "겉보기 밀도" }, method: "ISO 2420", unit: "g/cm³", ...pending },
  { id: "tensile", group: "physical", name: { en: "Tensile strength", ko: "인장강도" }, method: "ISO 3376", unit: "N/mm²", ...pending },
  { id: "elongation", group: "physical", name: { en: "Elongation at break", ko: "파단 신율" }, method: "ISO 3376", unit: "%", ...pending },
  { id: "tear", group: "physical", name: { en: "Tear strength (double edge)", ko: "인열강도 (이중 가장자리)" }, method: "ISO 3377-2", unit: "N", ...pending },
  { id: "stitch-tear", group: "physical", name: { en: "Stitch tear strength", ko: "봉합 인열강도" }, method: "ISO 23910", unit: "N", ...pending },
  { id: "flex", group: "physical", name: { en: "Flex resistance (Bally)", ko: "내굴곡성 (Bally)" }, method: "ISO 5402-1", unit: "cycles", ...pending },
  { id: "abrasion", group: "physical", name: { en: "Abrasion resistance (Martindale)", ko: "내마모성 (마틴데일)" }, method: "ISO 17076-2", unit: "cycles", ...pending },
  { id: "rub-fastness", group: "colour", name: { en: "Colour fastness to rubbing (dry / wet)", ko: "마찰 견뢰도 (건/습)" }, method: "ISO 11640", unit: "grade 1–5", ...pending },
  { id: "light-fastness", group: "colour", name: { en: "Colour fastness to light", ko: "일광 견뢰도" }, method: "ISO 105-B02", unit: "grade 1–8", ...pending },
  { id: "wvp", group: "comfort", name: { en: "Water vapour permeability", ko: "투습도" }, method: "ISO 14268", unit: "mg/cm²·h", ...pending },
  { id: "biobased", group: "comfort", name: { en: "Bio-based carbon content", ko: "바이오 기반 탄소 함량" }, method: "ASTM D6866", unit: "%", ...pending },
];

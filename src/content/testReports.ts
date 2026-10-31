// Mycerra 성능지표 성적서 — 데이터는 src/content/data/test-reports.json (운영 도구 CMS로 편집).
// 시험 성적서를 받으면 result / lab / reportDate / reportUrl 을 채운다.
// 시험법은 피혁 물성 평가의 일반적 ISO 기준(안)이며, 실제 의뢰 시험법과 다르면 method 를 수정한다.
// reportUrl 은 /media/reports/파일.pdf (CMS로 업로드) 또는 외부 https URL.

import type { L } from "@/i18n/LanguageProvider";
import type { TestItemData } from "./schema";
import testData from "./data/test-reports.json";

export type TestGroup = TestItemData["group"];
export type TestItem = TestItemData;

export const testGroupLabel: Record<TestGroup, L> = {
  physical: { en: "Physical properties", ko: "물리적 특성" },
  colour: { en: "Colour fastness", ko: "염색 견뢰도" },
  comfort: { en: "Comfort & composition", ko: "쾌적성·소재 구성" },
};

export const testItems = testData as TestItem[];

// MYCERRA 공통 콘텐츠 (영문/한글).
// 문구·사진·수치는 src/content/data/site.json 의 shared 에서 읽는다 → 운영 도구(CMS) "페이지" 탭 › 공통 콘텐츠에서 편집.
// 문구·수치는 saveearth.kr에 게시된 내용만 사용하며, 원가 모델·IR 자료와 수치 일치를 확인한 뒤 바꾼다.
// `null` 값은 내부 확정 전 항목이며 화면에는 "On request / 문의"로 표시된다.
// 이 파일에 남은 것은 화면 구성용 고정값(소재 계열 이름, 문의 유형)뿐이다.

import type { L } from "@/i18n/LanguageProvider";
import newsData from "./data/news.json";
import siteData from "./data/site.json";
import { media } from "@/lib/media";

const shared = siteData.shared;

export const company = {
  name: "SAVE EARTH Inc.",
  brand: "Mycerra™",
  email: "contact@saveearth.kr",
  origin: shared.footer.origin as L,
};

export const footerCopy = shared.footer as { line1: L; line2: L; origin: L };

// ---------- 소재 라이브러리 (Polybion "One material, multiple expressions") ----------

export type FinishFamily = "Grain" | "Embossed" | "Natural" | "Dyed";

export const familyLabel: Record<FinishFamily | "All", L> = {
  All: { en: "All", ko: "전체" },
  Grain: { en: "Grain", ko: "그레인" },
  Embossed: { en: "Embossed", ko: "엠보" },
  Natural: { en: "Natural", ko: "내추럴" },
  Dyed: { en: "Dyed", ko: "염색" },
};

export interface Expression {
  code: string;
  name: string; // 소재명은 브랜드 자산이므로 언어와 무관하게 유지
  family: FinishFamily;
  description: L;
  image: string;
  accent: string; // 섹션 배경 등에 쓰는 대표 색
}

export const expressions: Expression[] = (shared.expressions as Expression[]).map((e) => ({ ...e, image: media(e.image) }));

export const finishingOptions: L[] = shared.finishingOptions;

// ---------- 성능 특성 ----------

export const features: { title: L; body: L }[] = shared.features;

// ---------- 임팩트 수치와 근거 문서 상태 (Notpla 방식: 주장마다 근거 연결) ----------

export type ProofStatus = "published" | "in-preparation";

export interface Claim {
  value: string;
  label: L;
  detail: L;
  proof: { title: L; status: ProofStatus; href?: string };
}

export const claims = shared.claims as Claim[];

export const traceability = shared.traceability as { title: L; body: L; proof: { title: L; status: ProofStatus } };

// ---------- 공정 (배양 → 안정화 → 마감) ----------
// 가소화 공정 세부(시약·조건)는 특허 출원 전 비공개 — 단계명과 목적만 기술한다.

export interface ProcessStep {
  no: string;
  id: "cultivate" | "stabilize" | "finish";
  title: L;
  body: L;
  image: string;
}

export const processSteps: ProcessStep[] = (shared.processSteps as ProcessStep[]).map((s) => ({ ...s, image: media(s.image) }));

// ---------- 거래 조건 (Polybion "How to Work with") ----------

export const workSpecs = shared.workSpecs as { label: L; value: L | null }[];

export const downloads = shared.downloads as { title: L; status: ProofStatus }[];

// ---------- 컬렉션 / 소식 ----------

export const collections: { title: string; body: L; image: string }[] = shared.collections.map((c) => ({
  ...c,
  image: media(c.image),
}));

// 소식 — 운영 도구(CMS)로 편집하는 src/content/data/news.json
export const news: { id: string; tag: L; title: L; meta: L }[] = newsData;

export const futurePlatform: { title: L; body: L }[] = shared.futurePlatform;

// ---------- 문의 유형 (Modern Synthesis: 대상별 진입점) ----------

export const inquiryTypes = [
  {
    id: "brand",
    label: { en: "Brand / Designer", ko: "브랜드 / 디자이너" },
    hint: { en: "Swatches, collections, co-development", ko: "스와치, 컬렉션, 공동 개발" },
  },
  {
    id: "manufacturer",
    label: { en: "Tannery / Finisher / Manufacturer", ko: "제혁 / 후가공 / 제조사" },
    hint: { en: "Processing trials, supply partnership", ko: "가공 테스트, 공급 파트너십" },
  },
  {
    id: "investor",
    label: { en: "Investor", ko: "투자자" },
    hint: { en: "Investment and strategic partnership", ko: "투자 및 전략적 제휴" },
  },
  {
    id: "press",
    label: { en: "Press", ko: "언론" },
    hint: { en: "Interviews, images, press kit", ko: "인터뷰, 이미지, 보도자료" },
  },
  { id: "other", label: { en: "Other", ko: "기타" }, hint: { en: "Anything else", ko: "그 외 문의" } },
] as const satisfies readonly { id: string; label: L; hint: L }[];

export type InquiryTypeId = (typeof inquiryTypes)[number]["id"];

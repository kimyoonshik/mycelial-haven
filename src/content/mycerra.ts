// MYCERRA 사이트 콘텐츠 단일 소스 (영문/한글).
// 문구·수치는 saveearth.kr에 게시된 내용만 사용한다.
// `null` 값은 내부 확정 전 항목이며 화면에는 "On request / 문의"로 표시된다.
// 확정 시 이 파일만 수정하면 전 페이지에 반영된다 (원가 모델·IR 자료와 수치 일치 확인 필수).

import type { L } from "@/i18n/LanguageProvider";
import finishMocha from "@/assets/mycerra/finish-mocha-grain-02.webp";
import finishMarble06 from "@/assets/mycerra/finish-marble-caviar-06.webp";
import finishCroc from "@/assets/mycerra/finish-crocodile-03.webp";
import finishMarble08 from "@/assets/mycerra/finish-marble-caviar-08.webp";
import finishPebble from "@/assets/mycerra/finish-hypha-pebble-03.webp";
import finishPure from "@/assets/mycerra/finish-pure.webp";
import colorNavy from "@/assets/mycerra/color-midnight-navy-02.webp";
import colorBurgundy from "@/assets/mycerra/color-burgundy-05.webp";
import colorScarlet from "@/assets/mycerra/color-scarlet-red-07.webp";
import colorBone from "@/assets/mycerra/color-bone-white-01.webp";
import colorIce from "@/assets/mycerra/color-ice-blue-06.webp";
import colorMarigold from "@/assets/mycerra/color-marigold-08.webp";
import productSatchel from "@/assets/mycerra/product-flap-satchel.webp";
import productMessenger from "@/assets/mycerra/product-urban-messenger.webp";
import productWallet from "@/assets/mycerra/product-truffle-wallet.webp";
import productTote from "@/assets/mycerra/product-ivory-marble-tote.webp";

export const company = {
  name: "SAVE EARTH Inc.",
  brand: "Mycerra™",
  email: "contact@saveearth.kr",
  origin: {
    en: "Cultivated in controlled facilities in Korea",
    ko: "국내 통제 시설에서 배양",
  } as L,
};

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

const dyedThreeTimes: L = { en: "Pure mycelium mat, dyed three times.", ko: "순수 균사 매트, 3회 염색." };
const embossedUndyed = (en: string, ko: string): L => ({
  en: `Pure mycelium mat — ${en} embossed, undyed.`,
  ko: `순수 균사 매트 — ${ko} 엠보, 무염색.`,
});

export const expressions: Expression[] = [
  {
    code: "MG-02",
    name: "Mocha Grain",
    family: "Grain",
    description: { en: "Aniline-finished pure mycelium mat.", ko: "아닐린 마감 순수 균사 매트." },
    image: finishMocha,
    accent: "#4a2a1c",
  },
  { code: "CR-03", name: "Crocodile", family: "Embossed", description: embossedUndyed("crocodile", "크로커다일"), image: finishCroc, accent: "#c9bfa6" },
  { code: "MC-06", name: "Marble Caviar", family: "Embossed", description: embossedUndyed("Marble Caviar", "마블 캐비어"), image: finishMarble06, accent: "#cfc6b4" },
  { code: "MC-08", name: "Marble Caviar", family: "Embossed", description: embossedUndyed("Marble Caviar", "마블 캐비어"), image: finishMarble08, accent: "#c7b48c" },
  { code: "HP-03", name: "Hypha Pebble", family: "Embossed", description: embossedUndyed("Hypha Pebble", "하이파 페블"), image: finishPebble, accent: "#d8d4c8" },
  {
    code: "PM-00",
    name: "Pure Mycerra",
    family: "Natural",
    description: { en: "Pure mycelium mat — unembossed, undyed.", ko: "순수 균사 매트 — 무엠보, 무염색." },
    image: finishPure,
    accent: "#dcd6c8",
  },
  { code: "MN-02", name: "Midnight Navy", family: "Dyed", description: dyedThreeTimes, image: colorNavy, accent: "#1b2233" },
  { code: "BG-05", name: "Burgundy", family: "Dyed", description: dyedThreeTimes, image: colorBurgundy, accent: "#4b1420" },
  { code: "SR-07", name: "Scarlet Red", family: "Dyed", description: dyedThreeTimes, image: colorScarlet, accent: "#b3121c" },
  { code: "BW-01", name: "Bone White", family: "Dyed", description: dyedThreeTimes, image: colorBone, accent: "#e6e2d8" },
  { code: "IB-06", name: "Ice Blue", family: "Dyed", description: dyedThreeTimes, image: colorIce, accent: "#7fb3c2" },
  { code: "MR-08", name: "Marigold", family: "Dyed", description: dyedThreeTimes, image: colorMarigold, accent: "#d9741f" },
];

export const finishingOptions: L[] = [
  { en: "Aniline-style finishing", ko: "아닐린 스타일 마감" },
  {
    en: "Embossed surface grains (Crocodile, Micro-Pebble, Marble Caviar)",
    ko: "표면 엠보 그레인 (크로커다일, 마이크로 페블, 마블 캐비어)",
  },
  { en: "Undyed pure mycelium surface", ko: "무염색 순수 균사 표면" },
  { en: "Tint and tone-on-tone colour finishing — in development", ko: "틴트 및 톤온톤 컬러 마감 — 개발 중" },
];

// ---------- 성능 특성 ----------

export const features: { title: L; body: L }[] = [
  {
    title: { en: "Pure mycelium structure", ko: "순수 균사 구조" },
    body: {
      en: "No textile or polymeric backing — a self-supporting mat cultivated entirely from mycelium.",
      ko: "섬유·고분자 배접 없이, 오직 균사로만 배양한 자립형 매트입니다.",
    },
  },
  {
    title: { en: "Leather-grade performance", ko: "가죽 수준의 성능" },
    body: {
      en: "Naturally strong, flexible, and shavable — comparable to premium hides.",
      ko: "본래 강하고 유연하며 쉐이빙이 가능해 프리미엄 원피에 견줄 만합니다.",
    },
  },
  {
    title: { en: "Process stability", ko: "공정 안정성" },
    body: {
      en: "Uniform growth under ambient conditions ensures scalability and industrial consistency.",
      ko: "상온 조건에서의 균일한 생장으로 확장성과 산업적 일관성을 확보합니다.",
    },
  },
  {
    title: { en: "Finishing versatility", ko: "다양한 마감 대응" },
    body: {
      en: "Supports aniline-style, embossed, or undyed natural surface options.",
      ko: "아닐린 스타일, 엠보, 무염색 내추럴 표면을 모두 지원합니다.",
    },
  },
];

// ---------- 임팩트 수치와 근거 문서 상태 (Notpla 방식: 주장마다 근거 연결) ----------

export type ProofStatus = "published" | "in-preparation";

export interface Claim {
  value: string;
  label: L;
  detail: L;
  proof: { title: L; status: ProofStatus; href?: string };
}

export const claims: Claim[] = [
  {
    value: "−92%",
    label: { en: "Carbon", ko: "탄소" },
    detail: {
      en: "Greenhouse-gas emissions compared with conventional animal leather manufacturing.",
      ko: "기존 동물 가죽 제조 대비 온실가스 배출량.",
    },
    proof: { title: { en: "Life Cycle Assessment", ko: "전과정평가(LCA)" }, status: "in-preparation" },
  },
  {
    value: "99%",
    label: { en: "Less water", ko: "물 절감" },
    detail: {
      en: "Up to 99% less water than conventional methods, with no animal inputs.",
      ko: "기존 공정 대비 최대 99% 적은 물 사용, 동물성 원료 무투입.",
    },
    proof: { title: { en: "Water footprint report", ko: "물 발자국 보고서" }, status: "in-preparation" },
  },
  {
    value: "0%",
    label: { en: "Plastic", ko: "플라스틱" },
    detail: {
      en: "No synthetic polymers, non-woven backings, scaffolds or composite layers.",
      ko: "합성 고분자, 부직포 배접, 지지체, 복합 레이어를 쓰지 않습니다.",
    },
    proof: { title: { en: "Material composition statement", ko: "소재 구성 확인서" }, status: "in-preparation" },
  },
  {
    value: "100%",
    label: { en: "Compostable", ko: "퇴비화" },
    detail: { en: "Fully biodegradable at end of life.", ko: "사용 후 완전 생분해." },
    proof: { title: { en: "Biodegradation test report", ko: "생분해도 시험 성적서" }, status: "in-preparation" },
  },
];

export const traceability = {
  title: { en: "Traceability and EUDR", ko: "원산지 추적과 EUDR" } as L,
  body: {
    en: "Mycerra is cultivated in controlled facilities in Korea, independent from livestock, grazing land, or feed crops. This eliminates deforestation risk and aligns with the EU Deforestation Regulation (EUDR) for due diligence and traceability. Every batch is digitally documented and origin-tracked.",
    ko: "Mycerra는 가축·방목지·사료작물과 무관하게 국내 통제 시설에서 배양됩니다. 산림파괴 위험이 없으며, 실사와 추적성 측면에서 EU 산림파괴방지규정(EUDR)에 부합합니다. 모든 배치는 디지털로 기록되고 원산지가 추적됩니다.",
  } as L,
  proof: { title: { en: "EUDR due-diligence statement", ko: "EUDR 실사 확인서" } as L, status: "in-preparation" as ProofStatus },
};

// ---------- 공정 (배양 → 안정화 → 마감) ----------
// 가소화 공정 세부(시약·조건)는 특허 출원 전 비공개 — 단계명과 목적만 기술한다.

export const processSteps: { no: string; id: "cultivate" | "stabilize" | "finish"; title: L; body: L }[] = [
  {
    no: "01",
    id: "cultivate",
    title: { en: "Cultivate", ko: "배양" },
    body: {
      en: "Mycelium is grown into a continuous, self-supporting mat in controlled facilities in Korea — no backing fabric, no scaffold, no foreign substrate in the final material.",
      ko: "국내 통제 시설에서 균사를 연속된 자립형 매트로 키웁니다. 최종 소재에는 배접 원단도, 지지체도, 이물 기재도 없습니다.",
    },
  },
  {
    no: "02",
    id: "stabilize",
    title: { en: "Stabilize", ko: "안정화" },
    body: {
      en: "Where hides are tanned, Mycerra™ is stabilized. A proprietary process turns the cultivated mat into a durable material, defining its strength, flexibility and handfeel.",
      ko: "원피를 무두질하듯, Mycerra™는 안정화합니다. 독자 공정으로 배양 매트를 내구성 있는 소재로 바꾸며 강도·유연성·핸드필을 결정합니다.",
    },
  },
  {
    no: "03",
    id: "finish",
    title: { en: "Finish", ko: "마감" },
    body: {
      en: "Like premium hides, Mycerra™ takes aniline dyeing, embossing and protective finishing — from a raw natural surface to deep, three-times-dyed colour.",
      ko: "프리미엄 원피처럼 아닐린 염색, 엠보, 보호 마감을 할 수 있습니다. 무가공 내추럴 표면부터 3회 염색한 깊은 색까지 구현합니다.",
    },
  },
];

// ---------- 거래 조건 (Polybion "How to Work with") ----------

export const workSpecs: { label: L; value: L | null }[] = [
  {
    label: { en: "Formats", ko: "공급 형태" },
    value: { en: "Swatch kit · Full sheets · Custom development", ko: "스와치 키트 · 풀시트 · 맞춤 개발" },
  },
  { label: { en: "Sheet size", ko: "시트 규격" }, value: null },
  { label: { en: "Thickness range", ko: "두께 범위" }, value: null },
  { label: { en: "Minimum order — prototyping", ko: "최소 주문량 — 시제품" }, value: null },
  { label: { en: "Minimum order — custom colour/finish", ko: "최소 주문량 — 맞춤 컬러·마감" }, value: null },
  { label: { en: "Lead time", ko: "리드타임" }, value: null },
  { label: { en: "Shipping", ko: "배송" }, value: { en: "Worldwide from Korea", ko: "한국에서 전 세계 배송" } },
];

export const downloads: { title: L; status: ProofStatus }[] = [
  { title: { en: "Technical Data Sheet", ko: "기술자료(TDS)" }, status: "in-preparation" },
  { title: { en: "Life Cycle Assessment", ko: "전과정평가(LCA)" }, status: "in-preparation" },
  { title: { en: "Material Swatch Card", ko: "소재 스와치 카드" }, status: "in-preparation" },
];

// ---------- 컬렉션 / 소식 ----------

export const collections: { title: string; body: L; image: string }[] = [
  {
    title: "Mycerra Flap Satchel",
    body: {
      en: "Handcrafted from pure mycelium mat, marble-finished to accentuate natural veining and organic texture.",
      ko: "순수 균사 매트로 수작업 제작. 마블 마감으로 자연스러운 결과 유기적 질감을 살렸습니다.",
    },
    image: productSatchel,
  },
  {
    title: "Mycerra Urban Messenger",
    body: {
      en: "Handcrafted from aniline-finished pure Mycerra mat, emphasizing tonal richness and smooth surface texture.",
      ko: "아닐린 마감 순수 Mycerra 매트로 수작업 제작. 풍부한 톤과 매끄러운 표면이 특징입니다.",
    },
    image: productMessenger,
  },
  {
    title: "Mycerra Truffle Long Wallet",
    body: {
      en: "Handcrafted from aniline-finished pure Mycerra mat, featuring refined surface sheen and tactile softness.",
      ko: "아닐린 마감 순수 Mycerra 매트로 수작업 제작. 은은한 광택과 부드러운 촉감이 특징입니다.",
    },
    image: productWallet,
  },
  {
    title: "Mycerra Ivory Marble Tote",
    body: {
      en: "Handcrafted from pure mycelium mat, marble-finished to accentuate natural veining and organic texture.",
      ko: "순수 균사 매트로 수작업 제작. 마블 마감으로 자연스러운 결과 유기적 질감을 살렸습니다.",
    },
    image: productTote,
  },
];

export const news: { tag: L; title: L; meta: L }[] = [
  {
    tag: { en: "Exhibition", ko: "전시" },
    title: { en: "Mycerra at LINEAPELLE Milan", ko: "LINEAPELLE 밀라노 참가" },
    meta: { en: "Fiera Milano Rho · February 2026", ko: "피에라 밀라노 로 · 2026년 2월" },
  },
  {
    tag: { en: "Broadcast", ko: "방송" },
    title: { en: "EBS Extreme Jobs", ko: "EBS 극한직업" },
    meta: { en: "A story of biomaterial innovation through mycelium", ko: "균사로 만드는 바이오소재 혁신 이야기" },
  },
  {
    tag: { en: "Broadcast", ko: "방송" },
    title: { en: "National Assembly Broadcasting", ko: "국회방송" },
    meta: { en: "Exploring the science and craftsmanship behind Mycerra", ko: "Mycerra에 담긴 과학과 장인정신" },
  },
];

export const futurePlatform: { title: L; body: L }[] = [
  {
    title: { en: "Mycelium foams", ko: "균사 폼" },
    body: { en: "Biodegradable replacements for Styrofoam and packaging.", ko: "스티로폼과 포장재를 대체하는 생분해 소재." },
  },
  {
    title: { en: "Mycelium protein", ko: "균사 단백질" },
    body: { en: "A sustainable resource for food and biomaterials.", ko: "식품과 바이오소재를 위한 지속가능한 자원." },
  },
  {
    title: { en: "Architectural composites", ko: "건축용 복합재" },
    body: { en: "Lightweight panels for interiors and construction.", ko: "인테리어·건축용 경량 패널." },
  },
];

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

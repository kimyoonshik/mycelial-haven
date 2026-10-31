// MYCERRA 사이트 콘텐츠 단일 소스.
// 문구·수치는 saveearth.kr에 게시된 내용만 사용한다.
// `null` 값은 내부 확정 전 항목이며 화면에는 "On request"로 표시된다.
// 확정 시 이 파일만 수정하면 전 페이지에 반영된다 (원가 모델·IR 자료와 수치 일치 확인 필수).

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
  origin: "Cultivated in controlled facilities in Korea",
};

// ---------- 소재 라이브러리 (Polybion "One material, multiple expressions") ----------

export type FinishFamily = "Grain" | "Embossed" | "Natural" | "Dyed";

export interface Expression {
  code: string;
  name: string;
  family: FinishFamily;
  description: string;
  image: string;
  accent: string; // 섹션 배경 등에 쓰는 대표 색
}

export const expressions: Expression[] = [
  {
    code: "MG-02",
    name: "Mocha Grain",
    family: "Grain",
    description: "Aniline-finished pure mycelium mat.",
    image: finishMocha,
    accent: "#4a2a1c",
  },
  {
    code: "CR-03",
    name: "Crocodile",
    family: "Embossed",
    description: "Pure mycelium mat — crocodile embossed, undyed.",
    image: finishCroc,
    accent: "#c9bfa6",
  },
  {
    code: "MC-06",
    name: "Marble Caviar",
    family: "Embossed",
    description: "Pure mycelium mat — Marble Caviar embossed, undyed.",
    image: finishMarble06,
    accent: "#cfc6b4",
  },
  {
    code: "MC-08",
    name: "Marble Caviar",
    family: "Embossed",
    description: "Pure mycelium mat — Marble Caviar embossed, undyed.",
    image: finishMarble08,
    accent: "#c7b48c",
  },
  {
    code: "HP-03",
    name: "Hypha Pebble",
    family: "Embossed",
    description: "Pure mycelium mat — Hypha Pebble embossed, undyed.",
    image: finishPebble,
    accent: "#d8d4c8",
  },
  {
    code: "PM-00",
    name: "Pure Mycerra",
    family: "Natural",
    description: "Pure mycelium mat — unembossed, undyed.",
    image: finishPure,
    accent: "#dcd6c8",
  },
  {
    code: "MN-02",
    name: "Midnight Navy",
    family: "Dyed",
    description: "Pure mycelium mat, dyed three times.",
    image: colorNavy,
    accent: "#1b2233",
  },
  {
    code: "BG-05",
    name: "Burgundy",
    family: "Dyed",
    description: "Pure mycelium mat, dyed three times.",
    image: colorBurgundy,
    accent: "#4b1420",
  },
  {
    code: "SR-07",
    name: "Scarlet Red",
    family: "Dyed",
    description: "Pure mycelium mat, dyed three times.",
    image: colorScarlet,
    accent: "#b3121c",
  },
  {
    code: "BW-01",
    name: "Bone White",
    family: "Dyed",
    description: "Pure mycelium mat, dyed three times.",
    image: colorBone,
    accent: "#e6e2d8",
  },
  {
    code: "IB-06",
    name: "Ice Blue",
    family: "Dyed",
    description: "Pure mycelium mat, dyed three times.",
    image: colorIce,
    accent: "#7fb3c2",
  },
  {
    code: "MR-08",
    name: "Marigold",
    family: "Dyed",
    description: "Pure mycelium mat, dyed three times.",
    image: colorMarigold,
    accent: "#d9741f",
  },
];

export const finishingOptions = [
  "Aniline-style finishing",
  "Embossed surface grains (Crocodile, Micro-Pebble, Marble Caviar)",
  "Undyed pure mycelium surface",
  "Tint and tone-on-tone color finishing — in development",
];

// ---------- 성능 특성 ----------

export const features = [
  {
    title: "Pure mycelium structure",
    body: "No textile or polymeric backing — a self-supporting mat cultivated entirely from mycelium.",
  },
  {
    title: "Leather-grade performance",
    body: "Naturally strong, flexible, and shavable — comparable to premium hides.",
  },
  {
    title: "Process stability",
    body: "Uniform growth under ambient conditions ensures scalability and industrial consistency.",
  },
  {
    title: "Finishing versatility",
    body: "Supports aniline-style, embossed, or undyed natural surface options.",
  },
];

// ---------- 임팩트 수치와 근거 문서 상태 (Notpla 방식: 주장마다 근거 연결) ----------

export type ProofStatus = "published" | "in-preparation";

export interface Claim {
  value: string;
  label: string;
  detail: string;
  proof: { title: string; status: ProofStatus; href?: string };
}

export const claims: Claim[] = [
  {
    value: "−92%",
    label: "Carbon",
    detail: "Greenhouse-gas emissions compared with conventional animal leather manufacturing.",
    proof: { title: "Life Cycle Assessment", status: "in-preparation" },
  },
  {
    value: "99%",
    label: "Less water",
    detail: "Up to 99% less water than conventional methods, with no animal inputs.",
    proof: { title: "Water footprint report", status: "in-preparation" },
  },
  {
    value: "0%",
    label: "Plastic",
    detail: "No synthetic polymers, non-woven backings, scaffolds or composite layers.",
    proof: { title: "Material composition statement", status: "in-preparation" },
  },
  {
    value: "100%",
    label: "Compostable",
    detail: "Fully biodegradable at end of life.",
    proof: { title: "Biodegradation test report", status: "in-preparation" },
  },
];

export const traceability = {
  title: "Traceability and EUDR",
  body: "Mycerra is cultivated in controlled facilities in Korea, independent from livestock, grazing land, or feed crops. This eliminates deforestation risk and aligns with the EU Deforestation Regulation (EUDR) for due diligence and traceability. Every batch is digitally documented and origin-tracked.",
  proof: { title: "EUDR due-diligence statement", status: "in-preparation" as ProofStatus },
};

// ---------- 공정 (Polybion: 배양 → 안정화 → 마감) ----------
// 가소화 공정 세부(시약·조건)는 특허 출원 전 비공개 — 단계명과 목적만 기술한다.

export const processSteps = [
  {
    no: "01",
    title: "Cultivate",
    body: "Mycelium is grown into a continuous, self-supporting mat in controlled facilities in Korea — no backing fabric, no scaffold, no foreign substrate in the final material.",
  },
  {
    no: "02",
    title: "Stabilize",
    body: "Where hides are tanned, Mycerra™ is stabilized. A proprietary process turns the cultivated mat into a durable material, defining its strength, flexibility and handfeel.",
  },
  {
    no: "03",
    title: "Finish",
    body: "Like premium hides, Mycerra™ takes aniline dyeing, embossing and protective finishing — from a raw natural surface to deep, three-times-dyed colour.",
  },
];

// ---------- 거래 조건 (Polybion "How to Work with") ----------

export interface WorkSpec {
  label: string;
  value: string | null;
}

export const workSpecs: WorkSpec[] = [
  { label: "Formats", value: "Swatch kit · Full sheets · Custom development" },
  { label: "Sheet size", value: null },
  { label: "Thickness range", value: null },
  { label: "Minimum order — prototyping", value: null },
  { label: "Minimum order — custom colour/finish", value: null },
  { label: "Lead time", value: null },
  { label: "Shipping", value: "Worldwide from Korea" },
];

export const downloads = [
  { title: "Technical Data Sheet", status: "in-preparation" as ProofStatus },
  { title: "Life Cycle Assessment", status: "in-preparation" as ProofStatus },
  { title: "Material Swatch Card", status: "in-preparation" as ProofStatus },
];

// ---------- 컬렉션 / 스토리 ----------

export const collections = [
  {
    title: "Mycerra Flap Satchel",
    body: "Handcrafted from pure mycelium mat, marble-finished to accentuate natural veining and organic texture.",
    image: productSatchel,
  },
  {
    title: "Mycerra Urban Messenger",
    body: "Handcrafted from aniline-finished pure Mycerra mat, emphasizing tonal richness and smooth surface texture.",
    image: productMessenger,
  },
  {
    title: "Mycerra Truffle Long Wallet",
    body: "Handcrafted from aniline-finished pure Mycerra mat, featuring refined surface sheen and tactile softness.",
    image: productWallet,
  },
  {
    title: "Mycerra Ivory Marble Tote",
    body: "Handcrafted from pure mycelium mat, marble-finished to accentuate natural veining and organic texture.",
    image: productTote,
  },
];

export const news = [
  {
    tag: "Exhibition",
    title: "Mycerra at LINEAPELLE Milan",
    meta: "Fiera Milano Rho · February 2026",
  },
  {
    tag: "Broadcast",
    title: "EBS Extreme Jobs",
    meta: "A story of biomaterial innovation through mycelium",
  },
  {
    tag: "Broadcast",
    title: "National Assembly Broadcasting",
    meta: "Exploring the science and craftsmanship behind Mycerra",
  },
];

export const futurePlatform = [
  { title: "Mycelium foams", body: "Biodegradable replacements for Styrofoam and packaging." },
  { title: "Mycelium protein", body: "A sustainable resource for food and biomaterials." },
  { title: "Architectural composites", body: "Lightweight panels for interiors and construction." },
];

// ---------- 문의 유형 (Modern Synthesis: 대상별 진입점) ----------

export const inquiryTypes = [
  { id: "brand", label: "Brand / Designer", hint: "Swatches, collections, co-development" },
  { id: "manufacturer", label: "Tannery / Finisher / Manufacturer", hint: "Processing trials, supply partnership" },
  { id: "investor", label: "Investor", hint: "Investment and strategic partnership" },
  { id: "press", label: "Press", hint: "Interviews, images, press kit" },
  { id: "other", label: "Other", hint: "Anything else" },
] as const;

export type InquiryTypeId = (typeof inquiryTypes)[number]["id"];

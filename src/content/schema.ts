// 운영 도구(CMS)로 편집하는 콘텐츠(src/content/data/*.json)의 규칙.
// - 사이트 코드는 아래 타입만 사용한다 (import type → zod 는 공개 번들에 포함되지 않음)
// - 빌드 시(vite 플러그인)와 CMS 저장 시 validateContent 로 검사해, 잘못된 데이터는 배포·저장되지 않는다.

import { z } from "zod";

const text = z.string().trim().min(1);
export const LSchema = z.object({ en: text, ko: text });

export const ConditionId = z.enum(["pure", "embossed", "reactive", "finished"]);
export type ConditionId = "pure" | "embossed" | "reactive" | "finished";

const mediaPath = z
  .string()
  .regex(/^\/media\/[\w\-/.]+\.(webp|jpg|jpeg|png)$/i, "이미지 경로는 /media/… 의 webp/jpg/png 파일이어야 합니다");

export const ConditionSchema = z.object({
  id: ConditionId,
  title: LSchema,
  summary: LSchema,
  priceUSDPerSqft: z.number().positive().max(10000),
  target: z.number().int().min(0).max(999),
  // 가공 조건별 HS 코드 (품목분류 사전심사 결과). 비어 있으면 판매자 정보의 기본 HS 코드를 쓴다
  hsCode: z.string().trim().max(40).optional(),
});

export const SizeSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,20}$/, "크기 ID는 영문 소문자·숫자·하이픈"),
  // regular: 정규원단 1장 / brochure: 스와치 브로셔 1세트 (widthCm×heightCm 스와치 pieces장 묶음)
  kind: z.enum(["brochure", "regular"]),
  label: LSchema,
  widthCm: z.number().positive().max(1000),
  heightCm: z.number().positive().max(1000),
  pieces: z.number().int().min(1).max(100).optional(),
});

export const CommerceSchema = z.object({
  currency: z.literal("USD"),
  conditions: z.array(ConditionSchema).length(4),
  sizes: z.array(SizeSchema).min(1).max(12),
  // 개별 단가 예외: "조건ID:크기ID" → 장당 USD
  priceOverrides: z.record(z.string().regex(/^[a-z]+:[a-z0-9-]+$/), z.number().positive()),
  retail: z.object({
    minSqft: z.number().positive(),
    maxSqft: z.number().positive(),
    shippingUSD: z.number().min(0),
    brochureMaxPerOrder: z.number().int().positive(),
  }),
  seller: z.object({
    company: text,
    brand: text,
    email: z.string().email(),
    address: text,
    addressKo: text,
    businessRegNo: text,
    phone: text,
    countryOfOrigin: text,
    hsCode: text,
  }),
});

export const ProductSchema = z.object({
  sku: z.string().regex(/^[A-Z]{2}-\d{2,3}$/, "SKU 형식: 영문 대문자 2자 + 하이픈 + 숫자 (예: EM-05)"),
  condition: ConditionId,
  name: text.max(80),
  libraryCode: z.string().optional(),
  image: mediaPath.optional(),
  description: LSchema,
  status: z.enum(["available", "coming-soon"]),
  sizes: z.array(z.string()).min(1).optional(), // 없으면 정규원단 크기 전체 판매. 브로셔 상품은 브로셔 크기만
});

export const NewsSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,60}$/, "ID는 영문 소문자·숫자·하이픈"),
  tag: LSchema,
  title: LSchema,
  meta: LSchema,
  url: z.string().url().optional(),
});

export const TestItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  group: z.enum(["physical", "colour", "comfort"]),
  name: LSchema,
  method: text,
  unit: text,
  result: z.string().trim().min(1).nullable(),
  lab: z.string().trim().min(1).nullable(),
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  reportUrl: z.string().regex(/^(\/media\/reports\/[\w\-.]+\.pdf|https:\/\/.+)$/i).nullable(),
});

// ---------- 페이지 문구·사진·섹션 순서 (site.json) ----------
// 페이지별 섹션 구성은 화면 코드와 짝을 이루므로 고정: 운영 도구에서는 순서 변경·숨기기만 가능하다.
export const SITE_SECTIONS = {
  home: ["hero", "statement", "pillars", "library", "process", "impact", "shop", "collections", "audiences", "company"],
  mycerra: ["intro", "feature", "grid", "finishing"],
  technology: ["intro", "structure", "process", "performance", "test-reports", "platform"],
  impact: ["intro", "claims", "traceability", "principles", "docs"],
  "work-with-us": ["intro", "steps", "supply", "inquiry"],
  shop: ["intro", "pricing", "catalog"],
} as const;

const SHARED_KEYS = [
  "footer",
  "expressions",
  "processSteps",
  "claims",
  "traceability",
  "features",
  "finishingOptions",
  "futurePlatform",
  "collections",
  "workSpecs",
  "downloads",
] as const;

export const SiteSchema = z.object({
  shared: z.object(Object.fromEntries(SHARED_KEYS.map((k) => [k, z.unknown()]))).passthrough(),
  pages: z.object(
    Object.fromEntries(
      Object.keys(SITE_SECTIONS).map((page) => [
        page,
        z.object({
          order: z.array(z.object({ id: z.string(), visible: z.boolean() })),
          content: z.record(z.string(), z.unknown()),
        }),
      ]),
    ),
  ),
});

/** site.json 세부 검사 (번역 누락, 사진 파일, 섹션 구성, 공통 콘텐츠 규칙) */
const checkSite = (site: z.infer<typeof SiteSchema>, mediaExists: (p: string) => boolean, push: (m: string) => void) => {
  Object.entries(SITE_SECTIONS).forEach(([page, ids]) => {
    const pg = (site.pages as Record<string, { order: { id: string }[]; content: Record<string, unknown> }>)[page];
    const order = pg.order.map((o) => o.id);
    const missing = ids.filter((id) => !order.includes(id));
    const extra = order.filter((id) => !(ids as readonly string[]).includes(id));
    const dup = order.filter((id, i) => order.indexOf(id) !== i);
    if (missing.length) push(`site.json › ${page}: 섹션 누락 ${missing.join(", ")}`);
    if (extra.length) push(`site.json › ${page}: 알 수 없는 섹션 ${extra.join(", ")}`);
    if (dup.length) push(`site.json › ${page}: 섹션 중복 ${dup.join(", ")}`);
    Object.keys(pg.content).forEach((k) => {
      if (!(ids as readonly string[]).includes(k)) push(`site.json › ${page}.content: 알 수 없는 섹션 "${k}"`);
    });
  });

  // 모든 {en, ko} 는 두 언어 모두 채워야 하고, /media 경로는 실제 파일이어야 한다
  const walk = (v: unknown, path: string) => {
    if (typeof v === "string") {
      if (v.startsWith("/media/")) {
        if (!/\.(webp|jpe?g|png|pdf)$/i.test(v)) push(`site.json › ${path}: 지원하지 않는 파일 형식 ${v}`);
        else if (!mediaExists(v)) push(`site.json › ${path}: 파일 없음 ${v}`);
      }
      return;
    }
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${path}.${i}`));
    if (v && typeof v === "object") {
      const keys = Object.keys(v);
      if (keys.length === 2 && keys.includes("en") && keys.includes("ko")) {
        const l = v as { en: unknown; ko: unknown };
        if (typeof l.en !== "string" || !l.en.trim()) push(`site.json › ${path}: 영문이 비어 있습니다`);
        if (typeof l.ko !== "string" || !l.ko.trim()) push(`site.json › ${path}: 한글이 비어 있습니다`);
        return;
      }
      keys.forEach((k) => walk((v as Record<string, unknown>)[k], path ? `${path}.${k}` : k));
    }
  };
  walk(site, "");

  const sh = site.shared as Record<string, unknown>;
  const list = (k: string) => (Array.isArray(sh[k]) ? (sh[k] as Record<string, unknown>[]) : []);
  SHARED_KEYS.forEach((k) => {
    if (sh[k] === undefined) push(`site.json › shared.${k}: 항목이 없습니다`);
  });
  ["expressions", "processSteps", "claims", "collections"].forEach((k) => {
    if (!list(k).length) push(`site.json › shared.${k}: 최소 1개가 필요합니다`);
  });
  const codes = list("expressions").map((e) => String(e.code ?? ""));
  codes.forEach((c, i) => {
    if (!/^[A-Z]{2}-\d{2}$/.test(c)) push(`site.json › shared.expressions.${i}: 코드 형식 오류 "${c}" (예: MG-02)`);
    if (codes.indexOf(c) !== i) push(`site.json › shared.expressions: 코드 중복 "${c}"`);
  });
  list("expressions").forEach((e, i) => {
    if (!["Grain", "Embossed", "Natural", "Dyed"].includes(String(e.family)))
      push(`site.json › shared.expressions.${i}: 계열은 Grain·Embossed·Natural·Dyed 중 하나`);
    if (!/^#[0-9a-f]{6}$/i.test(String(e.accent))) push(`site.json › shared.expressions.${i}: 대표색은 #RRGGBB 형식`);
    if (typeof e.image !== "string" || !e.image) push(`site.json › shared.expressions.${i}: 사진이 필요합니다`);
  });
  const stepIds = list("processSteps").map((s) => s.id);
  if (stepIds.join(",") !== "cultivate,stabilize,finish")
    push("site.json › shared.processSteps: 배양·안정화·마감 3단계(cultivate, stabilize, finish) 순서를 유지해야 합니다");
  return codes;
};

const socialUrl = z.string().regex(/^(https:\/\/.+)?$/, "SNS 주소는 https:// 로 시작해야 합니다 (없으면 비워 두세요)");
const code = z.string().regex(/^[\w\-.]*$/, "확인 코드는 content=\"…\" 안의 값만 넣으세요");

export const SeoSchema = z.object({
  siteName: text,
  siteUrl: z.string().url().refine((u) => !u.endsWith("/"), "siteUrl 끝에 / 를 붙이지 마세요"),
  defaultImage: z.string().startsWith("/"),
  routes: z.record(z.string().startsWith("/"), z.object({ title: LSchema, description: LSchema })),
  noindex: z.array(z.string().startsWith("/")),
  // SNS 계정 주소 — 비어 있으면 사이트에 표시하지 않는다
  social: z.object({
    instagram: socialUrl,
    facebook: socialUrl,
    x: socialUrl,
    linkedin: socialUrl,
    youtube: socialUrl,
  }),
  xHandle: z.string().regex(/^(@[A-Za-z0-9_]{1,15})?$/, "X 계정은 @이름 형식 (예: @mycerra)"),
  // 검색엔진 소유 확인 코드 (Google Search Console · 네이버 서치어드바이저 · Bing)
  verification: z.object({ google: code, naver: code, bing: code }),
  // IndexNow(Bing·Naver·Yandex 즉시 색인) 공개 키 — 사이트 루트에 같은 이름의 .txt 파일로 게시된다
  indexNowKey: z.string().regex(/^[a-f0-9]{32}$/),
  // 방문자 분석 — 비어 있으면 분석 코드와 동의 배너를 넣지 않는다
  analytics: z.object({
    ga4: z.string().regex(/^(G-[A-Z0-9]{4,16})?$/, "GA4 측정 ID는 G- 로 시작합니다 (예: G-AB12CD34EF)"),
    naver: z.string().regex(/^([a-z0-9]{6,24})?$/i, "네이버 애널리틱스 사이트 ID (영문·숫자)"),
  }),
});

// 사이트 코드용 타입. 프로젝트가 strict 모드가 아니라 z.infer 가 모든 필드를 선택 항목으로 만들기 때문에
// 명시적으로 선언하고, 아래 _check 로 스키마와 어긋나지 않는지 컴파일 시 대조한다.
type Lx = { en: string; ko: string };
export interface Condition {
  id: ConditionId;
  title: Lx;
  summary: Lx;
  priceUSDPerSqft: number;
  target: number;
  hsCode?: string;
}
export interface Size {
  id: string;
  kind: "brochure" | "regular";
  label: Lx;
  widthCm: number;
  heightCm: number;
  pieces?: number;
}
export interface Commerce {
  currency: "USD";
  conditions: Condition[];
  sizes: Size[];
  priceOverrides: Record<string, number>;
  retail: { minSqft: number; maxSqft: number; shippingUSD: number; brochureMaxPerOrder: number };
  seller: {
    company: string;
    brand: string;
    email: string;
    address: string;
    addressKo: string;
    businessRegNo: string;
    phone: string;
    countryOfOrigin: string;
    hsCode: string;
  };
}
export interface ProductData {
  sku: string;
  condition: ConditionId;
  name: string;
  libraryCode?: string;
  image?: string;
  description: Lx;
  status: "available" | "coming-soon";
  sizes?: string[];
}
export interface NewsItem {
  id: string;
  tag: Lx;
  title: Lx;
  meta: Lx;
  url?: string;
}
export interface TestItemData {
  id: string;
  group: "physical" | "colour" | "comfort";
  name: Lx;
  method: string;
  unit: string;
  result: string | null;
  lab: string | null;
  reportDate: string | null;
  reportUrl: string | null;
}
export interface Seo {
  siteName: string;
  siteUrl: string;
  defaultImage: string;
  routes: Record<string, { title: Lx; description: Lx }>;
  noindex: string[];
  social: { instagram: string; facebook: string; x: string; linkedin: string; youtube: string };
  xHandle: string;
  verification: { google: string; naver: string; bing: string };
  indexNowKey: string;
  analytics: { ga4: string; naver: string };
}

// 스키마 ↔ 타입 대조 (필드 이름이 어긋나면 컴파일 오류)
type SameKeys<A, B> = keyof A extends keyof B ? (keyof B extends keyof A ? true : never) : never;
export const _check: [
  SameKeys<z.infer<typeof CommerceSchema>, Commerce>,
  SameKeys<z.infer<typeof ProductSchema>, ProductData>,
  SameKeys<z.infer<typeof NewsSchema>, NewsItem>,
  SameKeys<z.infer<typeof TestItemSchema>, TestItemData>,
  SameKeys<z.infer<typeof SeoSchema>, Seo>,
  SameKeys<z.infer<typeof SizeSchema>, Size>,
  SameKeys<z.infer<typeof ConditionSchema>, Condition>,
] = [true, true, true, true, true, true, true];

export const collections = {
  products: z.array(ProductSchema),
  commerce: CommerceSchema,
  news: z.array(NewsSchema),
  "test-reports": z.array(TestItemSchema),
  seo: SeoSchema,
  site: SiteSchema,
} as const;
export type CollectionName = keyof typeof collections;

export interface ContentSet {
  products: unknown;
  commerce: unknown;
  news: unknown;
  "test-reports": unknown;
  seo: unknown;
  site: unknown;
}

/**
 * 전체 콘텐츠 검사. 형식 검사 + 서로 참조하는 값(크기·조건·이미지 파일) 검사.
 * mediaExists: /media/… 경로의 파일 존재 여부 (빌드·CMS 서버에서 디스크를 확인)
 */
export const validateContent = (data: ContentSet, mediaExists: (path: string) => boolean): string[] => {
  const errors: string[] = [];
  const parsed: Partial<Record<CollectionName, unknown>> = {};
  const report = (name: string, issues: z.ZodIssue[], prefix: (string | number)[] = []) =>
    issues.forEach((i) => errors.push(`${name}.json › ${[...prefix, ...i.path].join(".") || "(root)"}: ${i.message}`));
  // 목록형 데이터는 항목별로 검사해, 일부가 잘못돼도 나머지로 참조 검사를 계속한다 (오류를 한 번에 모두 보여 주기 위해)
  const items: Partial<Record<CollectionName, z.ZodTypeAny>> = {
    products: ProductSchema,
    news: NewsSchema,
    "test-reports": TestItemSchema,
  };
  (Object.keys(collections) as CollectionName[]).forEach((name) => {
    const item = items[name];
    const raw = data[name];
    if (item && Array.isArray(raw)) {
      parsed[name] = raw.flatMap((x, idx) => {
        const r = item.safeParse(x);
        if (r.success) return [r.data];
        report(name, r.error.issues, [idx]);
        return [];
      });
      return;
    }
    const r = collections[name].safeParse(raw);
    if (r.success) parsed[name] = r.data;
    else report(name, r.error.issues);
  });

  const commerce = parsed.commerce as Commerce | undefined;
  const products = parsed.products as ProductData[] | undefined;
  const news = parsed.news as NewsItem[] | undefined;
  const tests = parsed["test-reports"] as TestItemData[] | undefined;

  const dupes = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);
  const libraryCodes = parsed.site
    ? checkSite(parsed.site as z.infer<typeof SiteSchema>, mediaExists, (m) => errors.push(m))
    : null;
  if (commerce) {
    const ids = commerce.conditions.map((c) => c.id);
    if (new Set(ids).size !== 4) errors.push("commerce.json › conditions: 순수·엠보·반응성·피니시 4개 조건이 한 번씩 있어야 합니다");
    dupes(commerce.sizes.map((s) => s.id)).forEach((d) => errors.push(`commerce.json › sizes: 크기 ID 중복 "${d}"`));
    if (!commerce.sizes.some((s) => s.kind === "regular")) errors.push("commerce.json › sizes: 정규원단 크기가 최소 1개 필요합니다");
    commerce.sizes.forEach((s) => {
      if (s.kind === "brochure" && !s.pieces) errors.push(`commerce.json › sizes › ${s.id}: 브로셔는 세트당 스와치 장수(pieces)가 필요합니다`);
    });
    if (commerce.retail.minSqft >= commerce.retail.maxSqft)
      errors.push("commerce.json › retail: 최소 물량은 개인 주문 상한보다 작아야 합니다");
    Object.keys(commerce.priceOverrides).forEach((k) => {
      const [c, s] = k.split(":");
      if (!ids.includes(c as ConditionId) || !commerce.sizes.some((x) => x.id === s))
        errors.push(`commerce.json › priceOverrides: "${k}" 는 없는 조건 또는 크기입니다`);
    });
  }
  if (products) {
    dupes(products.map((p) => p.sku)).forEach((d) => errors.push(`products.json: SKU 중복 "${d}"`));
    products.forEach((p) => {
      if (p.image && !mediaExists(p.image)) errors.push(`products.json › ${p.sku}: 이미지 파일 없음 ${p.image}`);
      if (p.status === "available" && !p.image) errors.push(`products.json › ${p.sku}: 판매 중 상품에는 이미지가 필요합니다`);
      if (p.libraryCode && libraryCodes && !libraryCodes.includes(p.libraryCode))
        errors.push(`products.json › ${p.sku}: 소재 라이브러리에 없는 코드 "${p.libraryCode}"`);
      p.sizes?.forEach((s) => {
        if (commerce && !commerce.sizes.some((x) => x.id === s)) errors.push(`products.json › ${p.sku}: 없는 크기 "${s}"`);
      });
      if (commerce && p.sizes) {
        const kinds = new Set(p.sizes.map((s) => commerce.sizes.find((x) => x.id === s)?.kind).filter(Boolean));
        if (kinds.size > 1) errors.push(`products.json › ${p.sku}: 브로셔 크기와 정규원단 크기를 한 상품에 섞을 수 없습니다`);
      }
    });
  }
  if (news) dupes(news.map((n) => n.id)).forEach((d) => errors.push(`news.json: ID 중복 "${d}"`));
  if (tests) {
    dupes(tests.map((t) => t.id)).forEach((d) => errors.push(`test-reports.json: ID 중복 "${d}"`));
    tests.forEach((t) => {
      if (t.reportUrl?.startsWith("/media/") && !mediaExists(t.reportUrl))
        errors.push(`test-reports.json › ${t.id}: 성적서 파일 없음 ${t.reportUrl}`);
    });
  }
  return errors;
};

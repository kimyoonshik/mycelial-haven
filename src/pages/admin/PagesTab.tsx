// 운영 도구 › 페이지: 페이지별 섹션 순서·표시, 문구(영/한)·사진 편집, 공통 콘텐츠 편집, 실시간 미리보기.
// 데이터: src/content/data/site.json (구성 규칙은 src/content/schema.ts 의 SITE_SECTIONS)

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Monitor, Plus, RefreshCw, Smartphone, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Btn, Field, inputCls, LInput, MediaPicker, Num } from "./cms-ui";

type Lx = { en: string; ko: string };
type Json = unknown;
export interface SiteData {
  shared: Record<string, Json>;
  pages: Record<string, { order: { id: string; visible: boolean }[]; content: Record<string, Json> }>;
}

// ---------- 이름표 ----------

const PAGES: { id: string; label: string; route: string }[] = [
  { id: "home", label: "홈", route: "/" },
  { id: "mycerra", label: "소재 라이브러리", route: "/mycerra" },
  { id: "technology", label: "기술", route: "/technology" },
  { id: "impact", label: "임팩트", route: "/impact" },
  { id: "work-with-us", label: "협업 안내", route: "/work-with-us" },
  { id: "shop", label: "쇼핑몰", route: "/shop" },
];

const SECTION_LABELS: Record<string, string> = {
  hero: "첫 화면 (전면 사진)",
  statement: "핵심 문장",
  pillars: "What / Why / How",
  library: "소재 스와치 줄",
  process: "공정 3단계",
  impact: "임팩트 수치",
  shop: "쇼핑몰 바로가기",
  collections: "컬렉션 (제품 사진)",
  audiences: "브랜드 / 제혁사 진입",
  company: "회사·소식",
  intro: "상단 소개",
  feature: "선택 소재 크게 보기",
  grid: "소재 목록",
  finishing: "마감·성능",
  structure: "구조",
  performance: "성능 특성",
  "test-reports": "시험 성적서",
  platform: "향후 플랫폼",
  claims: "수치와 근거 문서",
  traceability: "원산지 추적 (시설 사진)",
  principles: "원칙 3가지",
  docs: "근거 문서 요청",
  steps: "진행 4단계",
  supply: "공급 조건·자료",
  inquiry: "문의 폼",
  pricing: "크기×가공 가격표",
  catalog: "상품 목록",
};

// 문구가 없는 섹션: 내용이 어디서 오는지 안내
const SECTION_SOURCE: Record<string, string> = {
  "home.library": "공통 콘텐츠 › 소재 라이브러리",
  "home.process": "공통 콘텐츠 › 공정 3단계 (사진 포함)",
  "home.impact": "공통 콘텐츠 › 임팩트 수치",
  "home.collections": "공통 콘텐츠 › 컬렉션 (사진 포함)",
  "home.company": "공통 콘텐츠 › 향후 플랫폼, 소식 탭",
  "mycerra.feature": "공통 콘텐츠 › 소재 라이브러리",
  "mycerra.grid": "공통 콘텐츠 › 소재 라이브러리",
  "mycerra.finishing": "공통 콘텐츠 › 마감 옵션·성능 특성",
  "technology.process": "공통 콘텐츠 › 공정 3단계",
  "technology.performance": "공통 콘텐츠 › 성능 특성",
  "technology.test-reports": "성적서 탭",
  "technology.platform": "공통 콘텐츠 › 향후 플랫폼",
  "impact.claims": "공통 콘텐츠 › 임팩트 수치",
  "impact.traceability": "공통 콘텐츠 › 원산지 추적",
  "work-with-us.supply": "공통 콘텐츠 › 공급 조건·자료",
  "shop.pricing": "크기·가격 탭",
  "shop.catalog": "상품 탭",
};

const SHARED: { id: string; label: string; route: string }[] = [
  { id: "expressions", label: "소재 라이브러리 (12종 사진·설명)", route: "/mycerra" },
  { id: "processSteps", label: "공정 3단계 (사진·설명)", route: "/technology#cultivate" },
  { id: "collections", label: "컬렉션 (제품 사진)", route: "/#sec-collections" },
  { id: "claims", label: "임팩트 수치", route: "/impact#sec-claims" },
  { id: "traceability", label: "원산지 추적", route: "/impact#sec-traceability" },
  { id: "features", label: "성능 특성", route: "/technology#performance" },
  { id: "finishingOptions", label: "마감 옵션", route: "/mycerra#sec-finishing" },
  { id: "futurePlatform", label: "향후 플랫폼", route: "/technology#platform" },
  { id: "workSpecs", label: "공급 조건", route: "/work-with-us#sec-supply" },
  { id: "downloads", label: "자료 내려받기 목록", route: "/work-with-us#sec-supply" },
  { id: "footer", label: "바닥글 문구", route: "/" },
];

const KEY_LABELS: Record<string, string> = {
  eyebrow: "작은 제목",
  title: "제목",
  titleBefore: "제목",
  intro: "소개 글",
  image: "사진",
  heroTitle: "큰 제목 (줄마다)",
  heroBody: "본문",
  heroCta: "버튼 문구",
  heroAlt: "사진 설명 (화면 낭독기용)",
  statement: "문장",
  pillars: "항목",
  audiences: "항목",
  principles: "항목",
  steps: "단계",
  k: "작은 제목",
  t: "제목",
  b: "본문",
  to: "연결 주소",
  cta: "버튼·링크 문구",
  dark: "어두운 배경",
  navLabel: "왼쪽 목차 이름",
  name: "이름",
  code: "코드",
  family: "계열",
  accent: "대표색 (배경)",
  description: "설명",
  no: "번호",
  body: "본문",
  value: "값",
  label: "이름",
  detail: "설명",
  proof: "근거 문서",
  status: "문서 상태",
  href: "문서 파일 주소 (/media/reports/…pdf)",
  meta: "시험기관·성적서 정보",
  verifyUrl: "진위 확인 주소",
  certificate: "인증 번호",
  line1: "첫째 줄",
  line2: "둘째 줄",
  origin: "원산지 문구",
  request: "버튼 문구 (스와치 요청)",
  buy: "버튼 문구 (쇼핑몰)",
  filter: "필터 설명",
  custom: "안내 문구",
  tdsBefore: "안내 문구",
  tdsLink: "링크 문구",
  onRequest: "미정 값 표시",
  shopCta: "쇼핑몰 링크 문구",
};

const labelFor = (key: string) => {
  if (KEY_LABELS[key]) return KEY_LABELS[key];
  const rules: [RegExp, string][] = [
    [/Eyebrow$/, "작은 제목"],
    [/Title$/, "제목"],
    [/Body$/, "본문"],
    [/Cta$/, "버튼·링크 문구"],
    [/Alt$/, "사진 설명"],
    [/Image$/, "사진"],
    [/Note$/, "안내 문구"],
    [/Question$/, "질문 문구"],
  ];
  return rules.find(([re]) => re.test(key))?.[1] ?? key;
};

const isL = (v: Json): v is Lx =>
  !!v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 2 && "en" in v && "ko" in v;
const clone = <T,>(v: T): T => structuredClone(v);
/** 목록 항목 요약 (접힌 상태에서 보이는 이름) */
const summary = (v: Json): string => {
  if (isL(v)) return v.ko || v.en;
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const o = v as Record<string, Json>;
    for (const k of ["name", "title", "t", "label", "value", "code"]) if (o[k] !== undefined) return summary(o[k]);
  }
  return "";
};

// ---------- 자동 입력 양식 ----------

const JsonField = ({ k, value, onChange }: { k: string; value: Json; onChange: (v: Json) => void }) => {
  const label = labelFor(k);
  if (isL(value)) {
    const long = value.en.length > 60 || value.ko.length > 40;
    return (
      <div>
        <LInput label={label} value={value} onChange={onChange} multiline={long} />
        {k === "value" && (
          <button type="button" className="mt-1 text-xs text-mc-mute underline" onClick={() => onChange(null)}>
            값 비우기 (화면에 "문의"로 표시)
          </button>
        )}
      </div>
    );
  }
  if (value === null) {
    return (
      <Field label={label}>
        <button type="button" className="text-sm underline" onClick={() => onChange({ en: "", ko: "" })}>
          (미정 — "문의"로 표시 중) 값 입력하기
        </button>
      </Field>
    );
  }
  if (typeof value === "string") {
    if (value.startsWith("/media/") || /image$/i.test(k)) {
      return (
        <Field label={label} hint="webp 권장, 긴 변 1920px 이하·8MB 이하. 업로드하면 바로 선택됩니다.">
          <MediaPicker folder="site" value={value} onChange={(v) => v && onChange(v)} accept="image/webp,image/jpeg,image/png" />
        </Field>
      );
    }
    if (k === "accent" && /^#[0-9a-f]{6}$/i.test(value)) {
      return (
        <Field label={label}>
          <div className="flex items-center gap-2">
            <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-12 border border-mc-line" />
            <input value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "w-28")} />
          </div>
        </Field>
      );
    }
    if (k === "family") {
      return (
        <Field label={label}>
          <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
            {["Grain", "Embossed", "Natural", "Dyed"].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Field>
      );
    }
    if (k === "status") {
      return (
        <Field label={label}>
          <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
            <option value="in-preparation">문서 준비 중</option>
            <option value="published">문서 공개</option>
          </select>
        </Field>
      );
    }
    return (
      <Field label={label} hint={k === "to" ? "사이트 안의 주소 (예: /mycerra, /work-with-us#inquiry)" : undefined}>
        <input value={value} disabled={k === "id"} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      </Field>
    );
  }
  if (typeof value === "number") {
    return (
      <Field label={label}>
        <Num value={value} onChange={onChange} />
      </Field>
    );
  }
  if (typeof value === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
        {label}
      </label>
    );
  }
  if (Array.isArray(value)) return <JsonList k={k} items={value} onChange={onChange} />;
  if (value && typeof value === "object") {
    const o = value as Record<string, Json>;
    return (
      <fieldset className="space-y-3 border-l-2 border-mc-line pl-3">
        <legend className="text-[11px] font-medium text-mc-mute">{label}</legend>
        {Object.keys(o).map((kk) => (
          <JsonField key={kk} k={kk} value={o[kk]} onChange={(v) => onChange({ ...o, [kk]: v })} />
        ))}
      </fieldset>
    );
  }
  return null;
};

const JsonList = ({ k, items, onChange }: { k: string; items: Json[]; onChange: (v: Json) => void }) => {
  const [open, setOpen] = useState<number | null>(items.length <= 4 ? -1 : null); // -1 = 모두 펼침
  const move = (i: number, d: -1 | 1) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  const simple = items.every((x) => isL(x) || typeof x === "string");
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium text-mc-mute">
        {labelFor(k)} · {items.length}개
      </p>
      {items.map((item, i) => {
        const expanded = simple || open === -1 || open === i;
        return (
          <div key={i} className="border border-mc-line bg-white">
            <div className="flex items-center gap-2 border-b border-mc-line/60 px-2 py-1.5">
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="flex-1 truncate text-left text-sm"
                disabled={simple}
              >
                <span className="text-mc-mute">{i + 1}.</span> {summary(item)}
              </button>
              <button type="button" aria-label="위로" disabled={i === 0} onClick={() => move(i, -1)} className="p-1 disabled:opacity-30">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="아래로"
                disabled={i === items.length - 1}
                onClick={() => move(i, 1)}
                className="p-1 disabled:opacity-30"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="삭제"
                disabled={items.length <= 1}
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="p-1 text-red-800 disabled:opacity-30"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {expanded && (
              <div className="space-y-3 p-3">
                {isL(item) || typeof item !== "object" || item === null ? (
                  <JsonField k={k} value={item} onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))} />
                ) : (
                  Object.keys(item as Record<string, Json>).map((kk) => (
                    <JsonField
                      key={kk}
                      k={kk}
                      value={(item as Record<string, Json>)[kk]}
                      onChange={(v) => onChange(items.map((x, j) => (j === i ? { ...(x as Record<string, Json>), [kk]: v } : x)))}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
      <Btn
        onClick={() => {
          onChange([...items, clone(items[items.length - 1])]);
          setOpen(items.length);
        }}
      >
        <Plus className="h-3.5 w-3.5" /> 항목 추가 (마지막 항목 복사)
      </Btn>
    </div>
  );
};

// ---------- 미리보기 ----------

const Preview = ({ route, anchor, tick }: { route: string; anchor?: string; tick: number }) => {
  const ref = useRef<HTMLIFrameElement>(null);
  const [mobile, setMobile] = useState(false);
  const [reload, setReload] = useState(0);
  const src = route.split("#")[0];
  const hash = anchor ?? route.split("#")[1];

  // 페이지가 그려진 뒤 해당 섹션으로 스크롤 (같은 출처라 직접 접근 가능)
  const scrollTo = () => {
    const doc = ref.current?.contentDocument;
    if (!doc || !hash) return;
    let tries = 0;
    const timer = setInterval(() => {
      const el = doc.getElementById(hash);
      if (el || ++tries > 20) {
        clearInterval(timer);
        el?.scrollIntoView({ block: "start" });
      }
    }, 150);
  };
  useEffect(scrollTo, [hash]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 pb-2 text-xs text-mc-mute">
        <span className="truncate">미리보기 · {src}</span>
        <div className="flex gap-1">
          <button type="button" aria-label="데스크톱" onClick={() => setMobile(false)} className={cn("p-1", !mobile && "text-mc-ink")}>
            <Monitor className="h-4 w-4" />
          </button>
          <button type="button" aria-label="모바일" onClick={() => setMobile(true)} className={cn("p-1", mobile && "text-mc-ink")}>
            <Smartphone className="h-4 w-4" />
          </button>
          <button type="button" aria-label="새로고침" onClick={() => setReload((n) => n + 1)} className="p-1">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-1 justify-center overflow-hidden border border-mc-line bg-white">
        <iframe
          key={`${src}-${tick}-${reload}`}
          ref={ref}
          src={src}
          title="미리보기"
          onLoad={scrollTo}
          data-testid="cms-preview"
          className={cn("h-full border-0", mobile ? "w-[390px]" : "w-full")}
        />
      </div>
    </div>
  );
};

// ---------- 탭 ----------

export const PagesTab = ({ data, setData, tick }: { data: SiteData; setData: (d: SiteData) => void; tick: number }) => {
  const [page, setPage] = useState<string>("home");
  const [section, setSection] = useState<string>("hero");
  const isShared = page === "shared";
  const pg = isShared ? null : data.pages[page];

  const setPage_ = (id: string) => {
    setPage(id);
    setSection(id === "shared" ? SHARED[0].id : data.pages[id].order[0].id);
  };
  const setOrder = (order: { id: string; visible: boolean }[]) =>
    setData({ ...data, pages: { ...data.pages, [page]: { ...pg!, order } } });
  const move = (i: number, d: -1 | 1) => {
    const next = [...pg!.order];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setOrder(next);
  };

  const route = isShared
    ? SHARED.find((s) => s.id === section)?.route ?? "/"
    : PAGES.find((p) => p.id === page)!.route;
  const anchor = isShared ? undefined : `sec-${section}`;

  const content = isShared ? data.shared[section] : pg!.content[section];
  const setContent = (v: Json) =>
    isShared
      ? setData({ ...data, shared: { ...data.shared, [section]: v } })
      : setData({ ...data, pages: { ...data.pages, [page]: { ...pg!, content: { ...pg!.content, [section]: v } } } });

  return (
    <div className="grid gap-6 xl:grid-cols-[250px_minmax(0,1fr)_minmax(0,1fr)]">
      {/* 페이지·섹션 목록 */}
      <aside className="space-y-4">
        <div className="flex flex-wrap gap-1">
          {[...PAGES, { id: "shared", label: "공통 콘텐츠", route: "/" }].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPage_(p.id)}
              aria-pressed={page === p.id}
              className={cn(
                "rounded-full border px-3 py-1 text-xs",
                page === p.id ? "border-mc-ink bg-mc-ink text-mc-paper" : "border-mc-line hover:border-mc-ink",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {isShared ? (
          <ul className="divide-y divide-mc-line border border-mc-line bg-white" data-testid="shared-list">
            {SHARED.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSection(s.id)}
                  className={cn("w-full px-3 py-2 text-left text-sm", section === s.id && "bg-mc-cream")}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <p className="text-[11px] text-mc-mute">위에서 아래 = 화면 순서. 눈 아이콘으로 숨기기·보이기.</p>
            <ul className="divide-y divide-mc-line border border-mc-line bg-white" data-testid="section-list">
              {pg!.order.map((s, i) => (
                <li key={s.id} className={cn("flex items-center gap-1 px-2 py-1.5", section === s.id && "bg-mc-cream")} data-row={s.id}>
                  <button
                    type="button"
                    onClick={() => setSection(s.id)}
                    className={cn("flex-1 truncate text-left text-sm", !s.visible && "text-mc-mute line-through")}
                  >
                    {SECTION_LABELS[s.id] ?? s.id}
                  </button>
                  <button
                    type="button"
                    aria-label={`${s.id} 위로`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    className="p-1 disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${s.id} 아래로`}
                    disabled={i === pg!.order.length - 1}
                    onClick={() => move(i, 1)}
                    className="p-1 disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${s.id} ${s.visible ? "숨기기" : "보이기"}`}
                    onClick={() => setOrder(pg!.order.map((x) => (x.id === s.id ? { ...x, visible: !x.visible } : x)))}
                    className="p-1"
                  >
                    {s.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-mc-mute" />}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>

      {/* 편집 양식 */}
      <section className="min-w-0 space-y-4" data-testid="section-editor">
        <h3 className="font-mc-serif text-2xl">
          {isShared ? SHARED.find((s) => s.id === section)?.label : `${PAGES.find((p) => p.id === page)?.label} › ${SECTION_LABELS[section] ?? section}`}
        </h3>
        {content === undefined ? (
          <p className="bg-mc-cream p-4 text-sm text-mc-mute">
            이 섹션에는 직접 편집할 문구가 없습니다. 순서와 표시만 여기서 바꿀 수 있고, 내용은{" "}
            <strong className="text-mc-ink">{SECTION_SOURCE[`${page}.${section}`] ?? "다른 탭"}</strong>에서 편집합니다.
          </p>
        ) : (
          <div className="space-y-4">
            {content && typeof content === "object" && !Array.isArray(content) && !isL(content) ? (
              Object.keys(content as Record<string, Json>).map((kk) => (
                <JsonField
                  key={`${page}.${section}.${kk}`}
                  k={kk}
                  value={(content as Record<string, Json>)[kk]}
                  onChange={(v) => setContent({ ...(content as Record<string, Json>), [kk]: v })}
                />
              ))
            ) : (
              <JsonField key={`${page}.${section}`} k={section} value={content} onChange={setContent} />
            )}
          </div>
        )}
      </section>

      {/* 미리보기 */}
      <div className="h-[75vh] min-w-0 xl:sticky xl:top-24">
        <Preview route={route} anchor={anchor} tick={tick} />
      </div>
    </div>
  );
};

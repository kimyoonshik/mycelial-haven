// Mycerra 운영 도구 (CMS) — `npm run cms` 로 실행한 이 PC의 개발 서버에서만 저장·업로드·게시가 동작한다.
// 데이터: src/content/data/*.json · 이미지·성적서: public/media/ (cms/plugin.ts 의 /__cms API 사용)

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError, Btn, Field, inputCls, LInput, MediaPicker, Num, TOKEN } from "./cms-ui";
import { PagesTab, type SiteData } from "./PagesTab";
import { ArrowDown, ArrowUp, Copy, ExternalLink, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  Commerce,
  ConditionId,
  ContentSet,
  NewsItem,
  ProductData,
  Seo,
  Size,
  TestItemData,
} from "@/content/schema";

type Lx = { en: string; ko: string };
type Tab = "site" | "products" | "commerce" | "test-reports" | "news" | "seo" | "publish";
interface Content {
  site: SiteData;
  products: ProductData[];
  commerce: Commerce;
  news: NewsItem[];
  "test-reports": TestItemData[];
  seo: Seo;
}

const SKU_PREFIX: Record<ConditionId, string> = { pure: "PU", embossed: "EM", reactive: "RD", finished: "FN" };
const SQFT_PER_M2 = 10.7639104;
const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------- 탭: 상품 ----------

const ProductsTab = ({ data, setData, commerce }: { data: ProductData[]; setData: (d: ProductData[]) => void; commerce: Commerce }) => {
  const [selected, setSelected] = useState<string>(data[0]?.sku ?? "");
  const [filter, setFilter] = useState<ConditionId | "all">("all");
  const [q, setQ] = useState("");
  const p = data.find((x) => x.sku === selected);
  const list = data.filter(
    (x) => (filter === "all" || x.condition === filter) && `${x.sku} ${x.name}`.toLowerCase().includes(q.toLowerCase()),
  );
  const update = (patch: Partial<ProductData>) => setData(data.map((x) => (x.sku === selected ? { ...x, ...patch } : x)));
  const nextSku = (c: ConditionId) => {
    const prefix = SKU_PREFIX[c];
    const nums = data.filter((x) => x.sku.startsWith(`${prefix}-`)).map((x) => Number(x.sku.split("-")[1]) || 0);
    return `${prefix}-${String(Math.max(0, ...nums) + 1).padStart(2, "0")}`;
  };
  const add = (c: ConditionId, base?: ProductData) => {
    const sku = nextSku(c);
    const item: ProductData = base
      ? { ...base, sku, condition: c, status: "coming-soon" }
      : { sku, condition: c, name: "New material", description: { en: "Description", ko: "설명" }, status: "coming-soon" };
    setData([...data, item]);
    setSelected(sku);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <div className="flex gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value as ConditionId | "all")} className={inputCls}>
            <option value="all">전체 ({data.length})</option>
            {commerce.conditions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title.ko} ({data.filter((x) => x.condition === c.id).length})
              </option>
            ))}
          </select>
          <input placeholder="검색" value={q} onChange={(e) => setQ(e.target.value)} className={inputCls} />
        </div>
        <ul className="mt-3 max-h-[60vh] divide-y divide-mc-line overflow-y-auto border border-mc-line bg-white">
          {list.map((x) => (
            <li key={x.sku}>
              <button
                type="button"
                onClick={() => setSelected(x.sku)}
                className={cn("flex w-full items-center gap-3 px-3 py-2 text-left text-sm", x.sku === selected && "bg-mc-cream")}
              >
                {x.image ? <img src={x.image} alt="" className="h-8 w-8 object-cover" /> : <span className="h-8 w-8 bg-mc-line" />}
                <span className="flex-1">
                  <span className="font-medium">{x.sku}</span> {x.name}
                </span>
                <span className={cn("text-[10px]", x.status === "available" ? "text-emerald-700" : "text-mc-mute")}>
                  {x.status === "available" ? "판매중" : "준비중"}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          {commerce.conditions.map((c) => (
            <Btn key={c.id} onClick={() => add(c.id)}>
              <Plus className="h-3.5 w-3.5" /> {c.title.ko}
            </Btn>
          ))}
        </div>
      </div>

      <div className="lg:col-span-8">
        {!p ? (
          <p className="text-sm text-mc-mute">왼쪽에서 상품을 고르거나 추가하세요.</p>
        ) : (
          <div className="space-y-4 border border-mc-line bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-mc-serif text-2xl">
                {p.sku} · {p.name}
              </h3>
              <div className="flex gap-2">
                <a href={`/shop/p/${p.sku}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm underline">
                  <ExternalLink className="h-3.5 w-3.5" /> 미리보기
                </a>
                <Btn onClick={() => add(p.condition, p)} title="같은 내용으로 새 상품 만들기">
                  <Copy className="h-3.5 w-3.5" /> 복제
                </Btn>
                <Btn
                  variant="danger"
                  onClick={() => {
                    if (!window.confirm(`${p.sku} ${p.name} 을(를) 삭제할까요? (저장 전까지는 되돌릴 수 있습니다)`)) return;
                    setData(data.filter((x) => x.sku !== p.sku));
                    setSelected("");
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> 삭제
                </Btn>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="상품명 (영문, 사이트 공통 표기)">
                <input value={p.name} onChange={(e) => update({ name: e.target.value })} className={inputCls} />
              </Field>
              <Field label="가공 조건">
                <select value={p.condition} onChange={(e) => update({ condition: e.target.value as ConditionId })} className={inputCls}>
                  {commerce.conditions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title.ko}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="판매 상태" hint="판매중이면 사진이 필요합니다">
                <select value={p.status} onChange={(e) => update({ status: e.target.value as ProductData["status"] })} className={inputCls}>
                  <option value="available">판매중 (주문 가능)</option>
                  <option value="coming-soon">준비중 (주문 불가)</option>
                </select>
              </Field>
            </div>
            <LInput label="설명" value={p.description} onChange={(description) => update({ description })} multiline />
            <Field label="사진" hint="webp 권장, 1920px 이하·8MB 이하">
              <MediaPicker folder="products" value={p.image} onChange={(image) => update({ image })} accept="image/webp,image/jpeg,image/png" />
            </Field>
            <Field label="판매 크기" hint="모두 해제하면 전체 크기를 판매합니다">
              <div className="flex flex-wrap gap-3">
                {commerce.sizes.map((s) => {
                  const on = p.sizes ? p.sizes.includes(s.id) : true;
                  return (
                    <label key={s.id} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => {
                          const cur = p.sizes ?? commerce.sizes.map((z) => z.id);
                          const next = on ? cur.filter((x) => x !== s.id) : [...cur, s.id];
                          update({ sizes: next.length && next.length < commerce.sizes.length ? next : undefined });
                        }}
                      />
                      {s.label.ko} ({s.widthCm}×{s.heightCm})
                    </label>
                  );
                })}
              </div>
            </Field>
            <Field label="소재 라이브러리 코드 (선택)" hint="예: CR-03 — 소재 페이지와 연결">
              <input
                value={p.libraryCode ?? ""}
                onChange={(e) => update({ libraryCode: e.target.value || undefined })}
                className={cn(inputCls, "max-w-[12rem]")}
              />
            </Field>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------- 탭: 크기·가격 ----------

const CommerceTab = ({ data, setData }: { data: Commerce; setData: (d: Commerce) => void }) => {
  const area = (s: Size) => round2(((s.widthCm * s.heightCm) / 10000) * SQFT_PER_M2);
  const setCond = (i: number, patch: Partial<Commerce["conditions"][number]>) =>
    setData({ ...data, conditions: data.conditions.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const setSize = (i: number, patch: Partial<Size>) => setData({ ...data, sizes: data.sizes.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const setOverride = (key: string, v: number) => {
    const next = { ...data.priceOverrides };
    if (Number.isFinite(v) && v > 0) next[key] = v;
    else delete next[key];
    setData({ ...data, priceOverrides: next });
  };

  return (
    <div className="space-y-10">
      <section>
        <h3 className="font-mc-serif text-xl">가공 조건별 단가</h3>
        <div className="mt-3 space-y-3">
          {data.conditions.map((c, i) => (
            <div key={c.id} className="grid gap-3 border border-mc-line bg-white p-3 md:grid-cols-12">
              <div className="md:col-span-8">
                <LInput label={`${c.id} 이름`} value={c.title} onChange={(title) => setCond(i, { title })} />
              </div>
              <Field label="USD / sqft" className="md:col-span-2">
                <Num value={c.priceUSDPerSqft} onChange={(priceUSDPerSqft) => setCond(i, { priceUSDPerSqft })} />
              </Field>
              <Field label="구성 목표 종수" className="md:col-span-2">
                <Num value={c.target} step="1" onChange={(target) => setCond(i, { target })} />
              </Field>
              <div className="md:col-span-12">
                <LInput label="설명" value={c.summary} onChange={(summary) => setCond(i, { summary })} multiline />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-mc-serif text-xl">원단 크기</h3>
        <div className="mt-3 space-y-2">
          {data.sizes.map((s, i) => (
            <div key={i} className="grid items-end gap-2 border border-mc-line bg-white p-3 md:grid-cols-12">
              <Field label="ID" className="md:col-span-1">
                <input value={s.id} onChange={(e) => setSize(i, { id: e.target.value })} className={inputCls} />
              </Field>
              <Field label="구분" className="md:col-span-2">
                <select value={s.kind} onChange={(e) => setSize(i, { kind: e.target.value as Size["kind"] })} className={inputCls}>
                  <option value="sample">샘플</option>
                  <option value="regular">정규원단</option>
                </select>
              </Field>
              <Field label="이름 (영문)" className="md:col-span-2">
                <input value={s.label.en} onChange={(e) => setSize(i, { label: { ...s.label, en: e.target.value } })} className={inputCls} />
              </Field>
              <Field label="이름 (한글)" className="md:col-span-2">
                <input value={s.label.ko} onChange={(e) => setSize(i, { label: { ...s.label, ko: e.target.value } })} className={inputCls} />
              </Field>
              <Field label="가로 cm" className="md:col-span-1">
                <Num value={s.widthCm} onChange={(widthCm) => setSize(i, { widthCm })} />
              </Field>
              <Field label="세로 cm" className="md:col-span-1">
                <Num value={s.heightCm} onChange={(heightCm) => setSize(i, { heightCm })} />
              </Field>
              <p className="pb-2 text-xs text-mc-mute md:col-span-2">{area(s).toFixed(2)} sqft / 장</p>
              <div className="md:col-span-1">
                <Btn variant="danger" onClick={() => setData({ ...data, sizes: data.sizes.filter((_, j) => j !== i) })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Btn>
              </div>
            </div>
          ))}
          <Btn
            onClick={() =>
              setData({ ...data, sizes: [...data.sizes, { id: `r${data.sizes.length}`, kind: "regular", label: { en: "New size", ko: "새 크기" }, widthCm: 100, heightCm: 100 }] })
            }
          >
            <Plus className="h-3.5 w-3.5" /> 크기 추가
          </Btn>
        </div>
      </section>

      <section>
        <h3 className="font-mc-serif text-xl">장당 가격표 (USD)</h3>
        <p className="mt-1 text-xs text-mc-mute">빈칸 = 면적 × 단가 자동 계산 (회색 숫자). 값을 넣으면 그 칸만 개별 가격으로 고정됩니다.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-[640px] border border-mc-line bg-white text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left font-normal text-mc-mute">조건 \ 크기</th>
                {data.sizes.map((s) => (
                  <th key={s.id} className="p-2 text-left font-normal">
                    {s.label.ko}
                    <span className="block text-[11px] text-mc-mute">
                      {s.widthCm}×{s.heightCm}cm
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.conditions.map((c) => (
                <tr key={c.id} className="border-t border-mc-line">
                  <td className="p-2">{c.title.ko}</td>
                  {data.sizes.map((s) => {
                    const key = `${c.id}:${s.id}`;
                    const auto = round2(area(s) * c.priceUSDPerSqft);
                    return (
                      <td key={s.id} className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder={auto.toFixed(2)}
                          value={data.priceOverrides[key] ?? ""}
                          onChange={(e) => setOverride(key, e.target.value === "" ? NaN : Number(e.target.value))}
                          className={cn(inputCls, "w-24", data.priceOverrides[key] !== undefined && "border-mc-marigold")}
                          aria-label={`${c.id} ${s.id} 가격`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="font-mc-serif text-xl">주문 규칙</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <Field label="정규원단 최소 sqft">
            <Num value={data.retail.minSqft} onChange={(minSqft) => setData({ ...data, retail: { ...data.retail, minSqft } })} />
          </Field>
          <Field label="개인 주문 상한 sqft" hint="초과 시 발주서 경로">
            <Num value={data.retail.maxSqft} onChange={(maxSqft) => setData({ ...data, retail: { ...data.retail, maxSqft } })} />
          </Field>
          <Field label="주문당 샘플 최대 장수">
            <Num value={data.retail.sampleMaxPerOrder} step="1" onChange={(sampleMaxPerOrder) => setData({ ...data, retail: { ...data.retail, sampleMaxPerOrder } })} />
          </Field>
          <Field label="개인 주문 배송비 USD" hint="0 = 단가에 포함">
            <Num value={data.retail.shippingUSD} onChange={(shippingUSD) => setData({ ...data, retail: { ...data.retail, shippingUSD } })} />
          </Field>
        </div>
      </section>

      <section>
        <h3 className="font-mc-serif text-xl">판매자 정보 (인보이스 인쇄)</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(Object.keys(data.seller) as (keyof Commerce["seller"])[]).map((k) => (
            <Field key={k} label={k}>
              <input value={data.seller[k]} onChange={(e) => setData({ ...data, seller: { ...data.seller, [k]: e.target.value } })} className={inputCls} />
            </Field>
          ))}
        </div>
      </section>
    </div>
  );
};

// ---------- 탭: 성적서 ----------

const TestsTab = ({ data, setData }: { data: TestItemData[]; setData: (d: TestItemData[]) => void }) => {
  const set = (i: number, patch: Partial<TestItemData>) => setData(data.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const opt = (v: string) => (v.trim() === "" ? null : v);
  return (
    <div className="space-y-3">
      <p className="text-xs text-mc-mute">결과를 입력하면 사이트에 "보고 완료"로 집계됩니다. 성적서 PDF를 올리면 결과 옆에 링크가 표시됩니다.</p>
      {data.map((t, i) => (
        <div key={i} className="space-y-3 border border-mc-line bg-white p-4">
          <div className="grid gap-3 md:grid-cols-12">
            <Field label="ID" className="md:col-span-2">
              <input value={t.id} onChange={(e) => set(i, { id: e.target.value })} className={inputCls} />
            </Field>
            <Field label="구분" className="md:col-span-2">
              <select value={t.group} onChange={(e) => set(i, { group: e.target.value as TestItemData["group"] })} className={inputCls}>
                <option value="physical">물리적 특성</option>
                <option value="colour">염색 견뢰도</option>
                <option value="comfort">쾌적성·구성</option>
              </select>
            </Field>
            <Field label="시험법" className="md:col-span-2">
              <input value={t.method} onChange={(e) => set(i, { method: e.target.value })} className={inputCls} />
            </Field>
            <Field label="단위" className="md:col-span-2">
              <input value={t.unit} onChange={(e) => set(i, { unit: e.target.value })} className={inputCls} />
            </Field>
            <Field label="결과" className="md:col-span-2">
              <input value={t.result ?? ""} onChange={(e) => set(i, { result: opt(e.target.value) })} className={inputCls} placeholder="시험 예정" />
            </Field>
            <Field label="시험일" className="md:col-span-2">
              <input type="date" value={t.reportDate ?? ""} onChange={(e) => set(i, { reportDate: opt(e.target.value) })} className={inputCls} />
            </Field>
          </div>
          <LInput label="항목명" value={t.name} onChange={(name) => set(i, { name })} />
          <div className="grid gap-3 md:grid-cols-12">
            <Field label="시험기관" className="md:col-span-4">
              <input value={t.lab ?? ""} onChange={(e) => set(i, { lab: opt(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="성적서 PDF" className="md:col-span-7">
              <MediaPicker folder="reports" value={t.reportUrl} onChange={(v) => set(i, { reportUrl: v ?? null })} accept="application/pdf" />
            </Field>
            <div className="flex items-end gap-1 md:col-span-1">
              <Btn variant="danger" onClick={() => window.confirm(`${t.name.ko} 항목을 삭제할까요?`) && setData(data.filter((_, j) => j !== i))}>
                <Trash2 className="h-3.5 w-3.5" />
              </Btn>
            </div>
          </div>
        </div>
      ))}
      <Btn
        onClick={() =>
          setData([
            ...data,
            { id: `test-${data.length + 1}`, group: "physical", name: { en: "New test", ko: "새 시험" }, method: "ISO", unit: "-", result: null, lab: null, reportDate: null, reportUrl: null },
          ])
        }
      >
        <Plus className="h-3.5 w-3.5" /> 시험 항목 추가
      </Btn>
    </div>
  );
};

// ---------- 탭: 소식 ----------

const NewsTab = ({ data, setData }: { data: NewsItem[]; setData: (d: NewsItem[]) => void }) => {
  const set = (i: number, patch: Partial<NewsItem>) => setData(data.map((n, j) => (j === i ? { ...n, ...patch } : n)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...data];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setData(next);
  };
  return (
    <div className="space-y-3">
      <p className="text-xs text-mc-mute">위에 있는 소식이 홈 화면에 먼저 표시됩니다.</p>
      {data.map((n, i) => (
        <div key={i} className="space-y-3 border border-mc-line bg-white p-4">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="ID (영문 소문자·하이픈)" className="w-56">
              <input value={n.id} onChange={(e) => set(i, { id: e.target.value })} className={inputCls} />
            </Field>
            <Field label="링크 (선택, https://)" className="min-w-[16rem] flex-1">
              <input value={n.url ?? ""} onChange={(e) => set(i, { url: e.target.value || undefined })} className={inputCls} />
            </Field>
            <div className="flex gap-1">
              <Btn onClick={() => move(i, -1)} disabled={i === 0} title="위로">
                <ArrowUp className="h-3.5 w-3.5" />
              </Btn>
              <Btn onClick={() => move(i, 1)} disabled={i === data.length - 1} title="아래로">
                <ArrowDown className="h-3.5 w-3.5" />
              </Btn>
              <Btn variant="danger" onClick={() => window.confirm("이 소식을 삭제할까요?") && setData(data.filter((_, j) => j !== i))}>
                <Trash2 className="h-3.5 w-3.5" />
              </Btn>
            </div>
          </div>
          <LInput label="구분" value={n.tag} onChange={(tag) => set(i, { tag })} />
          <LInput label="제목" value={n.title} onChange={(title) => set(i, { title })} />
          <LInput label="부가 설명" value={n.meta} onChange={(meta) => set(i, { meta })} />
        </div>
      ))}
      <Btn
        onClick={() =>
          setData([
            { id: `news-${Date.now().toString(36)}`, tag: { en: "News", ko: "소식" }, title: { en: "Title", ko: "제목" }, meta: { en: "Details", ko: "내용" } },
            ...data,
          ])
        }
      >
        <Plus className="h-3.5 w-3.5" /> 소식 추가 (맨 위)
      </Btn>
    </div>
  );
};

// ---------- 탭: SEO ----------

const SeoTab = ({ data, setData }: { data: Seo; setData: (d: Seo) => void }) => (
  <div className="space-y-4">
    <Field label="사이트 주소 (끝에 / 없이)" hint="검색엔진 주소·SNS 미리보기에 사용">
      <input value={data.siteUrl} onChange={(e) => setData({ ...data, siteUrl: e.target.value })} className={cn(inputCls, "max-w-md")} />
    </Field>
    {Object.entries(data.routes).map(([path, r]) => (
      <div key={path} className="space-y-2 border border-mc-line bg-white p-4">
        <p className="font-medium">{path}</p>
        <LInput label="페이지 제목" value={r.title} onChange={(title) => setData({ ...data, routes: { ...data.routes, [path]: { ...r, title } } })} />
        <LInput
          label="설명 (검색 결과·미리보기, 150자 내외)"
          value={r.description}
          multiline
          onChange={(description) => setData({ ...data, routes: { ...data.routes, [path]: { ...r, description } } })}
        />
      </div>
    ))}
  </div>
);

// ---------- 탭: 게시 ----------

const PublishTab = () => {
  const [busy, setBusy] = useState("");
  const [log, setLog] = useState("");
  const [errors, setErrors] = useState<string[] | null>(null);
  const [git, setGit] = useState<{ branch: string; changes: string } | null>(null);
  const [message, setMessage] = useState("");

  const refreshGit = useCallback(() => api<{ branch: string; changes: string }>("/git/status").then(setGit).catch((e) => setLog(e.message)), []);
  useEffect(() => {
    refreshGit();
  }, [refreshGit]);

  const step = async (name: string, fn: () => Promise<void>) => {
    setBusy(name);
    try {
      await fn();
    } catch (e) {
      setLog(e instanceof Error ? e.message : String(e));
      if (e instanceof ApiError && e.errors) setErrors(e.errors);
    } finally {
      setBusy("");
      refreshGit();
    }
  };

  return (
    <div className="space-y-6">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-mc-mute">
        <li>각 탭에서 수정하고 "저장" (저장할 때마다 자동 검사·백업)</li>
        <li>검사 → 빌드로 오류가 없는지 확인</li>
        <li>게시: 변경 내용을 GitHub에 올리면 연결된 호스팅(Lovable 등)이 자동으로 새 버전을 배포합니다. FTP 호스팅은 빌드된 dist 폴더를 업로드하세요.</li>
      </ol>
      <div className="flex flex-wrap gap-2">
        <Btn
          disabled={!!busy}
          onClick={() =>
            step("validate", async () => {
              const r = await api<{ errors: string[] }>("/validate", { method: "POST" });
              setErrors(r.errors);
              setLog(r.errors.length ? "" : "검사 통과 — 오류가 없습니다.");
            })
          }
        >
          검사
        </Btn>
        <Btn
          disabled={!!busy}
          onClick={() =>
            step("build", async () => {
              setLog("빌드 중… (1분 이내)");
              const r = await api<{ ok: boolean; log: string }>("/build", { method: "POST" });
              setLog(`${r.ok ? "✅ 빌드 성공 — dist 폴더가 준비되었습니다." : "❌ 빌드 실패"}\n\n${r.log}`);
            })
          }
        >
          {busy === "build" ? "빌드 중…" : "빌드"}
        </Btn>
      </div>
      {errors && errors.length > 0 && (
        <ul className="list-disc space-y-1 border border-red-700/30 bg-red-50 p-4 pl-8 text-sm text-red-800" data-testid="cms-errors">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="space-y-3 border border-mc-line bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm">
            브랜치 <strong>{git?.branch ?? "…"}</strong> · 게시 대기 변경 사항
          </p>
          <Btn onClick={refreshGit}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Btn>
        </div>
        <pre className="max-h-40 overflow-auto bg-mc-cream p-3 text-xs">{git?.changes || "(없음)"}</pre>
        <Field label="변경 내용 메모 (예: 엠보 패턴 EM-05 추가, 인장강도 성적서 등록)">
          <input value={message} onChange={(e) => setMessage(e.target.value)} className={inputCls} />
        </Field>
        <Btn
          variant="dark"
          disabled={!!busy || !git?.changes || !message.trim()}
          onClick={() => {
            if (!window.confirm(`"${message}" 로 게시할까요? 실제 사이트에 반영됩니다.`)) return;
            step("publish", async () => {
              const r = await api<{ ok: boolean; log: string }>("/git/publish", { method: "POST", body: JSON.stringify({ message }) });
              setLog(`${r.ok ? "✅ 게시 완료" : "❌ 게시 실패"}\n\n${r.log}`);
              if (r.ok) setMessage("");
            });
          }}
        >
          게시
        </Btn>
      </div>
      {log && <pre className="max-h-96 overflow-auto whitespace-pre-wrap bg-mc-ink p-4 text-xs text-mc-paper" data-testid="cms-log">{log}</pre>}
    </div>
  );
};

// ---------- 화면 ----------

const TABS: { id: Tab; label: string }[] = [
  { id: "site", label: "페이지" },
  { id: "products", label: "상품" },
  { id: "commerce", label: "크기·가격" },
  { id: "test-reports", label: "성적서" },
  { id: "news", label: "소식" },
  { id: "seo", label: "SEO" },
  { id: "publish", label: "게시" },
];

const ContentManager = () => {
  const [tab, setTab] = useState<Tab>("site");
  const [previewTick, setPreviewTick] = useState(0);
  const [saved, setSaved] = useState<Content | null>(null);
  const [draft, setDraft] = useState<Content | null>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string; errors?: string[] } | null>(null);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    const c = (await api<ContentSet>("/content")) as unknown as Content;
    setSaved(c);
    setDraft(structuredClone(c));
  }, []);
  useEffect(() => {
    if (!TOKEN) return;
    load().catch((e) => setLoadError(e.message));
  }, [load]);

  const dirty = useMemo(() => {
    if (!saved || !draft) return {} as Record<string, boolean>;
    return Object.fromEntries(
      (Object.keys(saved) as (keyof Content)[]).map((k) => [k, JSON.stringify(saved[k]) !== JSON.stringify(draft[k])]),
    );
  }, [saved, draft]);

  // 저장하지 않은 변경이 있으면 창을 닫기 전에 경고
  useEffect(() => {
    const any = Object.values(dirty).some(Boolean);
    const h = (e: BeforeUnloadEvent) => {
      if (any) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  if (!TOKEN) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 font-mc-sans text-mc-ink">
        <h1 className="font-mc-serif text-3xl">Mycerra 운영 도구</h1>
        <p className="mt-4 text-sm leading-relaxed text-mc-mute">
          운영 도구는 사이트 소스가 있는 PC에서 <code className="bg-mc-cream px-1">npm run cms</code> 로 실행한 화면에서만 저장할 수 있습니다.
          실행 후 터미널에 표시되는 주소(http://127.0.0.1:8080/admin/content)로 접속하세요.
        </p>
      </div>
    );
  }
  if (loadError) return <p className="p-10 text-red-700">불러오기 실패: {loadError}</p>;
  if (!draft) return <p className="p-10 text-mc-mute">불러오는 중…</p>;

  const set = <K extends keyof Content>(k: K) => (v: Content[K]) => setDraft({ ...draft, [k]: v });
  const save = async (k: keyof Content) => {
    setStatus(null);
    try {
      await api(`/content/${k}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft[k]) });
      setSaved({ ...saved!, [k]: structuredClone(draft[k]) });
      setPreviewTick((n) => n + 1);
      setStatus({
        kind: "ok",
        text: k === "site" ? "저장했습니다. 미리보기가 저장한 내용으로 갱신됩니다." : "저장했습니다. 사이트 미리보기 탭은 새로고침하면 반영됩니다.",
      });
    } catch (e) {
      setStatus({ kind: "error", text: e instanceof Error ? e.message : String(e), errors: e instanceof ApiError ? e.errors : undefined });
    }
  };

  return (
    <div className="min-h-screen bg-mc-paper font-mc-sans text-mc-ink">
      <header className="sticky top-0 z-10 border-b border-mc-line bg-mc-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-mc-mute">Internal · 운영 도구</p>
            <h1 className="font-mc-serif text-2xl">Mycerra 콘텐츠 관리</h1>
          </div>
          <nav className="flex flex-wrap gap-1" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn("rounded-full px-4 py-1.5 text-sm", tab === t.id ? "bg-mc-ink text-mc-paper" : "hover:bg-mc-cream")}
              >
                {t.label}
                {t.id !== "publish" && dirty[t.id] && <span className="ml-1 text-mc-marigold">●</span>}
              </button>
            ))}
          </nav>
          <div className="flex gap-2">
            <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm underline">
              <ExternalLink className="h-3.5 w-3.5" /> 사이트 보기
            </a>
            <a href="/admin/invoice" target="_blank" rel="noreferrer" className="text-sm underline">
              인보이스 작성기
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] px-6 py-8">
        {tab !== "publish" && (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Btn variant="dark" onClick={() => save(tab)} disabled={!dirty[tab]}>
              <Save className="h-3.5 w-3.5" /> 저장
            </Btn>
            <Btn onClick={() => setDraft({ ...draft, [tab]: structuredClone(saved![tab]) })} disabled={!dirty[tab]}>
              변경 취소
            </Btn>
            {status && (
              <span className={cn("text-sm", status.kind === "ok" ? "text-emerald-700" : "text-red-700")} role="status">
                {status.text}
              </span>
            )}
          </div>
        )}
        {status?.errors && (
          <ul className="mb-6 list-disc space-y-1 border border-red-700/30 bg-red-50 p-4 pl-8 text-sm text-red-800" data-testid="cms-errors">
            {status.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}

        {tab === "site" && (
          <>
            <p className="mb-4 text-xs text-mc-mute">
              수정 → 저장하면 오른쪽 미리보기에 반영됩니다. 섹션 구성(추가·삭제)은 디자인과 짝을 이루므로 순서 변경·숨기기만 할 수 있습니다.
            </p>
            <PagesTab data={draft.site} setData={set("site")} tick={previewTick} />
          </>
        )}
        {tab === "products" && <ProductsTab data={draft.products} setData={set("products")} commerce={draft.commerce} />}
        {tab === "commerce" && <CommerceTab data={draft.commerce} setData={set("commerce")} />}
        {tab === "test-reports" && <TestsTab data={draft["test-reports"]} setData={set("test-reports")} />}
        {tab === "news" && <NewsTab data={draft.news} setData={set("news")} />}
        {tab === "seo" && <SeoTab data={draft.seo} setData={set("seo")} />}
        {tab === "publish" && <PublishTab />}
      </main>
    </div>
  );
};

export default ContentManager;

import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PriceMatrix } from "@/components/shop/PriceMatrix";
import { ProductCard } from "@/components/shop/ProductCard";
import { Container, Display, Eyebrow } from "@/components/site/primitives";
import { categories, products, type CategoryId } from "@/content/shop";
import { useCopy, useLang } from "@/i18n/LanguageProvider";

const copy = {
  en: {
    eyebrow: "Mycerra™ shop",
    title: "From the pure mat to finished leather.",
    intro:
      "Four processing conditions, each in a 30 × 30 cm sample and three regular sheet sizes. Pay online with PayPal, or send a purchase order request for volume and business terms.",
    pricingTitle: "Sizes & prices",
    pricingNote: "Price per piece = area × price per sqft of the processing condition.",
    all: "All",
    summary: (available: number, target: number) => `${available} available now · ${target} planned`,
    hideSoon: "Show available only",
  },
  ko: {
    eyebrow: "Mycerra™ 쇼핑몰",
    title: "순수원단부터 최종 피니시 원단까지.",
    intro:
      "4가지 가공 조건을 30 × 30 cm 샘플과 3가지 정규원단 크기로 판매합니다. PayPal로 바로 결제하거나, 대량·기업 거래는 발주희망서를 보내 주세요.",
    pricingTitle: "원단 크기와 가격",
    pricingNote: "장당 가격 = 면적 × 가공 조건별 sqft 단가.",
    all: "전체",
    summary: (available: number, target: number) => `주문 가능 ${available}종 · 총 ${target}종 구성`,
    hideSoon: "주문 가능 품목만 보기",
  },
};

const Shop = () => {
  const c = useCopy(copy);
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const catParam = params.get("cat");
  const cat = categories.some((x) => x.id === catParam) ? (catParam as CategoryId) : null;
  const onlyAvailable = params.get("available") === "1";

  const update = (next: { cat?: CategoryId | null; available?: boolean }) => {
    const p = new URLSearchParams(params);
    if (next.cat !== undefined) {
      if (next.cat) p.set("cat", next.cat);
      else p.delete("cat");
    }
    if (next.available !== undefined) {
      if (next.available) p.set("available", "1");
      else p.delete("available");
    }
    setParams(p, { replace: true });
  };

  const shown = useMemo(
    () =>
      products.filter((p) => (!cat || p.category === cat) && (!onlyAvailable || p.status === "available")),
    [cat, onlyAvailable],
  );
  const visibleCategories = cat ? categories.filter((x) => x.id === cat) : categories;

  return (
    <>
      <section className="pb-14 pt-36 md:pt-44">
        <Container>
          <Eyebrow>{c.eyebrow}</Eyebrow>
          <Display as="h1" className="mt-5 max-w-5xl text-[clamp(2.75rem,7vw,6.5rem)]">
            {c.title}
          </Display>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-mc-mute">{c.intro}</p>
        </Container>
      </section>

      {/* 원단 크기 × 가공 조건 가격표 */}
      <Container className="pb-14">
        <h2 className="font-mc-serif text-2xl font-light">{c.pricingTitle}</h2>
        <div className="mt-5">
          <PriceMatrix />
        </div>
        <p className="mt-3 text-xs text-mc-mute">{c.pricingNote}</p>
      </Container>

      {/* 카테고리 탭 */}
      <div className="sticky top-16 z-30 border-y border-mc-line bg-mc-paper/95 backdrop-blur">
        <Container className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0" role="tablist">
            {[null, ...categories.map((x) => x.id)].map((id) => {
              const count = id ? products.filter((p) => p.category === id).length : products.length;
              const label = id ? t(categories.find((x) => x.id === id)!.title) : c.all;
              return (
                <button
                  key={id ?? "all"}
                  type="button"
                  role="tab"
                  aria-selected={cat === id}
                  onClick={() => update({ cat: id })}
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-2 text-sm transition-colors",
                    cat === id ? "border-mc-ink bg-mc-ink text-mc-paper" : "border-mc-line hover:border-mc-ink",
                  )}
                >
                  {label}
                  <span className="ml-1.5 opacity-50">{count}</span>
                </button>
              );
            })}
          </div>
          <label className="flex items-center gap-2 text-sm text-mc-mute">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => update({ available: e.target.checked })}
              className="h-4 w-4 accent-mc-ink"
            />
            {c.hideSoon}
          </label>
        </Container>
      </div>

      <Container className="pb-24">
        {visibleCategories.map((category) => {
          const list = shown.filter((p) => p.category === category.id);
          if (!list.length) return null;
          const availableCount = products.filter((p) => p.category === category.id && p.status === "available").length;
          return (
            <section key={category.id} id={category.id} className="scroll-mt-40 border-b border-mc-line py-14 last:border-0">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <Display className="text-4xl md:text-5xl">{t(category.title)}</Display>
                  <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-mc-mute">{t(category.summary)}</p>
                </div>
                <p className="text-sm text-mc-mute">{c.summary(availableCount, category.target)}</p>
              </div>
              <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4 lg:grid-cols-5">
                {list.map((p) => (
                  <ProductCard key={p.sku} product={p} />
                ))}
              </div>
            </section>
          );
        })}
      </Container>
    </>
  );
};

export default Shop;

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductCard, ProductImage } from "@/components/shop/ProductCard";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { Container, Display, Eyebrow, PillButton, TextLink } from "@/components/site/primitives";
import { categories, comingSoonLabel, priceOf, productBySku, products, productSpecs } from "@/content/shop";
import { areaSqft, formatUSD, retail, round2, sizeDims, seller, unitAreaSqft, unitLabel } from "@/content/commerce";
import type { Size } from "@/content/schema";
import { MAX_LINE_QTY, useCart } from "@/shop/CartProvider";
import { useCopy, useLang } from "@/i18n/LanguageProvider";
import { useSeo } from "@/lib/seo";
import NotFound from "@/pages/site/NotFound";

const copy = {
  en: {
    back: "Back to shop",
    size: "Size",
    perPiece: "per piece",
    perSet: "per set",
    qty: "Quantity",
    pcs: "pcs",
    area: "Area",
    lineTotal: "Line total",
    add: "Add to cart",
    added: "Added to cart",
    viewCart: "View cart",
    soonBody: "This item is part of the planned range and is not yet available to order. Leave your details and we will notify you.",
    notify: "Notify me",
    rules: [
      `Regular sheets: minimum ${retail.minSqft} sqft per order — paid online with PayPal.`,
      `Swatch brochures (10 swatches of 30 × 30 cm) can be ordered on their own, up to ${retail.brochureMaxPerOrder} sets per order. Single swatches are not sold.`,
      `Above ${retail.maxSqft} sqft, or for business terms, send a purchase order request and we reply with an approved invoice.`,
    ],
    specs: "Specifications",
    onRequest: "On request",
    reports: "Performance test reports",
    library: "See it in the material library",
    related: "More in this range",
  },
  ko: {
    back: "쇼핑몰로 돌아가기",
    size: "원단 크기",
    perPiece: "장당",
    perSet: "세트당",
    qty: "수량",
    pcs: "장",
    area: "면적",
    lineTotal: "품목 금액",
    add: "장바구니 담기",
    added: "장바구니에 담았습니다",
    viewCart: "장바구니 보기",
    soonBody: "이 품목은 구성 예정 라인업으로 아직 주문할 수 없습니다. 연락처를 남겨 주시면 출시 시 알려 드립니다.",
    notify: "출시 알림 신청",
    rules: [
      `정규원단: 주문당 최소 ${retail.minSqft} sqft, PayPal로 바로 결제합니다.`,
      `스와치 브로셔(30 × 30 cm 10장 1세트)는 단독 주문 가능하며 주문당 최대 ${retail.brochureMaxPerOrder}세트입니다. 낱장은 판매하지 않습니다.`,
      `${retail.maxSqft} sqft 초과 또는 기업 거래 조건은 발주희망서를 보내 주세요. 승인 인보이스로 회신합니다.`,
    ],
    specs: "사양",
    onRequest: "문의",
    reports: "성능 시험 성적서",
    library: "소재 라이브러리에서 보기",
    related: "같은 라인의 다른 원단",
  },
};

/** 크기를 고르면 정규원단은 최소 주문량을 채우는 장수를, 브로셔는 1세트를 기본값으로 */
const defaultQty = (s: Size) => (s.kind === "brochure" ? 1 : Math.max(1, Math.ceil(retail.minSqft / areaSqft(s))));

const ProductDetail = () => {
  const { sku = "" } = useParams();
  const product = productBySku(sku);
  const c = useCopy(copy);
  const { t } = useLang();
  const { add } = useCart();
  const firstRegular = product?.sizes.find((s) => s.kind === "regular") ?? product?.sizes[0];
  const [sizeId, setSizeId] = useState(firstRegular?.id ?? "");
  const [qty, setQty] = useState(firstRegular ? defaultQty(firstRegular) : 1);
  const [added, setAdded] = useState(false);

  useSeo(
    product
      ? {
          title: `${product.name} (${product.sku}) — Mycerra™ Shop`,
          description: t(product.description),
          image: product.image,
        }
      : null,
  );

  if (!product) return <NotFound />;

  const category = categories.find((x) => x.id === product.category)!;
  const soon = product.status === "coming-soon";
  const size = product.sizes.find((s) => s.id === sizeId) ?? product.sizes[0];
  const unit = priceOf(product, size.id);
  const related = products.filter((p) => p.category === product.category && p.sku !== product.sku).slice(0, 5);

  return (
    <>
      <Container className="pb-20 pt-28 md:pt-32">
        <nav className="flex items-center gap-2 text-sm text-mc-mute">
          <Link to="/shop" className="hover:text-mc-ink">
            {c.back}
          </Link>
          <span>/</span>
          <Link to={`/shop?cat=${category.id}`} className="hover:text-mc-ink">
            {t(category.title)}
          </Link>
        </nav>

        <div className="mt-8 grid gap-12 md:grid-cols-12">
          <div className="md:col-span-7">
            <div className="aspect-[4/5] overflow-hidden bg-mc-line md:aspect-[4/3]">
              <ProductImage product={product} />
            </div>
          </div>

          <div className="md:col-span-5">
            <Eyebrow>
              {t(category.title)} · {product.sku}
            </Eyebrow>
            <Display as="h1" className="mt-4 text-5xl md:text-6xl">
              {product.name}
            </Display>
            <p className="mt-5 text-[15px] leading-relaxed text-mc-mute">{t(product.description)}</p>

            {soon ? (
              <div className="mt-10 border-t border-mc-line pt-8">
                <span className="rounded-full border border-dashed border-mc-ink/30 px-3 py-1 text-xs uppercase tracking-[0.16em] text-mc-mute">
                  {t(comingSoonLabel)}
                </span>
                <p className="mt-5 text-[15px] leading-relaxed text-mc-mute">{c.soonBody}</p>
                <PillButton
                  href={`mailto:${seller.email}?subject=${encodeURIComponent(`[Mycerra Shop] Notify me: ${product.sku}`)}`}
                  className="mt-6"
                >
                  {c.notify}
                </PillButton>
              </div>
            ) : (
              <div className="mt-10 space-y-7 border-t border-mc-line pt-8">
                <fieldset>
                  <legend className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">{c.size}</legend>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {product.sizes.map((s) => {
                      const active = s.id === size.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          aria-pressed={active}
                          data-size={s.id}
                          onClick={() => {
                            setSizeId(s.id);
                            setQty(defaultQty(s));
                            setAdded(false);
                          }}
                          className={cn(
                            "border p-3 text-left transition-colors",
                            active ? "border-mc-ink bg-mc-ink text-mc-paper" : "border-mc-line hover:border-mc-ink",
                          )}
                        >
                          <span className="block font-mc-serif text-lg">{t(s.label)}</span>
                          <span className={cn("block text-xs", active ? "text-mc-paper/70" : "text-mc-mute")}>
                            {sizeDims(s)} · {unitAreaSqft(s).toFixed(2)} sqft
                          </span>
                          <span className="mt-1 block text-sm">
                            {formatUSD(priceOf(product, s.id))}{" "}
                            <span className={active ? "text-mc-paper/60" : "text-mc-mute"}>
                              {s.kind === "brochure" ? c.perSet : c.perPiece}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">{c.qty}</p>
                    <div className="mt-3">
                      <QuantityStepper
                        value={qty}
                        unit={t(unitLabel(size))}
                        onChange={(v) => {
                          setQty(v);
                          setAdded(false);
                        }}
                        max={size.kind === "brochure" ? retail.brochureMaxPerOrder : MAX_LINE_QTY}
                        label={c.qty}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">{c.lineTotal}</p>
                    <p className="mt-3 font-mc-serif text-2xl" data-testid="line-total">
                      {formatUSD(round2(unit * qty))}
                    </p>
                    <p className="text-xs text-mc-mute" data-testid="line-area">
                      {c.area} {round2(unitAreaSqft(size) * qty).toFixed(2)} sqft
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    add(product.sku, size.id, qty);
                    setAdded(true);
                  }}
                  className="w-full rounded-full bg-mc-ink px-8 py-3.5 text-sm text-mc-paper transition-colors hover:bg-mc-burgundy"
                >
                  {c.add}
                </button>
                {added && (
                  <p className="flex items-center justify-between gap-3 bg-mc-cream px-4 py-3 text-sm" role="status">
                    <span className="flex items-center gap-2">
                      <Check className="h-4 w-4" /> {c.added}
                    </span>
                    <Link to="/shop/cart" className="underline underline-offset-4">
                      {c.viewCart}
                    </Link>
                  </p>
                )}
                <ul className="space-y-1.5 text-xs leading-relaxed text-mc-mute">
                  {c.rules.map((r) => (
                    <li key={r} className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-mc-mute" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-10">
              <p className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">{c.specs}</p>
              <dl className="mt-3 divide-y divide-mc-line border-y border-mc-line text-sm">
                {productSpecs.map((s) => (
                  <div key={s.label.en} className="flex justify-between gap-6 py-3">
                    <dt className="text-mc-mute">{t(s.label)}</dt>
                    <dd className="text-right">{s.value ? t(s.value) : <span className="text-mc-mute">{c.onRequest}</span>}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
                <TextLink to="/technology#test-reports">{c.reports}</TextLink>
                {product.libraryCode && <TextLink to={`/mycerra?code=${product.libraryCode}`}>{c.library}</TextLink>}
              </div>
            </div>
          </div>
        </div>
      </Container>

      {related.length > 0 && (
        <section className="border-t border-mc-line py-16 md:py-20">
          <Container>
            <Display className="text-3xl md:text-4xl">{c.related}</Display>
            <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-5">
              {related.map((p) => (
                <ProductCard key={p.sku} product={p} />
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
};

// 다른 상품으로 이동하면 크기·수량 선택을 초기화한다
const ProductDetailPage = () => {
  const { sku } = useParams();
  return <ProductDetail key={sku} />;
};

export default ProductDetailPage;

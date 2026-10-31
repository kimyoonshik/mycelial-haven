import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductCard, ProductImage } from "@/components/shop/ProductCard";
import { Container, Display, Eyebrow, PillButton, Price, TextLink } from "@/components/site/primitives";
import {
  categories,
  comingSoonLabel,
  formatLabel,
  productBySku,
  products,
  productSpecs,
  type OrderFormat,
} from "@/content/shop";
import { company } from "@/content/mycerra";
import { useCart } from "@/shop/CartProvider";
import { useCopy, useLang } from "@/i18n/LanguageProvider";
import NotFound from "@/pages/NotFound";

const copy = {
  en: {
    back: "Back to shop",
    format: "Format",
    qty: "Quantity",
    add: "Add to cart",
    added: "Added to cart",
    viewCart: "View cart",
    soonBody: "This item is part of the planned range and is not yet available to order. Leave your details and we will notify you.",
    notify: "Notify me",
    specs: "Specifications",
    onRequest: "On request",
    reports: "Performance test reports",
    library: "See it in the material library",
    related: "More in this range",
    quoteNote: "Prices are confirmed with a quote. Submitting your cart sends an order request — no payment is taken online yet.",
  },
  ko: {
    back: "쇼핑몰로 돌아가기",
    format: "형태",
    qty: "수량",
    add: "장바구니 담기",
    added: "장바구니에 담았습니다",
    viewCart: "장바구니 보기",
    soonBody: "이 품목은 구성 예정 라인업으로 아직 주문할 수 없습니다. 연락처를 남겨 주시면 출시 시 알려 드립니다.",
    notify: "출시 알림 신청",
    specs: "사양",
    onRequest: "문의",
    reports: "성능 시험 성적서",
    library: "소재 라이브러리에서 보기",
    related: "같은 라인의 다른 원단",
    quoteNote: "가격은 견적으로 확정됩니다. 장바구니를 제출하면 주문 요청이 접수되며, 아직 온라인 결제는 진행되지 않습니다.",
  },
};

const ProductDetail = () => {
  const { sku = "" } = useParams();
  const product = productBySku(sku);
  const c = useCopy(copy);
  const { t } = useLang();
  const { add } = useCart();
  const [format, setFormat] = useState<OrderFormat>("swatch");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product) return <NotFound />;

  const category = categories.find((x) => x.id === product.category)!;
  const soon = product.status === "coming-soon";
  const related = products.filter((p) => p.category === product.category && p.sku !== product.sku).slice(0, 5);

  const onAdd = () => {
    add(product.sku, format, qty);
    setAdded(true);
  };

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
                  href={`mailto:${company.email}?subject=${encodeURIComponent(`[Mycerra Shop] Notify me: ${product.sku}`)}`}
                  className="mt-6"
                >
                  {c.notify}
                </PillButton>
              </div>
            ) : (
              <div className="mt-10 space-y-8 border-t border-mc-line pt-8">
                <fieldset>
                  <legend className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">{c.format}</legend>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(["swatch", "sheet"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        aria-pressed={format === f}
                        onClick={() => {
                          setFormat(f);
                          setAdded(false);
                        }}
                        className={cn(
                          "border p-4 text-left transition-colors",
                          format === f ? "border-mc-ink bg-mc-ink text-mc-paper" : "border-mc-line hover:border-mc-ink",
                        )}
                      >
                        <span className="block font-mc-serif text-lg">{t(formatLabel[f])}</span>
                        <Price value={product.price[f]} className={cn("text-xs", format === f ? "text-mc-paper/70" : "text-mc-mute")} />
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">{c.qty}</p>
                    <div className="mt-3 flex items-center border border-mc-line">
                      <button
                        type="button"
                        aria-label="−"
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        className="p-3 hover:bg-mc-cream"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={qty}
                        aria-label={c.qty}
                        onChange={(e) => setQty(Math.max(1, Math.min(999, Number(e.target.value) || 1)))}
                        className="w-14 bg-transparent text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        aria-label="+"
                        onClick={() => setQty((q) => Math.min(999, q + 1))}
                        className="p-3 hover:bg-mc-cream"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onAdd}
                    className="flex-1 rounded-full bg-mc-ink px-8 py-3.5 text-sm text-mc-paper transition-colors hover:bg-mc-burgundy"
                  >
                    {c.add}
                  </button>
                </div>

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
                <p className="text-xs leading-relaxed text-mc-mute">{c.quoteNote}</p>
              </div>
            )}

            <div className="mt-10">
              <p className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">{c.specs}</p>
              <dl className="mt-3 divide-y divide-mc-line border-y border-mc-line text-sm">
                {productSpecs.map((s) => (
                  <div key={s.label.en} className="flex justify-between gap-6 py-3">
                    <dt className="text-mc-mute">{t(s.label)}</dt>
                    <dd>{s.value ? t(s.value) : <span className="text-mc-mute">{c.onRequest}</span>}</dd>
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

// 다른 상품으로 이동하면 형태·수량 선택을 초기화한다
const ProductDetailPage = () => {
  const { sku } = useParams();
  return <ProductDetail key={sku} />;
};

export default ProductDetailPage;

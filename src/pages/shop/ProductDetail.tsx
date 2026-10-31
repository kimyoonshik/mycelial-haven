import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check } from "lucide-react";
import { ProductCard, ProductImage } from "@/components/shop/ProductCard";
import { SqftStepper } from "@/components/shop/SqftStepper";
import { Container, Display, Eyebrow, PillButton, Price, TextLink } from "@/components/site/primitives";
import { categories, comingSoonLabel, productBySku, products, productSpecs, unitPriceOf } from "@/content/shop";
import { formatUSD, retail, round2 } from "@/content/commerce";
import { company } from "@/content/mycerra";
import { MAX_LINE_SQFT, useCart } from "@/shop/CartProvider";
import { useCopy, useLang } from "@/i18n/LanguageProvider";
import NotFound from "@/pages/NotFound";

const copy = {
  en: {
    back: "Back to shop",
    qty: "Quantity",
    unit: "Unit price",
    lineTotal: "Line total",
    add: "Add to cart",
    added: "Added to cart",
    viewCart: "View cart",
    soonBody: "This item is part of the planned range and is not yet available to order. Leave your details and we will notify you.",
    notify: "Notify me",
    rules: [
      `Individual orders: minimum ${retail.minSqft} sqft per order, paid online with PayPal.`,
      `Orders above ${retail.maxSqft} sqft, or business terms: send a purchase order request and we reply with an approved invoice.`,
    ],
    specs: "Specifications",
    onRequest: "On request",
    reports: "Performance test reports",
    library: "See it in the material library",
    related: "More in this range",
  },
  ko: {
    back: "쇼핑몰로 돌아가기",
    qty: "수량",
    unit: "단가",
    lineTotal: "품목 금액",
    add: "장바구니 담기",
    added: "장바구니에 담았습니다",
    viewCart: "장바구니 보기",
    soonBody: "이 품목은 구성 예정 라인업으로 아직 주문할 수 없습니다. 연락처를 남겨 주시면 출시 시 알려 드립니다.",
    notify: "출시 알림 신청",
    rules: [
      `개인 주문: 주문당 최소 ${retail.minSqft} sqft, PayPal로 바로 결제합니다.`,
      `${retail.maxSqft} sqft 초과 주문이나 기업 거래 조건이 필요하면 발주희망서를 보내 주세요. 승인 인보이스로 회신합니다.`,
    ],
    specs: "사양",
    onRequest: "문의",
    reports: "성능 시험 성적서",
    library: "소재 라이브러리에서 보기",
    related: "같은 라인의 다른 원단",
  },
};

const ProductDetail = () => {
  const { sku = "" } = useParams();
  const product = productBySku(sku);
  const c = useCopy(copy);
  const { t } = useLang();
  const { add } = useCart();
  const [sqft, setSqft] = useState<number>(retail.minSqft);
  const [added, setAdded] = useState(false);

  if (!product) return <NotFound />;

  const category = categories.find((x) => x.id === product.category)!;
  const soon = product.status === "coming-soon";
  const unit = unitPriceOf(product);
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
                  href={`mailto:${company.email}?subject=${encodeURIComponent(`[Mycerra Shop] Notify me: ${product.sku}`)}`}
                  className="mt-6"
                >
                  {c.notify}
                </PillButton>
              </div>
            ) : (
              <div className="mt-10 space-y-6 border-t border-mc-line pt-8">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">{c.unit}</span>
                  <Price value={unit} perSqft className="font-mc-serif text-2xl" />
                </div>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">{c.qty}</p>
                    <div className="mt-3">
                      <SqftStepper
                        value={sqft}
                        onChange={(v) => {
                          setSqft(v);
                          setAdded(false);
                        }}
                        max={MAX_LINE_SQFT}
                        label={c.qty}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">{c.lineTotal}</p>
                    <p className="mt-3 font-mc-serif text-2xl" data-testid="line-total">
                      {formatUSD(round2(unit * sqft))}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    add(product.sku, sqft);
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

// 다른 상품으로 이동하면 수량 선택을 초기화한다
const ProductDetailPage = () => {
  const { sku } = useParams();
  return <ProductDetail key={sku} />;
};

export default ProductDetailPage;

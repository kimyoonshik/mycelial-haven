import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductImage } from "@/components/shop/ProductCard";
import { SqftStepper } from "@/components/shop/SqftStepper";
import { Container, Display, Eyebrow, PillButton } from "@/components/site/primitives";
import { categories } from "@/content/shop";
import { formatUSD, orderTotals, retail } from "@/content/commerce";
import { MAX_LINE_SQFT, useCart } from "@/shop/CartProvider";
import { useCopy, useLang } from "@/i18n/LanguageProvider";

const copy = {
  en: {
    eyebrow: "Cart",
    title: "Your cart",
    empty: "Your cart is empty.",
    browse: "Browse the shop",
    remove: "Remove",
    qty: "Quantity",
    totalSqft: "Total quantity",
    items: "Items",
    shipping: "Shipping",
    included: "Included",
    total: "Total",
    clear: "Clear cart",
    belowMin: (missing: number) => `Add ${missing} sqft more to reach the ${retail.minSqft} sqft minimum order.`,
    retailOk: `Pay now with PayPal, or send a purchase order request for business terms.`,
    overMax: `Orders above ${retail.maxSqft} sqft are handled by purchase order: send your request and we reply with an approved invoice covering price, quantity and terms.`,
    checkout: "Checkout with PayPal",
    po: "Send a purchase order request",
    rulesTitle: "How ordering works",
    rules: [
      `Individual orders · ${retail.minSqft}–${retail.maxSqft} sqft · ${formatUSD(retail.unitPriceUSD)} / sqft · instant PayPal payment`,
      `Volume & business orders · above ${retail.maxSqft} sqft or custom terms · purchase order → approved invoice → payment → shipment`,
      "Buyers in Korea · domestic bank transfer with a tax invoice (PayPal does not support payments between Korean accounts)",
    ],
  },
  ko: {
    eyebrow: "장바구니",
    title: "장바구니",
    empty: "장바구니가 비어 있습니다.",
    browse: "쇼핑몰 둘러보기",
    remove: "삭제",
    qty: "수량",
    totalSqft: "총 수량",
    items: "상품 금액",
    shipping: "배송비",
    included: "포함",
    total: "합계",
    clear: "장바구니 비우기",
    belowMin: (missing: number) => `최소 주문량 ${retail.minSqft} sqft까지 ${missing} sqft가 더 필요합니다.`,
    retailOk: "PayPal로 바로 결제하거나, 기업 거래 조건이 필요하면 발주희망서를 보내 주세요.",
    overMax: `${retail.maxSqft} sqft 초과 주문은 발주서로 진행합니다. 발주희망서를 보내 주시면 가격·물량·거래조건을 담은 승인 인보이스로 회신합니다.`,
    checkout: "PayPal로 결제하기",
    po: "발주희망서 보내기",
    rulesTitle: "주문 방법",
    rules: [
      `개인 주문 · ${retail.minSqft}–${retail.maxSqft} sqft · sqft당 ${formatUSD(retail.unitPriceUSD)} · PayPal 즉시 결제`,
      `대량·기업 주문 · ${retail.maxSqft} sqft 초과 또는 별도 조건 · 발주희망서 → 승인 인보이스 → 결제 → 발송`,
      "국내 구매자 · 원화 계좌이체와 세금계산서 (한국 계정 간 PayPal 결제 불가)",
    ],
  },
};

const Cart = () => {
  const c = useCopy(copy);
  const { t } = useLang();
  const { rows, totalSqft, itemTotalUSD, setSqft, remove, clear } = useCart();

  if (!rows.length) {
    return (
      <Container className="pb-32 pt-36 md:pt-44">
        <Eyebrow>{c.eyebrow}</Eyebrow>
        <Display as="h1" className="mt-5 text-5xl md:text-6xl">
          {c.empty}
        </Display>
        <PillButton to="/shop" className="mt-10">
          {c.browse}
        </PillButton>
      </Container>
    );
  }

  const totals = orderTotals(itemTotalUSD);
  const belowMin = totalSqft < retail.minSqft;
  const overMax = totalSqft > retail.maxSqft;

  return (
    <Container className="pb-24 pt-36 md:pt-44">
      <Eyebrow>{c.eyebrow}</Eyebrow>
      <Display as="h1" className="mt-5 text-5xl md:text-6xl">
        {c.title}
      </Display>

      <div className="mt-12 grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ul className="divide-y divide-mc-line border-y border-mc-ink">
            {rows.map((r) => (
              <li key={r.sku} className="grid grid-cols-[88px_1fr] gap-5 py-5">
                <Link to={`/shop/p/${r.sku}`} className="aspect-square overflow-hidden bg-mc-line">
                  <ProductImage product={r.product} />
                </Link>
                <div className="flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link to={`/shop/p/${r.sku}`} className="font-mc-serif text-lg hover:underline">
                        {r.product.name}
                      </Link>
                      <p className="text-xs text-mc-mute">
                        {r.sku} · {t(categories.find((x) => x.id === r.product.category)!.title)} ·{" "}
                        {formatUSD(r.unitPriceUSD)} / sqft
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(r.sku)}
                      aria-label={`${c.remove} ${r.product.name}`}
                      className="p-1 text-mc-mute hover:text-mc-ink"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <SqftStepper
                      size="sm"
                      value={r.sqft}
                      onChange={(v) => setSqft(r.sku, v)}
                      max={MAX_LINE_SQFT}
                      label={`${c.qty} ${r.sku}`}
                    />
                    <span className="text-sm">{formatUSD(r.lineTotalUSD)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <button type="button" onClick={clear} className="mt-6 text-sm text-mc-mute underline underline-offset-4">
            {c.clear}
          </button>
        </div>

        <aside className="lg:col-span-5">
          <dl className="space-y-3 border-b border-mc-line pb-6 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-mc-mute">{c.totalSqft}</dt>
              <dd data-testid="total-sqft">{totalSqft} sqft</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-mc-mute">{c.items}</dt>
              <dd>{formatUSD(itemTotalUSD)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-mc-mute">{c.shipping}</dt>
              <dd>{totals.shipping === 0 ? c.included : formatUSD(totals.shipping)}</dd>
            </div>
          </dl>
          <div className="flex items-baseline justify-between py-6">
            <span className="text-sm uppercase tracking-[0.16em]">{c.total}</span>
            <span className="font-mc-serif text-3xl" data-testid="cart-total">
              {formatUSD(totals.total)}
            </span>
          </div>

          <p
            className={cn("mb-6 px-4 py-3 text-sm leading-relaxed", belowMin || overMax ? "bg-mc-cream" : "bg-mc-cream/60")}
            role="status"
          >
            {belowMin ? c.belowMin(retail.minSqft - totalSqft) : overMax ? c.overMax : c.retailOk}
          </p>

          <div className="flex flex-col gap-3">
            {!overMax && (
              <Link
                to={belowMin ? "#" : "/shop/checkout"}
                aria-disabled={belowMin}
                onClick={(e) => belowMin && e.preventDefault()}
                className={cn(
                  "rounded-full px-8 py-3.5 text-center text-sm transition-colors",
                  belowMin ? "cursor-not-allowed bg-mc-line text-mc-mute" : "bg-mc-ink text-mc-paper hover:bg-mc-burgundy",
                )}
              >
                {c.checkout}
              </Link>
            )}
            <Link
              to="/shop/po"
              className={cn(
                "rounded-full px-8 py-3.5 text-center text-sm transition-colors",
                overMax ? "bg-mc-ink text-mc-paper hover:bg-mc-burgundy" : "border border-mc-ink/30 hover:border-mc-ink",
              )}
            >
              {c.po}
            </Link>
          </div>

          <div className="mt-10">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">{c.rulesTitle}</p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-mc-mute">
              {c.rules.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-mc-mute" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </Container>
  );
};

export default Cart;

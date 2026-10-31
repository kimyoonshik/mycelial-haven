import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Container, Display, Eyebrow, PillButton } from "@/components/site/primitives";
import { countries, formatUSD, makeRef, orderTotals, paypalClientId, retail, routeFor, seller } from "@/content/commerce";
import { useCart, type CartRow } from "@/shop/CartProvider";
import { buildOrder, loadPayPal, type Buyer, type PayPalCapture } from "@/shop/paypal";
import { loadBuyer, saveBuyer } from "@/shop/buyerStore";
import { useCopy, useLang } from "@/i18n/LanguageProvider";

const copy = {
  en: {
    eyebrow: "Checkout",
    title: "Individual order",
    empty: "Your cart is empty.",
    browse: "Browse the shop",
    belowMin: `The minimum order is ${retail.minSqft} sqft. Please add more material to your cart.`,
    overMax: `Orders above ${retail.maxSqft} sqft are handled by purchase order.`,
    backToCart: "Back to cart",
    toPo: "Send a purchase order request",
    details: "Shipping details",
    name: "Full name *",
    email: "Email *",
    phone: "Phone *",
    country: "Country *",
    select: "Select…",
    address1: "Address *",
    address2: "Address line 2",
    city: "City *",
    state: "State / province",
    postal: "Postal code *",
    terms:
      "I understand Mycerra™ is a cultivated natural material, so colour and texture vary slightly between batches, and I agree to the order terms.",
    payment: "Payment",
    fillFirst: "Complete your shipping details and accept the terms to continue.",
    domesticTitle: "Ordering from Korea",
    domesticBody:
      "PayPal does not support payments between Korean accounts. We will issue a quote and tax invoice and you pay by domestic bank transfer (KRW).",
    domesticCta: "Continue with a purchase order request",
    paypalNote: "You will pay securely with PayPal or a card. Your order reference is included in the PayPal receipt.",
    fallbackTitle: "Request a PayPal invoice",
    fallbackBody:
      "Online payment is being connected. Send your order and we will email a PayPal invoice you can pay by PayPal or card.",
    fallbackCta: "Send order and request invoice",
    fallbackSent: "Your email app should now be open with the order. We reply with a PayPal invoice.",
    loadError: "PayPal could not be loaded. Please try again, or request an invoice by email.",
    summary: "Order summary",
    ref: "Order reference",
    items: "Items",
    shipping: "Shipping",
    included: "Included",
    total: "Total",
    paidTitle: "Payment received — thank you.",
    paidBody: "We will confirm your order and shipping date by email. Please keep your order reference.",
    captureId: "PayPal transaction",
    continue: "Continue shopping",
  },
  ko: {
    eyebrow: "결제",
    title: "개인 주문",
    empty: "장바구니가 비어 있습니다.",
    browse: "쇼핑몰 둘러보기",
    belowMin: `최소 주문량은 ${retail.minSqft} sqft입니다. 장바구니에 원단을 더 담아 주세요.`,
    overMax: `${retail.maxSqft} sqft 초과 주문은 발주서로 진행합니다.`,
    backToCart: "장바구니로 돌아가기",
    toPo: "발주희망서 보내기",
    details: "배송 정보",
    name: "이름 *",
    email: "이메일 *",
    phone: "전화번호 *",
    country: "국가 *",
    select: "선택…",
    address1: "주소 *",
    address2: "상세 주소",
    city: "도시 *",
    state: "주 / 도",
    postal: "우편번호 *",
    terms: "Mycerra™는 배양한 천연 소재로 배치마다 색상과 질감이 조금씩 다를 수 있음을 이해하며, 주문 조건에 동의합니다.",
    payment: "결제",
    fillFirst: "배송 정보를 모두 입력하고 주문 조건에 동의하면 결제할 수 있습니다.",
    domesticTitle: "국내 주문 안내",
    domesticBody:
      "한국 PayPal 계정 간에는 결제가 지원되지 않습니다. 견적서와 세금계산서를 발행해 드리며, 원화 계좌이체로 결제합니다.",
    domesticCta: "발주희망서로 계속하기",
    paypalNote: "PayPal 또는 카드로 안전하게 결제합니다. PayPal 영수증에 주문번호가 함께 표시됩니다.",
    fallbackTitle: "PayPal 인보이스 요청",
    fallbackBody: "온라인 결제를 연결하는 중입니다. 주문을 보내 주시면 PayPal·카드로 결제할 수 있는 인보이스를 이메일로 보내 드립니다.",
    fallbackCta: "주문 보내고 인보이스 요청",
    fallbackSent: "메일 앱이 열렸습니다. PayPal 인보이스로 회신해 드립니다.",
    loadError: "PayPal을 불러오지 못했습니다. 다시 시도하거나 이메일로 인보이스를 요청해 주세요.",
    summary: "주문 요약",
    ref: "주문번호",
    items: "상품 금액",
    shipping: "배송비",
    included: "포함",
    total: "합계",
    paidTitle: "결제가 완료되었습니다. 감사합니다.",
    paidBody: "주문 확인과 발송 일정을 이메일로 안내해 드립니다. 주문번호를 보관해 주세요.",
    captureId: "PayPal 거래번호",
    continue: "쇼핑 계속하기",
  },
};

type Copy = (typeof copy)["en"];

const inputCls =
  "w-full border-0 border-b border-mc-line bg-transparent px-0 py-3 text-[15px] outline-none transition-colors focus:border-mc-ink";

const Field = ({ label, children, className }: { label: string; children: ReactNode; className?: string }) => (
  <label className={cn("block", className)}>
    <span className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">{label}</span>
    {children}
  </label>
);

const buyerComplete = (b: Buyer) =>
  !!(b.name && /\S+@\S+\.\S+/.test(b.email) && b.phone && b.country && b.address1 && b.city && b.postalCode);

// 주문 요약 (결제 페이지 우측)
const Summary = ({ c, rows, orderRef, totals }: { c: Copy; rows: CartRow[]; orderRef: string; totals: ReturnType<typeof orderTotals> }) => (
  <aside className="bg-mc-cream p-6 md:p-8">
    <p className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">{c.summary}</p>
    <p className="mt-2 text-sm">
      {c.ref}: <span className="font-medium" data-testid="order-ref">{orderRef}</span>
    </p>
    <ul className="mt-6 space-y-3 text-sm">
      {rows.map((r) => (
        <li key={r.sku} className="flex justify-between gap-4">
          <span>
            {r.product.name} <span className="text-mc-mute">· {r.sku} · {r.sqft} sqft</span>
          </span>
          <span>{formatUSD(r.lineTotalUSD)}</span>
        </li>
      ))}
    </ul>
    <dl className="mt-6 space-y-2 border-t border-mc-line pt-4 text-sm">
      <div className="flex justify-between">
        <dt className="text-mc-mute">{c.items}</dt>
        <dd>{formatUSD(totals.itemTotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-mc-mute">{c.shipping}</dt>
        <dd>{totals.shipping === 0 ? c.included : formatUSD(totals.shipping)}</dd>
      </div>
      <div className="flex items-baseline justify-between pt-2">
        <dt className="uppercase tracking-[0.16em]">{c.total}</dt>
        <dd className="font-mc-serif text-2xl" data-testid="checkout-total">
          {formatUSD(totals.total)}
        </dd>
      </div>
    </dl>
  </aside>
);

// PayPal 스마트 버튼 — 장바구니·구매자 정보는 ref 로 최신값을 읽는다
const PayPalButtons = ({
  orderRef,
  rowsRef,
  buyerRef,
  onPaid,
  errorText,
}: {
  orderRef: string;
  rowsRef: React.MutableRefObject<CartRow[]>;
  buyerRef: React.MutableRefObject<Buyer>;
  onPaid: (capture: PayPalCapture) => void;
  errorText: string;
}) => {
  const el = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let instance: { close?: () => void } | null = null;
    loadPayPal(paypalClientId)
      .then((paypal) => {
        if (cancelled || !el.current) return;
        const buttons = paypal.Buttons({
          style: { layout: "vertical", shape: "pill", color: "black", label: "pay" },
          createOrder: (_d, actions) => actions.order.create(buildOrder(orderRef, rowsRef.current, buyerRef.current)),
          onApprove: async (_d, actions) => onPaid(await actions.order.capture()),
          onError: () => setFailed(true),
        });
        instance = buttons;
        return buttons.render(el.current);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      instance?.close?.();
    };
  }, [orderRef, rowsRef, buyerRef, onPaid]);

  return (
    <div>
      <div ref={el} data-testid="paypal-buttons" />
      {failed && <p className="mt-3 text-sm text-red-700">{errorText}</p>}
    </div>
  );
};

const Checkout = () => {
  const c = useCopy(copy);
  const { lang } = useLang();
  const { rows, totalSqft, itemTotalUSD, clear } = useCart();
  const [orderRef] = useState(() => makeRef("MYC"));
  const [buyer, setBuyer] = useState<Buyer>(loadBuyer);
  const [agreed, setAgreed] = useState(false);
  const [paid, setPaid] = useState<{ ref: string; capture: PayPalCapture } | null>(null);
  const [fallbackSent, setFallbackSent] = useState(false);

  // PayPal 콜백이 항상 최신 장바구니·구매자 정보를 쓰도록 ref 로 전달
  const rowsRef = useRef(rows);
  const buyerRef = useRef(buyer);
  rowsRef.current = rows;
  buyerRef.current = buyer;

  useEffect(() => saveBuyer(buyer), [buyer]);

  const totals = orderTotals(itemTotalUSD);
  const route = routeFor(totalSqft, buyer.country || null);
  const ready = buyerComplete(buyer) && agreed;

  const onPaid = useCallback(
    (capture: PayPalCapture) => {
      setPaid({ ref: orderRef, capture });
      clear();
    },
    [orderRef, clear],
  );

  const set = (k: keyof Buyer) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setBuyer((b) => ({ ...b, [k]: e.target.value }));

  if (paid) {
    const captureId = paid.capture.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? paid.capture.id;
    return (
      <Container className="pb-32 pt-36 md:pt-44">
        <CheckCircle2 className="h-10 w-10 text-emerald-700" />
        <Display as="h1" className="mt-6 text-5xl md:text-6xl">
          {c.paidTitle}
        </Display>
        <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-mc-mute">{c.paidBody}</p>
        <dl className="mt-8 space-y-2 text-sm">
          <div>
            {c.ref}: <strong data-testid="paid-ref">{paid.ref}</strong>
          </div>
          <div>
            {c.captureId}: <span data-testid="capture-id">{captureId}</span>
          </div>
        </dl>
        <PillButton to="/shop" className="mt-10">
          {c.continue}
        </PillButton>
      </Container>
    );
  }

  if (!rows.length) {
    return (
      <Container className="pb-32 pt-36 md:pt-44">
        <Display as="h1" className="text-5xl">
          {c.empty}
        </Display>
        <PillButton to="/shop" className="mt-10">
          {c.browse}
        </PillButton>
      </Container>
    );
  }

  if (route === "below-min" || route === "po-volume") {
    return (
      <Container className="pb-32 pt-36 md:pt-44">
        <Eyebrow>{c.eyebrow}</Eyebrow>
        <Display as="h1" className="mt-5 max-w-3xl text-4xl md:text-5xl">
          {route === "below-min" ? c.belowMin : c.overMax}
        </Display>
        <div className="mt-10 flex flex-wrap gap-3">
          <PillButton to="/shop/cart" variant="outline">
            {c.backToCart}
          </PillButton>
          {route === "po-volume" && <PillButton to="/shop/po">{c.toPo}</PillButton>}
        </div>
      </Container>
    );
  }

  const requestInvoice = () => {
    const body = [
      `ORDER ${orderRef} — PayPal invoice requested`,
      ...rows.map((r) => `- ${r.sku} ${r.product.name} | ${r.sqft} sqft × ${formatUSD(r.unitPriceUSD)} = ${formatUSD(r.lineTotalUSD)}`),
      `Total: ${formatUSD(totals.total)} (${totalSqft} sqft, shipping ${totals.shipping === 0 ? "included" : formatUSD(totals.shipping)})`,
      "",
      `Name: ${buyer.name}`,
      `Email: ${buyer.email}`,
      `Phone: ${buyer.phone}`,
      `Ship to: ${[buyer.address1, buyer.address2, buyer.city, buyer.state, buyer.postalCode, buyer.country].filter(Boolean).join(", ")}`,
      `Site language: ${lang.toUpperCase()}`,
    ].join("\n");
    window.location.href = `mailto:${seller.email}?subject=${encodeURIComponent(`[Mycerra Shop] ${orderRef} — PayPal invoice request`)}&body=${encodeURIComponent(body)}`;
    setFallbackSent(true);
  };

  return (
    <Container className="pb-24 pt-36 md:pt-44">
      <Eyebrow>{c.eyebrow}</Eyebrow>
      <Display as="h1" className="mt-5 text-5xl md:text-6xl">
        {c.title}
      </Display>

      <div className="mt-12 grid gap-12 lg:grid-cols-12">
        <div className="space-y-12 lg:col-span-7">
          <section>
            <h2 className="font-mc-serif text-2xl font-light">{c.details}</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <Field label={c.name}>
                <input value={buyer.name} onChange={set("name")} className={inputCls} autoComplete="name" />
              </Field>
              <Field label={c.email}>
                <input type="email" value={buyer.email} onChange={set("email")} className={inputCls} autoComplete="email" />
              </Field>
              <Field label={c.phone}>
                <input type="tel" value={buyer.phone} onChange={set("phone")} className={inputCls} autoComplete="tel" />
              </Field>
              <Field label={c.country}>
                <select value={buyer.country} onChange={set("country")} className={inputCls} autoComplete="country">
                  <option value="">{c.select}</option>
                  {countries.map((x) => (
                    <option key={x.code} value={x.code}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={c.address1} className="sm:col-span-2">
                <input value={buyer.address1} onChange={set("address1")} className={inputCls} autoComplete="address-line1" />
              </Field>
              <Field label={c.address2} className="sm:col-span-2">
                <input value={buyer.address2} onChange={set("address2")} className={inputCls} autoComplete="address-line2" />
              </Field>
              <Field label={c.city}>
                <input value={buyer.city} onChange={set("city")} className={inputCls} autoComplete="address-level2" />
              </Field>
              <Field label={c.state}>
                <input value={buyer.state} onChange={set("state")} className={inputCls} autoComplete="address-level1" />
              </Field>
              <Field label={c.postal}>
                <input value={buyer.postalCode} onChange={set("postalCode")} className={inputCls} autoComplete="postal-code" />
              </Field>
            </div>
            <label className="mt-8 flex items-start gap-3 text-sm text-mc-mute">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 accent-mc-ink"
              />
              {c.terms}
            </label>
          </section>

          <section>
            <h2 className="font-mc-serif text-2xl font-light">{c.payment}</h2>
            <div className="mt-6">
              {route === "po-domestic" ? (
                <div className="bg-mc-cream p-6" data-testid="domestic-route">
                  <p className="font-mc-serif text-xl">{c.domesticTitle}</p>
                  <p className="mt-3 text-sm leading-relaxed text-mc-mute">{c.domesticBody}</p>
                  <PillButton to="/shop/po?domestic=1" className="mt-6">
                    {c.domesticCta}
                  </PillButton>
                </div>
              ) : !ready ? (
                <p className="text-sm text-mc-mute">{c.fillFirst}</p>
              ) : paypalClientId ? (
                <div>
                  <p className="mb-4 text-sm text-mc-mute">{c.paypalNote}</p>
                  <PayPalButtons
                    orderRef={orderRef}
                    rowsRef={rowsRef}
                    buyerRef={buyerRef}
                    onPaid={onPaid}
                    errorText={c.loadError}
                  />
                </div>
              ) : (
                <div className="bg-mc-cream p-6" data-testid="invoice-fallback">
                  <p className="font-mc-serif text-xl">{c.fallbackTitle}</p>
                  <p className="mt-3 text-sm leading-relaxed text-mc-mute">{c.fallbackBody}</p>
                  <button
                    type="button"
                    onClick={requestInvoice}
                    className="mt-6 rounded-full bg-mc-ink px-6 py-3 text-sm text-mc-paper hover:bg-mc-burgundy"
                  >
                    {c.fallbackCta}
                  </button>
                  {fallbackSent && (
                    <p className="mt-3 text-xs text-mc-mute" role="status">
                      {c.fallbackSent}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
          <Link to="/shop/cart" className="inline-block text-sm text-mc-mute underline underline-offset-4">
            {c.backToCart}
          </Link>
        </div>

        <div className="lg:col-span-5">
          <Summary c={c} rows={rows} orderRef={orderRef} totals={totals} />
        </div>
      </div>
    </Container>
  );
};

export default Checkout;

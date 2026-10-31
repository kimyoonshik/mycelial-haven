import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, X } from "lucide-react";
import { ProductImage } from "@/components/shop/ProductCard";
import { Container, Display, Eyebrow, PillButton, Price } from "@/components/site/primitives";
import { categories, formatLabel, productBySku } from "@/content/shop";
import { company } from "@/content/mycerra";
import { useCart } from "@/shop/CartProvider";
import { useCopy, useLang } from "@/i18n/LanguageProvider";

const copy = {
  en: {
    eyebrow: "Cart",
    title: "Your order request",
    empty: "Your cart is empty.",
    browse: "Browse the shop",
    remove: "Remove",
    qty: "Quantity",
    subtotal: "Subtotal",
    quoted: "Confirmed by quote",
    detailsTitle: "Order details",
    name: "Name *",
    company: "Company *",
    country: "Country *",
    email: "Email *",
    address: "Shipping address",
    note: "Notes",
    consent: "I consent to SAVE EARTH Inc. processing my details to handle this order request.",
    submit: "Send order request",
    flow: "We confirm price, lead time and shipping by email, then send a payment link. Online payment is coming soon.",
    sent: "Your email app should now be open with the order request. Your cart is kept until we confirm.",
    clear: "Clear cart",
  },
  ko: {
    eyebrow: "장바구니",
    title: "주문 요청",
    empty: "장바구니가 비어 있습니다.",
    browse: "쇼핑몰 둘러보기",
    remove: "삭제",
    qty: "수량",
    subtotal: "합계",
    quoted: "견적 후 확정",
    detailsTitle: "주문자 정보",
    name: "이름 *",
    company: "회사 *",
    country: "국가 *",
    email: "이메일 *",
    address: "배송지 주소",
    note: "요청 사항",
    consent: "주문 요청 처리를 위해 SAVE EARTH Inc.가 제 정보를 처리하는 데 동의합니다.",
    submit: "주문 요청 보내기",
    flow: "가격·리드타임·배송을 이메일로 확인해 드린 뒤 결제 링크를 보내 드립니다. 온라인 결제는 곧 지원됩니다.",
    sent: "메일 앱이 열렸습니다. 확인 전까지 장바구니는 그대로 유지됩니다.",
    clear: "장바구니 비우기",
  },
};

const inputCls =
  "w-full border-0 border-b border-mc-line bg-transparent px-0 py-3 text-[15px] outline-none transition-colors focus:border-mc-ink";

const Cart = () => {
  const c = useCopy(copy);
  const { t, lang } = useLang();
  const { lines, setQty, remove, clear } = useCart();
  const [form, setForm] = useState({ name: "", company: "", country: "", email: "", address: "", note: "" });
  const [sent, setSent] = useState(false);

  const rows = lines.flatMap((l) => {
    const product = productBySku(l.sku);
    return product ? [{ ...l, product, unit: product.price[l.format] }] : [];
  });
  // 단가가 하나라도 미정이면 합계는 견적 후 확정
  const total = rows.every((r) => r.unit !== null) ? rows.reduce((n, r) => n + (r.unit ?? 0) * r.qty, 0) : null;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // 결제 연동 전: 주문 내역을 정리해 메일로 접수 (PG 연동 시 이 함수만 교체)
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = [
      "ORDER REQUEST",
      ...rows.map(
        (r) => `- ${r.product.sku} ${r.product.name} | ${formatLabel[r.format].en} | qty ${r.qty}`,
      ),
      "",
      `Name: ${form.name}`,
      `Company: ${form.company}`,
      `Country: ${form.country}`,
      `Email: ${form.email}`,
      `Shipping address: ${form.address || "-"}`,
      `Site language: ${lang.toUpperCase()}`,
      "",
      form.note,
    ].join("\n");
    const subject = `[Mycerra Shop] Order request — ${form.company || form.name} (${rows.length} lines)`;
    window.location.href = `mailto:${company.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

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
              <li key={`${r.sku}-${r.format}`} className="grid grid-cols-[88px_1fr] gap-5 py-5">
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
                        {t(formatLabel[r.format])}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(r.sku, r.format)}
                      aria-label={`${c.remove} ${r.product.name}`}
                      className="p-1 text-mc-mute hover:text-mc-ink"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center border border-mc-line" aria-label={c.qty}>
                      <button type="button" aria-label="−" onClick={() => setQty(r.sku, r.format, r.qty - 1)} className="p-2 hover:bg-mc-cream">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-10 text-center text-sm">{r.qty}</span>
                      <button type="button" aria-label="+" onClick={() => setQty(r.sku, r.format, r.qty + 1)} className="p-2 hover:bg-mc-cream">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Price value={r.unit === null ? null : r.unit * r.qty} className="text-sm text-mc-mute" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center justify-between">
            <button type="button" onClick={clear} className="text-sm text-mc-mute underline underline-offset-4">
              {c.clear}
            </button>
            <p className="text-sm">
              {c.subtotal}: {total === null ? <span className="text-mc-mute">{c.quoted}</span> : <Price value={total} />}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-8 lg:col-span-5">
          <h2 className="font-mc-serif text-3xl font-light">{c.detailsTitle}</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {(["name", "company", "country", "email"] as const).map((k) => (
              <label key={k} className="block">
                <span className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">{c[k]}</span>
                <input
                  required
                  type={k === "email" ? "email" : "text"}
                  value={form[k]}
                  onChange={set(k)}
                  className={inputCls}
                  autoComplete={k === "company" ? "organization" : k === "country" ? "country-name" : k}
                />
              </label>
            ))}
          </div>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">{c.address}</span>
            <input value={form.address} onChange={set("address")} className={inputCls} autoComplete="street-address" />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">{c.note}</span>
            <textarea rows={3} value={form.note} onChange={set("note")} className={`${inputCls} resize-y`} />
          </label>
          <label className="flex items-start gap-3 text-sm text-mc-mute">
            <input type="checkbox" required className="mt-1 h-4 w-4 accent-mc-ink" />
            {c.consent}
          </label>
          <button
            type="submit"
            className="w-full rounded-full bg-mc-ink px-8 py-3.5 text-sm text-mc-paper transition-colors hover:bg-mc-burgundy"
          >
            {c.submit}
          </button>
          <p className="text-xs leading-relaxed text-mc-mute" aria-live="polite">
            {sent ? c.sent : c.flow}
          </p>
        </form>
      </div>
    </Container>
  );
};

export default Cart;

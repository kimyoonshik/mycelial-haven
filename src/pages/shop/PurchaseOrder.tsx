import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Printer, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { Container, Display, Eyebrow } from "@/components/site/primitives";
import { products } from "@/content/shop";
import {
  DOMESTIC_COUNTRY,
  countries,
  formatUSD,
  incoterms,
  makeRef,
  paymentMethods,
  paymentTerms,
  round2,
  seller,

  sizeDims,
  sizes,
} from "@/content/commerce";
import { toRows, useCart, volumeOf, type CartLine } from "@/shop/CartProvider";
import { loadBuyer } from "@/shop/buyerStore";
import { useCopy, useLang } from "@/i18n/LanguageProvider";

const copy = {
  en: {
    eyebrow: "Purchase order request",
    title: "Request a purchase order",
    intro:
      "For volume and business orders. Fill in the form — the purchase order on the right updates as you type. Send it to us and we reply with an approved invoice confirming price, quantity and terms. Payment and shipment follow the approved invoice.",
    steps: ["Send PO request", "We review & approve", "Approved invoice", "Payment", "Shipment"],
    company: "Company *",
    contact: "Contact name *",
    email: "Email *",
    phone: "Phone",
    country: "Country *",
    select: "Select…",
    taxId: "VAT / tax ID",
    bizNo: "Business registration no. (Korea)",
    billing: "Billing address *",
    shipping: "Shipping address",
    sameAsBilling: "Same as billing address",
    lines: "Materials",
    addLine: "Add material",
    qty: "Quantity",
    targetPrice: "Target unit price (USD / sqft, optional)",
    delivery: "Requested delivery date",
    incoterm: "Preferred Incoterms",
    payTerm: "Preferred payment terms",
    payMethod: "Preferred payment method",
    notes: "Notes (finish, colour matching, packaging…)",
    print: "Print / save PDF",
    send: "Send PO request",
    missing: "Please complete the required fields (*) and add at least one material.",
    sent: "Your email app should now be open with the purchase order. You can attach the PDF as well. We reply with an approved invoice within 2 business days.",
    domesticNote:
      "Domestic orders (Korea): prices exclude 10% VAT. We issue a tax invoice and you pay by KRW bank transfer.",
    listNote: "List prices are indicative. Final price, quantity and terms are confirmed in the approved invoice.",
    size: "Size",
    pcs: "pcs",
  },
  ko: {
    eyebrow: "발주희망서",
    title: "발주희망서 작성",
    intro:
      "대량·기업 주문용입니다. 왼쪽 양식을 채우면 오른쪽 발주서가 실시간으로 작성됩니다. 발송해 주시면 가격·물량·거래조건을 확정한 승인 인보이스로 회신하며, 결제와 원단 발송은 승인 인보이스에 따라 진행됩니다.",
    steps: ["발주희망서 발송", "검토·승인", "승인 인보이스", "결제", "원단 발송"],
    company: "회사명 *",
    contact: "담당자 *",
    email: "이메일 *",
    phone: "전화번호",
    country: "국가 *",
    select: "선택…",
    taxId: "VAT / 세금 ID",
    bizNo: "사업자등록번호 (국내)",
    billing: "청구지 주소 *",
    shipping: "배송지 주소",
    sameAsBilling: "청구지와 동일",
    lines: "주문 원단",
    addLine: "원단 추가",
    qty: "수량",
    targetPrice: "희망 단가 (USD / sqft, 선택)",
    delivery: "희망 납기일",
    incoterm: "희망 인코텀즈",
    payTerm: "희망 결제 조건",
    payMethod: "희망 결제 수단",
    notes: "요청 사항 (마감, 컬러 매칭, 포장 등)",
    print: "인쇄 / PDF 저장",
    send: "발주희망서 발송",
    missing: "필수 항목(*)을 입력하고 원단을 하나 이상 추가해 주세요.",
    sent: "메일 앱이 열렸습니다. PDF를 첨부하셔도 됩니다. 영업일 2일 이내에 승인 인보이스로 회신해 드립니다.",
    domesticNote: "국내 거래: 가격은 부가세 10% 별도이며, 세금계산서를 발행하고 원화 계좌이체로 결제합니다.",
    listNote: "정가는 참고 가격입니다. 최종 가격·물량·조건은 승인 인보이스에서 확정됩니다.",
    size: "크기",
    pcs: "장",
  },
};

const inputCls =
  "w-full border-0 border-b border-mc-line bg-transparent px-0 py-2.5 text-[15px] outline-none transition-colors focus:border-mc-ink";

const Field = ({ label, children, className }: { label: string; children: ReactNode; className?: string }) => (
  <label className={cn("block", className)}>
    <span className="text-[11px] uppercase tracking-[0.16em] text-mc-mute">{label}</span>
    {children}
  </label>
);

const available = products.filter((p) => p.status === "available");

const today = () => new Date().toISOString().slice(0, 10);

const PurchaseOrder = () => {
  const c = useCopy(copy);
  const { t, lang } = useLang();
  const [params] = useSearchParams();
  const { rows } = useCart();
  const stored = loadBuyer();

  const [ref] = useState(() => makeRef("POR"));
  const [form, setForm] = useState({
    company: "",
    contact: stored.name,
    email: stored.email,
    phone: stored.phone,
    country: params.get("domestic") ? DOMESTIC_COUNTRY : stored.country,
    taxId: "",
    bizNo: "",
    billing: [stored.address1, stored.address2, stored.city, stored.state, stored.postalCode].filter(Boolean).join(", "),
    shipping: "",
    targetPrice: "",
    delivery: "",
    incoterm: "DAP",
    payTerm: paymentTerms[0].code,
    payMethod: "",
    // 쇼핑몰 "추가 컬러 옵션"에서 들어오면 요청 내용을 미리 적어 둔다
    notes:
      params.get("custom") === "reactive"
        ? "Additional reactive colour request — colour reference (Pantone no. / sample): "
        : "",
  });
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [lines, setLines] = useState<CartLine[]>(() => rows.map(({ sku, size, qty }) => ({ sku, size, qty })));
  const [addSku, setAddSku] = useState("");
  const [addSize, setAddSize] = useState(sizes.find((s) => s.kind === "regular")?.id ?? sizes[0].id);
  const [error, setError] = useState(false);
  const [sent, setSent] = useState(false);

  const domestic = form.country === DOMESTIC_COUNTRY;
  // 국내 구매자는 원화 계좌이체, 해외는 PayPal 인보이스를 기본값으로
  useEffect(() => {
    setForm((f) => ({ ...f, payMethod: domestic ? "KRW" : f.payMethod === "KRW" || !f.payMethod ? "PAYPAL" : f.payMethod }));
  }, [domestic]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const docRows = useMemo(() => toRows(lines), [lines]);
  const { regularSqft, sampleCount } = volumeOf(docRows);
  const subtotal = round2(docRows.reduce((n, r) => n + r.lineTotalUSD, 0));
  const same = (l: CartLine, sku: string, size: string) => l.sku === sku && l.size === size;
  const shipTo = sameAsBilling ? form.billing : form.shipping;
  const countryName = countries.find((x) => x.code === form.country)?.name ?? form.country;
  const label = (list: { code: string; label: { en: string; ko: string } }[], code: string) =>
    list.find((x) => x.code === code)?.label;

  const valid = !!(form.company && form.contact && /\S+@\S+\.\S+/.test(form.email) && form.country && form.billing && docRows.length);

  const send = () => {
    if (!valid) {
      setError(true);
      return;
    }
    setError(false);
    const body = [
      `PURCHASE ORDER REQUEST ${ref}  (${today()})`,
      "",
      `Company: ${form.company}`,
      `Contact: ${form.contact}`,
      `Email: ${form.email}`,
      `Phone: ${form.phone || "-"}`,
      `Country: ${countryName}`,
      `VAT / tax ID: ${form.taxId || "-"}`,
      ...(domestic ? [`Business reg. no.: ${form.bizNo || "-"}`] : []),
      `Billing address: ${form.billing}`,
      `Shipping address: ${shipTo || form.billing}`,
      "",
      "MATERIALS",
      // 형식은 내부 인보이스 작성기의 가져오기(parsePoRequest)와 맞춰야 한다
      ...docRows.map(
        (r, i) =>
          `${i + 1}. ${r.sku} ${r.product.name} | ${r.size} ${sizeDims(r.sizeInfo)} | ${r.qty} pcs | ${r.areaSqft.toFixed(2)} sqft | list ${formatUSD(r.unitPriceUSD)}/pc | ${formatUSD(r.lineTotalUSD)}`,
      ),
      `Total: regular ${regularSqft.toFixed(2)} sqft, samples ${sampleCount} pcs | list subtotal ${formatUSD(subtotal)}`,
      `Target price: ${form.targetPrice ? `USD ${form.targetPrice}/sqft` : "-"}`,
      "",
      `Requested delivery: ${form.delivery || "-"}`,
      `Incoterms: ${form.incoterm}`,
      `Payment terms: ${label(paymentTerms, form.payTerm)?.en}`,
      `Payment method: ${label(paymentMethods, form.payMethod)?.en}`,
      `Site language: ${lang.toUpperCase()}`,
      "",
      `Notes: ${form.notes || "-"}`,
    ].join("\n");
    const subject = `[Mycerra PO Request] ${ref} — ${form.company} (${regularSqft.toFixed(0)} sqft)`;
    window.location.href = `mailto:${seller.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  return (
    <Container className="pb-24 pt-36 md:pt-44 print:max-w-none print:p-0">
      <div className="print:hidden">
        <Eyebrow>{c.eyebrow}</Eyebrow>
        <Display as="h1" className="mt-5 text-5xl md:text-6xl">
          {c.title}
        </Display>
        <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-mc-mute">{c.intro}</p>
        <ol className="mt-8 flex flex-wrap gap-2 text-xs">
          {c.steps.map((s, i) => (
            <li key={s} className="flex items-center gap-2 rounded-full border border-mc-line px-3 py-1.5">
              <span className="text-mc-mute">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-12 grid gap-12 xl:grid-cols-12 print:mt-0 print:block">
        {/* 입력 양식 */}
        <form className="min-w-0 space-y-10 xl:col-span-5 print:hidden" onSubmit={(e) => e.preventDefault()}>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label={c.company}>
              <input value={form.company} onChange={set("company")} className={inputCls} autoComplete="organization" />
            </Field>
            <Field label={c.contact}>
              <input value={form.contact} onChange={set("contact")} className={inputCls} autoComplete="name" />
            </Field>
            <Field label={c.email}>
              <input type="email" value={form.email} onChange={set("email")} className={inputCls} autoComplete="email" />
            </Field>
            <Field label={c.phone}>
              <input type="tel" value={form.phone} onChange={set("phone")} className={inputCls} autoComplete="tel" />
            </Field>
            <Field label={c.country}>
              <select value={form.country} onChange={set("country")} className={inputCls}>
                <option value="">{c.select}</option>
                {countries.map((x) => (
                  <option key={x.code} value={x.code}>
                    {x.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={domestic ? c.bizNo : c.taxId}>
              <input value={domestic ? form.bizNo : form.taxId} onChange={set(domestic ? "bizNo" : "taxId")} className={inputCls} />
            </Field>
            <Field label={c.billing} className="sm:col-span-2">
              <input value={form.billing} onChange={set("billing")} className={inputCls} autoComplete="street-address" />
            </Field>
            <label className="flex items-center gap-2 text-sm text-mc-mute sm:col-span-2">
              <input
                type="checkbox"
                checked={sameAsBilling}
                onChange={(e) => setSameAsBilling(e.target.checked)}
                className="h-4 w-4 accent-mc-ink"
              />
              {c.sameAsBilling}
            </label>
            {!sameAsBilling && (
              <Field label={c.shipping} className="sm:col-span-2">
                <input value={form.shipping} onChange={set("shipping")} className={inputCls} />
              </Field>
            )}
          </div>

          <fieldset>
            <legend className="text-[11px] uppercase tracking-[0.16em] text-mc-mute">{c.lines}</legend>
            <ul className="mt-3 divide-y divide-mc-line border-y border-mc-line">
              {docRows.map((r) => (
                <li key={`${r.sku}-${r.size}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="text-sm">
                    {r.product.name} <span className="text-mc-mute">· {r.sku}</span>
                    <span className="block text-xs text-mc-mute">
                      {t(r.sizeInfo.label)} {sizeDims(r.sizeInfo)} · {r.areaSqft.toFixed(2)} sqft
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <QuantityStepper
                      size="sm"
                      unit={c.pcs}
                      value={r.qty}
                      label={`${c.qty} ${r.sku} ${r.size}`}
                      onChange={(v) => setLines((ls) => ls.map((l) => (same(l, r.sku, r.size) ? { ...l, qty: v } : l)))}
                    />
                    <button
                      type="button"
                      aria-label={`Remove ${r.sku} ${r.size}`}
                      onClick={() => setLines((ls) => ls.filter((l) => !same(l, r.sku, r.size)))}
                      className="p-1.5 text-mc-mute hover:text-mc-ink"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <select value={addSku} onChange={(e) => setAddSku(e.target.value)} className={cn(inputCls, "min-w-0 flex-1 basis-48")} aria-label={c.addLine}>
                <option value="">{c.addLine}…</option>
                {available.map((p) => (
                  <option key={p.sku} value={p.sku}>
                    {p.sku} — {p.name}
                  </option>
                ))}
              </select>
              <select value={addSize} onChange={(e) => setAddSize(e.target.value)} className={cn(inputCls, "w-40")} aria-label={c.size}>
                {sizes.map((z) => (
                  <option key={z.id} value={z.id}>
                    {t(z.label)} {sizeDims(z)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!addSku}
                onClick={() => {
                  setLines((ls) =>
                    ls.some((l) => same(l, addSku, addSize))
                      ? ls.map((l) => (same(l, addSku, addSize) ? { ...l, qty: l.qty + 1 } : l))
                      : [...ls, { sku: addSku, size: addSize, qty: 1 }],
                  );
                  setAddSku("");
                }}
                className="rounded-full border border-mc-ink/30 px-4 text-sm disabled:opacity-40"
                aria-label={c.addLine}
              >
                +
              </button>
            </div>
          </fieldset>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label={c.targetPrice}>
              <input inputMode="decimal" value={form.targetPrice} onChange={set("targetPrice")} className={inputCls} />
            </Field>
            <Field label={c.delivery}>
              <input type="date" min={today()} value={form.delivery} onChange={set("delivery")} className={inputCls} />
            </Field>
            <Field label={c.incoterm}>
              <select value={form.incoterm} onChange={set("incoterm")} className={inputCls}>
                {incoterms.map((x) => (
                  <option key={x.code} value={x.code}>
                    {t(x.label)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={c.payTerm}>
              <select value={form.payTerm} onChange={set("payTerm")} className={inputCls}>
                {paymentTerms.map((x) => (
                  <option key={x.code} value={x.code}>
                    {t(x.label)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={c.payMethod} className="sm:col-span-2">
              <select value={form.payMethod} onChange={set("payMethod")} className={inputCls}>
                {paymentMethods
                  .filter((x) => (domestic ? x.code === "KRW" : x.code !== "KRW"))
                  .map((x) => (
                    <option key={x.code} value={x.code}>
                      {t(x.label)}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label={c.notes} className="sm:col-span-2">
              <textarea rows={3} value={form.notes} onChange={set("notes")} className={cn(inputCls, "resize-y")} />
            </Field>
          </div>

          {domestic && <p className="bg-mc-cream px-4 py-3 text-sm leading-relaxed">{c.domesticNote}</p>}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={send}
              className="inline-flex items-center gap-2 rounded-full bg-mc-ink px-6 py-3 text-sm text-mc-paper hover:bg-mc-burgundy"
            >
              <Send className="h-4 w-4" />
              {c.send}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-full border border-mc-ink/30 px-6 py-3 text-sm hover:border-mc-ink"
            >
              <Printer className="h-4 w-4" />
              {c.print}
            </button>
          </div>
          <p className="text-xs leading-relaxed text-mc-mute" role="status">
            {error ? <span className="text-red-700">{c.missing}</span> : sent ? c.sent : c.listNote}
          </p>
        </form>

        {/* 발주서 문서 — 인쇄 시 이 영역만 출력 */}
        <article
          data-testid="po-document"
          className="min-w-0 border border-mc-line bg-white p-6 text-[13px] leading-relaxed text-mc-ink shadow-sm md:p-10 xl:col-span-7 print:border-0 print:p-0 print:shadow-none"
        >
          <header className="flex items-start justify-between gap-6 border-b border-mc-ink pb-5">
            <div>
              <p className="font-mc-serif text-2xl">PURCHASE ORDER REQUEST</p>
              <p className="text-mc-mute">발주희망서</p>
            </div>
            <dl className="text-right">
              <dt className="text-[10px] uppercase tracking-[0.16em] text-mc-mute">No. / 번호</dt>
              <dd className="font-medium" data-testid="po-ref">
                {ref}
              </dd>
              <dt className="mt-1 text-[10px] uppercase tracking-[0.16em] text-mc-mute">Date / 일자</dt>
              <dd>{today()}</dd>
            </dl>
          </header>

          <section className="grid gap-6 border-b border-mc-line py-5 sm:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-mc-mute">Buyer / 구매자</p>
              <p className="mt-1 font-medium">{form.company || "—"}</p>
              <p>{form.contact}</p>
              <p>{form.email}</p>
              {form.phone && <p>{form.phone}</p>}
              <p>{form.billing}</p>
              <p>{countryName}</p>
              {(domestic ? form.bizNo : form.taxId) && <p>{domestic ? `사업자등록번호 ${form.bizNo}` : `VAT/Tax ID ${form.taxId}`}</p>}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-mc-mute">Supplier / 공급자</p>
              <p className="mt-1 font-medium">{seller.company}</p>
              <p>{seller.brand}</p>
              <p>{seller.email}</p>
              <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-mc-mute">Ship to / 배송지</p>
              <p>{shipTo || form.billing || "—"}</p>
            </div>
          </section>

          <div className="overflow-x-auto print:overflow-visible">
          <table className="mt-5 w-full min-w-[560px] text-left print:min-w-0">
            <thead>
              <tr className="border-b border-mc-ink text-[10px] uppercase tracking-[0.12em] text-mc-mute">
                <th className="py-2 pr-2 font-normal">#</th>
                <th className="py-2 pr-2 font-normal">SKU</th>
                <th className="py-2 pr-2 font-normal">Description / 품명</th>
                <th className="py-2 pr-2 font-normal">Size / 크기</th>
                <th className="py-2 pr-2 text-right font-normal">Qty / 장</th>
                <th className="py-2 pr-2 text-right font-normal">sqft</th>
                <th className="py-2 pr-2 text-right font-normal">List USD/pc</th>
                <th className="py-2 text-right font-normal">Amount USD</th>
              </tr>
            </thead>
            <tbody>
              {docRows.map((r, i) => (
                <tr key={`${r.sku}-${r.size}`} className="border-b border-mc-line">
                  <td className="py-2 pr-2">{i + 1}</td>
                  <td className="py-2 pr-2">{r.sku}</td>
                  <td className="py-2 pr-2">{r.product.name}</td>
                  <td className="py-2 pr-2">{sizeDims(r.sizeInfo)}</td>
                  <td className="py-2 pr-2 text-right">{r.qty}</td>
                  <td className="py-2 pr-2 text-right">{r.areaSqft.toFixed(2)}</td>
                  <td className="py-2 pr-2 text-right">{r.unitPriceUSD.toFixed(2)}</td>
                  <td className="py-2 text-right">{r.lineTotalUSD.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="pt-3 font-medium">
                  Total / 합계 <span className="font-normal text-mc-mute">(samples / 샘플 {sampleCount})</span>
                </td>
                <td className="pt-3 text-right font-medium" data-testid="po-total-sqft">
                  {regularSqft.toFixed(2)}
                </td>
                <td />
                <td className="pt-3 text-right font-medium">{subtotal.toFixed(2)}</td>
              </tr>
              {form.targetPrice && (
                <tr>
                  <td colSpan={8} className="pt-1 text-right text-mc-mute">
                    Target price / 희망 단가: USD {form.targetPrice} / sqft
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
          </div>

          <dl className="mt-6 grid gap-x-6 gap-y-2 border-t border-mc-line pt-5 sm:grid-cols-2">
            {[
              ["Requested delivery / 희망 납기", form.delivery || "—"],
              ["Incoterms", form.incoterm],
              ["Payment terms / 결제 조건", label(paymentTerms, form.payTerm)?.en ?? "—"],
              ["Payment method / 결제 수단", label(paymentMethods, form.payMethod)?.en ?? "—"],
              ["Country of origin / 원산지", seller.countryOfOrigin],
              ["Currency / 통화", domestic ? "USD (KRW settlement, VAT 10% excl.)" : "USD"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-dotted border-mc-line py-1">
                <dt className="text-mc-mute">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>

          {form.notes && (
            <p className="mt-5">
              <span className="text-[10px] uppercase tracking-[0.16em] text-mc-mute">Notes / 요청 사항</span>
              <br />
              {form.notes}
            </p>
          )}

          <p className="mt-6 text-[11px] text-mc-mute">
            This is a request for quotation and does not constitute a binding contract. Price, quantity and terms become
            binding only when confirmed by an approved invoice from {seller.company} / 본 문서는 견적 요청이며, 가격·물량·조건은{" "}
            {seller.company}의 승인 인보이스로 확정될 때 효력이 발생합니다.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-10">
            <div className="border-t border-mc-ink pt-2 text-[11px] text-mc-mute">Buyer signature / 구매자 서명</div>
            <div className="border-t border-mc-ink pt-2 text-[11px] text-mc-mute">Date / 일자</div>
          </div>
        </article>
      </div>
    </Container>
  );
};

export default PurchaseOrder;

// 내부 전용 인보이스 작성기 — VITE_ENABLE_ADMIN=true 로 빌드할 때만 포함된다 (공개 사이트에는 없음).
// 발주희망서 검토 후 승인 인보이스(Proforma)를, 선적 시 상업 인보이스(Commercial)를 만든다.
// 결제 링크는 PayPal 대시보드에서 발행한 인보이스 URL을 붙여 넣는다 (docs/order-process.md 참고).

import { useMemo, useState, type ReactNode } from "react";
import { ClipboardPaste, Mail, Plus, Printer, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { priceOf, products } from "@/content/shop";
import { bankAccounts } from "@/content/bankAccounts";
import {
  countries,
  formatUSD,
  incoterms,
  makeRef,
  paymentMethods,
  paymentTerms,
  areaSqft,
  round2,
  seller,
  sizeById,
  sizeDims,
  sizes,
} from "@/content/commerce";

type DocType = "proforma" | "commercial";

interface Line {
  id: number;
  sku: string;
  description: string;
  hsCode: string;
  size: string;
  qty: number; // 장수
  unitPrice: number; // 장당 USD
}

const defaultSize = sizes.find((z) => z.kind === "regular")?.id ?? sizes[0].id;
const lineArea = (l: Line) => {
  const z = sizeById(l.size);
  return z ? round2(areaSqft(z) * l.qty) : 0;
};

const addDays = (d: number) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);

const inputCls = "w-full border border-mc-line bg-white px-2.5 py-1.5 text-sm outline-none focus:border-mc-ink";

const Field = ({ label, children, className }: { label: string; children: ReactNode; className?: string }) => (
  <label className={cn("block", className)}>
    <span className="text-[10px] uppercase tracking-[0.14em] text-mc-mute">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);

let lineSeq = 1;
const newLine = (sku = "", size = defaultSize, qty = 1): Line => {
  const p = products.find((x) => x.sku === sku);
  return {
    id: lineSeq++,
    sku,
    description: p ? `${p.name} — pure mycelium mat` : "",
    hsCode: seller.hsCode,
    size,
    qty,
    unitPrice: p ? priceOf(p, size) : 0,
  };
};

// 사이트에서 보낸 발주희망서 메일 본문(PurchaseOrder.tsx 형식)을 읽어 양식을 채운다
const parsePoRequest = (text: string) => {
  const field = (k: string) => text.match(new RegExp(`^${k}:\\s*(.+)$`, "mi"))?.[1].trim();
  const ref = text.match(/PURCHASE ORDER REQUEST\s+(POR-[\w-]+)/)?.[1];
  // 줄 형식: "1. EM-01 Crocodile | r1 150 × 100 cm | 3 pcs | …"
  const lines = [...text.matchAll(/^\d+\.\s+([A-Z]{2}-\d{2,3})\s+.+?\|\s+([a-z0-9-]+)\s.+?\|\s+(\d+)\s+pcs/gm)].map((m) =>
    newLine(m[1], sizeById(m[2]) ? m[2] : defaultSize, Number(m[3])),
  );
  const countryName = field("Country");
  return {
    ref,
    company: field("Company"),
    contact: field("Contact"),
    email: field("Email"),
    address: field("Billing address"),
    shipTo: field("Shipping address"),
    taxId: field("VAT / tax ID") ?? field("Business reg. no."),
    country: countries.find((c) => c.name === countryName)?.code,
    incoterm: field("Incoterms"),
    payTerm: paymentTerms.find((p) => p.label.en === field("Payment terms"))?.code,
    payMethod: paymentMethods.find((p) => p.label.en === field("Payment method"))?.code,
    lines,
  };
};

const InvoiceGenerator = () => {
  const [docType, setDocType] = useState<DocType>("proforma");
  const [h, setH] = useState({
    invoiceNo: makeRef("INV"),
    issueDate: today(),
    validUntil: addDays(14),
    poRef: "",
    company: "",
    contact: "",
    email: "",
    address: "",
    shipTo: "",
    country: "",
    taxId: "",
    incoterm: "DAP",
    payTerm: paymentTerms[0].code,
    payMethod: "PAYPAL",
    paypalLink: "",
    leadTime: "",
    discountPct: "0",
    shipping: "0",
    vatPct: "0",
    packages: "",
    netWeight: "",
    grossWeight: "",
    notes: "",
  });
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [paste, setPaste] = useState("");
  const [parsed, setParsed] = useState<string | null>(null);

  const set = (k: keyof typeof h) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setH((x) => ({ ...x, [k]: e.target.value }));
  const setLine = (id: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const num = (s: string) => (Number.isFinite(Number(s)) ? Number(s) : 0);
  const totals = useMemo(() => {
    const sqft = round2(lines.reduce((n, l) => n + lineArea(l), 0));
    const subtotal = round2(lines.reduce((n, l) => n + l.qty * l.unitPrice, 0));
    const discount = round2((subtotal * num(h.discountPct)) / 100);
    const shipping = round2(num(h.shipping));
    const taxable = round2(subtotal - discount + shipping);
    const vat = round2((taxable * num(h.vatPct)) / 100);
    return { sqft, subtotal, discount, shipping, vat, total: round2(taxable + vat) };
  }, [lines, h.discountPct, h.shipping, h.vatPct]);

  const importPo = () => {
    const p = parsePoRequest(paste);
    setH((x) => ({
      ...x,
      poRef: p.ref ?? x.poRef,
      company: p.company ?? x.company,
      contact: p.contact ?? x.contact,
      email: p.email ?? x.email,
      address: p.address ?? x.address,
      shipTo: p.shipTo ?? x.shipTo,
      country: p.country ?? x.country,
      taxId: p.taxId && p.taxId !== "-" ? p.taxId : x.taxId,
      incoterm: p.incoterm ?? x.incoterm,
      payTerm: p.payTerm ?? x.payTerm,
      payMethod: p.payMethod ?? x.payMethod,
      vatPct: p.country === "KR" ? "10" : x.vatPct,
    }));
    if (p.lines.length) setLines(p.lines);
    setParsed(`${p.ref ?? "PO"} · ${p.lines.length} lines · ${p.company ?? "?"}`);
  };

  const title = docType === "proforma" ? "PROFORMA INVOICE" : "COMMERCIAL INVOICE";
  const subtitle = docType === "proforma" ? "승인 인보이스 (견적·결제 요청)" : "상업 송장 (선적·통관용)";
  const method = paymentMethods.find((m) => m.code === h.payMethod);
  const term = paymentTerms.find((m) => m.code === h.payTerm);
  const countryName = countries.find((c) => c.code === h.country)?.name ?? "";

  const approvalMail = () => {
    const body = [
      `Dear ${h.contact || h.company},`,
      "",
      `Thank you for your purchase order request${h.poRef ? ` ${h.poRef}` : ""}. We are pleased to confirm it with ${title.toLowerCase()} ${h.invoiceNo}:`,
      "",
      ...lines.map((l) => {
        const z = sizeById(l.size);
        return `- ${l.sku} ${l.description} (${z ? sizeDims(z) : l.size}): ${l.qty} pcs × ${formatUSD(l.unitPrice)} = ${formatUSD(l.qty * l.unitPrice)}`;
      }),
      ...(totals.discount ? [`Discount: −${formatUSD(totals.discount)}`] : []),
      `Shipping: ${totals.shipping ? formatUSD(totals.shipping) : "included"}`,
      ...(totals.vat ? [`VAT ${h.vatPct}%: ${formatUSD(totals.vat)}`] : []),
      `Total: ${formatUSD(totals.total)} (${totals.sqft} sqft)`,
      "",
      `Incoterms: ${h.incoterm}`,
      `Payment terms: ${term?.label.en}`,
      `Payment method: ${method?.label.en}`,
      ...(h.paypalLink ? [`Pay online: ${h.paypalLink}`] : []),
      ...(h.leadTime ? [`Estimated shipment: ${h.leadTime}`] : []),
      `This invoice is valid until ${h.validUntil}. Production is scheduled once payment is received.`,
      "",
      "The invoice PDF is attached.",
      "",
      `Best regards,`,
      `${seller.company} — ${seller.brand}`,
    ].join("\n");
    window.location.href = `mailto:${h.email}?subject=${encodeURIComponent(`${title} ${h.invoiceNo} — ${seller.brand}`)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="min-h-screen bg-mc-paper px-4 py-8 font-mc-sans text-mc-ink md:px-8 print:bg-white print:p-0">
      <div className="mx-auto grid max-w-[1500px] gap-8 xl:grid-cols-12">
        {/* 입력 패널 */}
        <aside className="space-y-6 xl:col-span-5 print:hidden">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-mc-mute">Internal · 내부 전용</p>
            <h1 className="font-mc-serif text-3xl font-light">Invoice generator</h1>
          </div>

          <div className="flex gap-2">
            {(["proforma", "commercial"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDocType(d)}
                aria-pressed={docType === d}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm",
                  docType === d ? "border-mc-ink bg-mc-ink text-mc-paper" : "border-mc-line",
                )}
              >
                {d === "proforma" ? "Proforma (승인)" : "Commercial (선적)"}
              </button>
            ))}
          </div>

          <details className="border border-mc-line bg-white p-3" open>
            <summary className="cursor-pointer text-sm">발주희망서 메일 붙여넣기 → 자동 채우기</summary>
            <textarea
              rows={5}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              className={cn(inputCls, "mt-2 font-mono text-xs")}
              placeholder="PURCHASE ORDER REQUEST POR-…"
              aria-label="PO request text"
            />
            <button type="button" onClick={importPo} className="mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
              <ClipboardPaste className="h-3.5 w-3.5" /> Import
            </button>
            {parsed && <span className="ml-3 text-xs text-mc-mute" data-testid="parsed">{parsed}</span>}
          </details>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Invoice no.">
              <input value={h.invoiceNo} onChange={set("invoiceNo")} className={inputCls} />
            </Field>
            <Field label="PO request ref.">
              <input value={h.poRef} onChange={set("poRef")} className={inputCls} />
            </Field>
            <Field label="Issue date">
              <input type="date" value={h.issueDate} onChange={set("issueDate")} className={inputCls} />
            </Field>
            <Field label="Valid until">
              <input type="date" value={h.validUntil} onChange={set("validUntil")} className={inputCls} />
            </Field>
            <Field label="Buyer company">
              <input value={h.company} onChange={set("company")} className={inputCls} />
            </Field>
            <Field label="Contact">
              <input value={h.contact} onChange={set("contact")} className={inputCls} />
            </Field>
            <Field label="Email">
              <input value={h.email} onChange={set("email")} className={inputCls} />
            </Field>
            <Field label="Country">
              <select value={h.country} onChange={set("country")} className={inputCls}>
                <option value="" />
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Billing address" className="col-span-2">
              <input value={h.address} onChange={set("address")} className={inputCls} />
            </Field>
            <Field label="Ship to (if different)" className="col-span-2">
              <input value={h.shipTo} onChange={set("shipTo")} className={inputCls} />
            </Field>
            <Field label="Buyer VAT / tax ID">
              <input value={h.taxId} onChange={set("taxId")} className={inputCls} />
            </Field>
            <Field label="Estimated shipment">
              <input value={h.leadTime} onChange={set("leadTime")} className={inputCls} placeholder="e.g. 4 weeks after payment" />
            </Field>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-mc-mute">Lines</p>
            <ul className="mt-2 space-y-3">
              {lines.map((l) => (
                <li key={l.id} className="grid grid-cols-12 gap-2 border border-mc-line bg-white p-2">
                  <select
                    value={l.sku}
                    onChange={(e) => {
                      const n = newLine(e.target.value, l.size, l.qty);
                      setLine(l.id, { sku: n.sku, description: n.description, unitPrice: n.unitPrice });
                    }}
                    className={cn(inputCls, "col-span-3")}
                    aria-label="SKU"
                  >
                    <option value="">SKU</option>
                    {products
                      .filter((p) => p.status === "available")
                      .map((p) => (
                        <option key={p.sku} value={p.sku}>
                          {p.sku}
                        </option>
                      ))}
                  </select>
                  <input
                    value={l.description}
                    onChange={(e) => setLine(l.id, { description: e.target.value })}
                    className={cn(inputCls, "col-span-5")}
                    aria-label="Description"
                  />
                  <select
                    value={l.size}
                    onChange={(e) => {
                      const p = products.find((x) => x.sku === l.sku);
                      setLine(l.id, { size: e.target.value, ...(p && { unitPrice: priceOf(p, e.target.value) }) });
                    }}
                    className={cn(inputCls, "col-span-4")}
                    aria-label="Size"
                  >
                    {sizes.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.label.en} {sizeDims(z)}
                      </option>
                    ))}
                  </select>
                  <input
                    value={l.hsCode}
                    onChange={(e) => setLine(l.id, { hsCode: e.target.value })}
                    className={cn(inputCls, "col-span-4")}
                    aria-label="HS code"
                  />
                  <input
                    inputMode="numeric"
                    value={l.qty}
                    onChange={(e) => setLine(l.id, { qty: Math.max(0, Math.floor(num(e.target.value))) })}
                    className={cn(inputCls, "col-span-3")}
                    aria-label="Quantity (pcs)"
                  />
                  <input
                    inputMode="decimal"
                    value={l.unitPrice}
                    onChange={(e) => setLine(l.id, { unitPrice: Math.max(0, num(e.target.value)) })}
                    className={cn(inputCls, "col-span-3")}
                    aria-label="Unit price USD/pc"
                  />
                  <button
                    type="button"
                    onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))}
                    className="col-span-2 flex items-center justify-center text-mc-mute hover:text-mc-ink"
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setLines((ls) => [...ls, newLine()])}
              className="mt-2 inline-flex items-center gap-1 text-sm underline underline-offset-4"
            >
              <Plus className="h-3.5 w-3.5" /> Add line
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Discount %">
              <input inputMode="decimal" value={h.discountPct} onChange={set("discountPct")} className={inputCls} />
            </Field>
            <Field label="Shipping USD">
              <input inputMode="decimal" value={h.shipping} onChange={set("shipping")} className={inputCls} />
            </Field>
            <Field label="VAT % (KR 10)">
              <input inputMode="decimal" value={h.vatPct} onChange={set("vatPct")} className={inputCls} />
            </Field>
            <Field label="Incoterms">
              <select value={h.incoterm} onChange={set("incoterm")} className={inputCls}>
                {incoterms.map((x) => (
                  <option key={x.code}>{x.code}</option>
                ))}
              </select>
            </Field>
            <Field label="Payment terms" className="col-span-2">
              <select value={h.payTerm} onChange={set("payTerm")} className={inputCls}>
                {paymentTerms.map((x) => (
                  <option key={x.code} value={x.code}>
                    {x.label.en}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Payment method" className="col-span-3">
              <select value={h.payMethod} onChange={set("payMethod")} className={inputCls}>
                {paymentMethods.map((x) => (
                  <option key={x.code} value={x.code}>
                    {x.label.en}
                  </option>
                ))}
              </select>
            </Field>
            {h.payMethod === "PAYPAL" && (
              <Field label="PayPal invoice link (from PayPal dashboard)" className="col-span-3">
                <input value={h.paypalLink} onChange={set("paypalLink")} className={inputCls} placeholder="https://www.paypal.com/invoice/p/#…" />
              </Field>
            )}
            {docType === "commercial" && (
              <>
                <Field label="Packages">
                  <input value={h.packages} onChange={set("packages")} className={inputCls} />
                </Field>
                <Field label="Net weight (kg)">
                  <input value={h.netWeight} onChange={set("netWeight")} className={inputCls} />
                </Field>
                <Field label="Gross weight (kg)">
                  <input value={h.grossWeight} onChange={set("grossWeight")} className={inputCls} />
                </Field>
              </>
            )}
            <Field label="Notes" className="col-span-3">
              <textarea rows={2} value={h.notes} onChange={set("notes")} className={inputCls} />
            </Field>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-full bg-mc-ink px-5 py-2.5 text-sm text-mc-paper"
            >
              <Printer className="h-4 w-4" /> Print / save PDF
            </button>
            <button
              type="button"
              disabled={!h.email}
              onClick={approvalMail}
              className="inline-flex items-center gap-2 rounded-full border border-mc-ink/30 px-5 py-2.5 text-sm disabled:opacity-40"
            >
              <Mail className="h-4 w-4" /> Approval email draft
            </button>
          </div>
        </aside>

        {/* 인보이스 문서 */}
        <article
          data-testid="invoice-document"
          className="border border-mc-line bg-white p-8 text-[12.5px] leading-relaxed shadow-sm xl:col-span-7 print:border-0 print:p-0 print:shadow-none"
        >
          <header className="flex items-start justify-between gap-6 border-b-2 border-mc-ink pb-5">
            <div>
              <p className="font-mc-serif text-2xl">{seller.company}</p>
              <p className="text-mc-mute">{seller.brand} · {seller.address}</p>
              <p className="text-mc-mute">
                Reg. {seller.businessRegNo} · {seller.phone} · {seller.email}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mc-serif text-xl" data-testid="invoice-title">{title}</p>
              <p className="text-mc-mute">{subtitle}</p>
            </div>
          </header>

          <section className="grid grid-cols-2 gap-6 border-b border-mc-line py-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-mc-mute">Bill to</p>
              <p className="font-medium">{h.company || "—"}</p>
              <p>{h.contact}</p>
              <p>{h.email}</p>
              <p>{h.address}</p>
              <p>{countryName}</p>
              {h.taxId && <p>Tax ID: {h.taxId}</p>}
              {h.shipTo && (
                <>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-mc-mute">Ship to</p>
                  <p>{h.shipTo}</p>
                </>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 self-start">
              <dt className="text-mc-mute">Invoice no.</dt>
              <dd className="text-right font-medium" data-testid="invoice-no">{h.invoiceNo}</dd>
              <dt className="text-mc-mute">Issue date</dt>
              <dd className="text-right">{h.issueDate}</dd>
              {docType === "proforma" && (
                <>
                  <dt className="text-mc-mute">Valid until</dt>
                  <dd className="text-right">{h.validUntil}</dd>
                </>
              )}
              <dt className="text-mc-mute">Your PO ref.</dt>
              <dd className="text-right">{h.poRef || "—"}</dd>
              <dt className="text-mc-mute">Incoterms 2020</dt>
              <dd className="text-right">{h.incoterm}</dd>
              <dt className="text-mc-mute">Origin</dt>
              <dd className="text-right">{seller.countryOfOrigin}</dd>
            </dl>
          </section>

          <table className="mt-4 w-full text-left">
            <thead>
              <tr className="border-b border-mc-ink text-[10px] uppercase tracking-[0.1em] text-mc-mute">
                <th className="py-2 pr-2 font-normal">#</th>
                <th className="py-2 pr-2 font-normal">Description</th>
                <th className="py-2 pr-2 font-normal">HS code</th>
                <th className="py-2 pr-2 font-normal">Size</th>
                <th className="py-2 pr-2 text-right font-normal">Qty pcs</th>
                <th className="py-2 pr-2 text-right font-normal">sqft</th>
                <th className="py-2 pr-2 text-right font-normal">USD/pc</th>
                <th className="py-2 text-right font-normal">Amount USD</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.id} className="border-b border-mc-line">
                  <td className="py-2 pr-2">{i + 1}</td>
                  <td className="py-2 pr-2">
                    {l.sku && <span className="text-mc-mute">{l.sku} · </span>}
                    {l.description}
                  </td>
                  <td className="py-2 pr-2">{l.hsCode}</td>
                  <td className="py-2 pr-2">{sizeById(l.size) ? sizeDims(sizeById(l.size)!) : l.size}</td>
                  <td className="py-2 pr-2 text-right">{l.qty}</td>
                  <td className="py-2 pr-2 text-right">{lineArea(l).toFixed(2)}</td>
                  <td className="py-2 pr-2 text-right">{l.unitPrice.toFixed(2)}</td>
                  <td className="py-2 text-right">{(l.qty * l.unitPrice).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="ml-auto mt-4 w-full max-w-xs space-y-1">
            <div className="flex justify-between">
              <dt className="text-mc-mute">Subtotal ({totals.sqft.toFixed(2)} sqft)</dt>
              <dd>{formatUSD(totals.subtotal)}</dd>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-mc-mute">Discount {h.discountPct}%</dt>
                <dd>−{formatUSD(totals.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-mc-mute">Shipping</dt>
              <dd>{totals.shipping ? formatUSD(totals.shipping) : "Included"}</dd>
            </div>
            {totals.vat > 0 && (
              <div className="flex justify-between">
                <dt className="text-mc-mute">VAT {h.vatPct}%</dt>
                <dd>{formatUSD(totals.vat)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-mc-ink pt-2 text-base font-medium">
              <dt>Total due</dt>
              <dd data-testid="invoice-total">{formatUSD(totals.total)}</dd>
            </div>
          </dl>

          <section className="mt-6 grid grid-cols-2 gap-6 border-t border-mc-line pt-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-mc-mute">Payment</p>
              <p>{term?.label.en}</p>
              <p>{method?.label.en}</p>
              {h.payMethod === "PAYPAL" && h.paypalLink && <p className="break-all">Pay online: {h.paypalLink}</p>}
              {h.payMethod === "TT" && (
                <p className="mt-1">
                  {bankAccounts.foreign.bank} · SWIFT {bankAccounts.foreign.swift}
                  <br />
                  A/C {bankAccounts.foreign.account} · {bankAccounts.foreign.beneficiary}
                  <br />
                  {bankAccounts.foreign.bankAddress}
                </p>
              )}
              {h.payMethod === "KRW" && (
                <p className="mt-1">
                  {bankAccounts.domestic.bank} {bankAccounts.domestic.account} ({bankAccounts.domestic.holder})
                </p>
              )}
              <p className="mt-1 text-mc-mute">Please quote invoice no. {h.invoiceNo} with your payment. Bank charges are borne by the remitter.</p>
            </div>
            <div>
              {docType === "commercial" ? (
                <>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-mc-mute">Shipment</p>
                  <p>Packages: {h.packages || "—"}</p>
                  <p>Net weight: {h.netWeight || "—"} kg</p>
                  <p>Gross weight: {h.grossWeight || "—"} kg</p>
                  <p className="mt-2 text-mc-mute">
                    We hereby certify that the goods described are of {seller.countryOfOrigin} origin and that this invoice is true and correct.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-mc-mute">Terms</p>
                  <p>Valid until {h.validUntil}. Production starts on receipt of payment{h.leadTime ? `; estimated shipment ${h.leadTime}` : ""}.</p>
                  <p className="mt-1 text-mc-mute">
                    Mycerra™ is a cultivated natural material; slight variation in colour and texture between batches is inherent and not a defect.
                  </p>
                </>
              )}
            </div>
          </section>

          {h.notes && <p className="mt-4 border-t border-mc-line pt-3">{h.notes}</p>}

          <div className="mt-10 flex justify-end">
            <div className="w-56 border-t border-mc-ink pt-2 text-[11px] text-mc-mute">Authorised signature · {seller.company}</div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default InvoiceGenerator;

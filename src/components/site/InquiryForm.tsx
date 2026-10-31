import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { company, expressions, inquiryTypes, type InquiryTypeId } from "@/content/mycerra";

const stages = ["Swatch kit", "Prototype (full sheets)", "Production volume"];
const processes = ["Aniline dyeing", "Embossing", "Shaving / splitting", "Cutting & stitching", "Other finishing"];

interface Props {
  initialType?: InquiryTypeId;
  initialRef?: string | null;
}

const inputCls =
  "w-full border-0 border-b border-mc-line bg-transparent px-0 py-3 text-[15px] outline-none transition-colors placeholder:text-mc-mute/60 focus:border-mc-ink";

const Field = ({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) => (
  <label className={cn("block", className)}>
    <span className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">{label}</span>
    {children}
  </label>
);

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

// 백엔드가 없으므로 문의 내용을 정리해 메일 앱으로 넘긴다 (CRM 연동 시 submit 부분만 교체)
export const InquiryForm = ({ initialType = "brand", initialRef }: Props) => {
  const [type, setType] = useState<InquiryTypeId>(initialType);
  const [form, setForm] = useState({ name: "", company: "", country: "", email: "", message: "" });
  const [codes, setCodes] = useState<string[]>(initialRef ? [initialRef] : []);
  const [stage, setStage] = useState(stages[0]);
  const [procs, setProcs] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const typeLabel = inquiryTypes.find((t) => t.id === type)?.label ?? type;
    const lines = [
      `Inquiry type: ${typeLabel}`,
      `Name: ${form.name}`,
      `Company: ${form.company}`,
      `Country: ${form.country}`,
      `Email: ${form.email}`,
    ];
    if (type === "brand") {
      lines.push(`Stage: ${stage}`, `Materials of interest: ${codes.length ? codes.join(", ") : "Not specified"}`);
    }
    if (type === "manufacturer") {
      lines.push(`Processes to trial: ${procs.length ? procs.join(", ") : "Not specified"}`);
    }
    lines.push("", form.message);
    const subject = `[Mycerra] ${typeLabel} — ${form.company || form.name}`;
    window.location.href = `mailto:${company.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
    setSent(true);
  };

  return (
    <form onSubmit={submit} className="space-y-10">
      <fieldset>
        <legend className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">I am a</legend>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {inquiryTypes.map((t) => (
            <label
              key={t.id}
              className={cn(
                "cursor-pointer border p-4 transition-colors",
                type === t.id ? "border-mc-ink bg-mc-ink text-mc-paper" : "border-mc-line hover:border-mc-ink",
              )}
            >
              <input
                type="radio"
                name="type"
                value={t.id}
                checked={type === t.id}
                onChange={() => setType(t.id)}
                className="sr-only"
              />
              <span className="block font-mc-serif text-lg">{t.label}</span>
              <span className={cn("text-xs", type === t.id ? "text-mc-paper/70" : "text-mc-mute")}>{t.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-8 sm:grid-cols-2">
        <Field label="Name *">
          <input required value={form.name} onChange={set("name")} className={inputCls} autoComplete="name" />
        </Field>
        <Field label="Company *">
          <input required value={form.company} onChange={set("company")} className={inputCls} autoComplete="organization" />
        </Field>
        <Field label="Country *">
          <input required value={form.country} onChange={set("country")} className={inputCls} autoComplete="country-name" />
        </Field>
        <Field label="Email *">
          <input required type="email" value={form.email} onChange={set("email")} className={inputCls} autoComplete="email" />
        </Field>
      </div>

      {type === "brand" && (
        <div className="space-y-8">
          <fieldset>
            <legend className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">Stage</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {stages.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStage(s)}
                  aria-pressed={stage === s}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition-colors",
                    stage === s ? "border-mc-ink bg-mc-ink text-mc-paper" : "border-mc-line hover:border-mc-ink",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">Materials of interest</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {expressions.map((e) => (
                <button
                  key={e.code}
                  type="button"
                  onClick={() => setCodes((c) => toggle(c, e.code))}
                  aria-pressed={codes.includes(e.code)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors",
                    codes.includes(e.code) ? "border-mc-ink bg-mc-ink text-mc-paper" : "border-mc-line hover:border-mc-ink",
                  )}
                >
                  <img src={e.image} alt="" className="h-6 w-6 rounded-full object-cover" />
                  {e.name} <span className="opacity-60">{e.code}</span>
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {type === "manufacturer" && (
        <fieldset>
          <legend className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">Processes you would like to trial</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {processes.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProcs((c) => toggle(c, p))}
                aria-pressed={procs.includes(p)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition-colors",
                  procs.includes(p) ? "border-mc-ink bg-mc-ink text-mc-paper" : "border-mc-line hover:border-mc-ink",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <Field label="Message *">
        <textarea required rows={5} value={form.message} onChange={set("message")} className={cn(inputCls, "resize-y")} />
      </Field>

      <label className="flex items-start gap-3 text-sm text-mc-mute">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 accent-mc-ink"
        />
        I consent to SAVE EARTH Inc. processing my details to respond to this inquiry.
      </label>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <button
          type="submit"
          className="rounded-full bg-mc-ink px-8 py-3 text-sm text-mc-paper transition-colors hover:bg-mc-burgundy"
        >
          Send inquiry
        </button>
        <p className="text-xs text-mc-mute" aria-live="polite">
          {sent
            ? `Your email app should now be open with the inquiry. If not, write to ${company.email}.`
            : `Opens your email app addressed to ${company.email}.`}
        </p>
      </div>
    </form>
  );
};

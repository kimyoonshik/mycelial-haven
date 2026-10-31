import { useState, type FormEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { company, expressions, inquiryTypes, type InquiryTypeId } from "@/content/mycerra";
import { useCopy, useLang, type L } from "@/i18n/LanguageProvider";

const stages: L[] = [
  { en: "Swatch kit", ko: "스와치 키트" },
  { en: "Prototype (full sheets)", ko: "시제품 (풀시트)" },
  { en: "Production volume", ko: "양산 물량" },
];
const processes: L[] = [
  { en: "Aniline dyeing", ko: "아닐린 염색" },
  { en: "Embossing", ko: "엠보" },
  { en: "Shaving / splitting", ko: "쉐이빙 / 분할" },
  { en: "Cutting & stitching", ko: "재단 및 봉제" },
  { en: "Other finishing", ko: "기타 마감" },
];

const copy = {
  en: {
    iam: "I am a",
    name: "Name *",
    company: "Company *",
    country: "Country *",
    email: "Email *",
    stage: "Stage",
    materials: "Materials of interest",
    processes: "Processes you would like to trial",
    message: "Message *",
    consent: "I consent to SAVE EARTH Inc. processing my details to respond to this inquiry.",
    send: "Send inquiry",
    sent: `Your email app should now be open with the inquiry. If not, write to ${company.email}.`,
    idle: `Opens your email app addressed to ${company.email}.`,
  },
  ko: {
    iam: "문의자 구분",
    name: "이름 *",
    company: "회사 *",
    country: "국가 *",
    email: "이메일 *",
    stage: "진행 단계",
    materials: "관심 소재",
    processes: "테스트하려는 공정",
    message: "문의 내용 *",
    consent: "문의 응대를 위해 SAVE EARTH Inc.가 제 정보를 처리하는 데 동의합니다.",
    send: "문의 보내기",
    sent: `메일 앱이 열렸습니다. 열리지 않았다면 ${company.email}로 직접 보내 주세요.`,
    idle: `${company.email} 주소로 메일 앱이 열립니다.`,
  },
};

interface Props {
  initialType?: InquiryTypeId;
  initialRef?: string | null;
}

const inputCls =
  "w-full border-0 border-b border-mc-line bg-transparent px-0 py-3 text-[15px] outline-none transition-colors placeholder:text-mc-mute/60 focus:border-mc-ink";

const Field = ({ label, children, className }: { label: string; children: ReactNode; className?: string }) => (
  <label className={cn("block", className)}>
    <span className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">{label}</span>
    {children}
  </label>
);

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      "flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors",
      active ? "border-mc-ink bg-mc-ink text-mc-paper" : "border-mc-line hover:border-mc-ink",
    )}
  >
    {children}
  </button>
);

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

// 백엔드가 없으므로 문의 내용을 정리해 메일 앱으로 넘긴다 (CRM 연동 시 submit 부분만 교체).
// 메일 본문은 받는 쪽이 일관되게 처리하도록 화면 언어와 무관하게 영문으로 작성한다.
export const InquiryForm = ({ initialType = "brand", initialRef }: Props) => {
  const c = useCopy(copy);
  const { t, lang } = useLang();
  const [type, setType] = useState<InquiryTypeId>(initialType);
  const [form, setForm] = useState({ name: "", company: "", country: "", email: "", message: "" });
  const [codes, setCodes] = useState<string[]>(initialRef ? [initialRef] : []);
  const [stage, setStage] = useState(stages[0].en);
  const [procs, setProcs] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const typeLabel = inquiryTypes.find((x) => x.id === type)?.label.en ?? type;
    const lines = [
      `Inquiry type: ${typeLabel}`,
      `Name: ${form.name}`,
      `Company: ${form.company}`,
      `Country: ${form.country}`,
      `Email: ${form.email}`,
      `Site language: ${lang.toUpperCase()}`,
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
        <legend className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">{c.iam}</legend>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {inquiryTypes.map((it) => (
            <label
              key={it.id}
              className={cn(
                "cursor-pointer border p-4 transition-colors",
                type === it.id ? "border-mc-ink bg-mc-ink text-mc-paper" : "border-mc-line hover:border-mc-ink",
              )}
            >
              <input
                type="radio"
                name="type"
                value={it.id}
                checked={type === it.id}
                onChange={() => setType(it.id)}
                className="sr-only"
              />
              <span className="block font-mc-serif text-lg">{t(it.label)}</span>
              <span className={cn("text-xs", type === it.id ? "text-mc-paper/70" : "text-mc-mute")}>{t(it.hint)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-8 sm:grid-cols-2">
        <Field label={c.name}>
          <input required value={form.name} onChange={set("name")} className={inputCls} autoComplete="name" />
        </Field>
        <Field label={c.company}>
          <input required value={form.company} onChange={set("company")} className={inputCls} autoComplete="organization" />
        </Field>
        <Field label={c.country}>
          <input required value={form.country} onChange={set("country")} className={inputCls} autoComplete="country-name" />
        </Field>
        <Field label={c.email}>
          <input required type="email" value={form.email} onChange={set("email")} className={inputCls} autoComplete="email" />
        </Field>
      </div>

      {type === "brand" && (
        <div className="space-y-8">
          <fieldset>
            <legend className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">{c.stage}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {stages.map((s) => (
                <Chip key={s.en} active={stage === s.en} onClick={() => setStage(s.en)}>
                  {t(s)}
                </Chip>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">{c.materials}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {expressions.map((e) => (
                <button
                  key={e.code}
                  type="button"
                  onClick={() => setCodes((x) => toggle(x, e.code))}
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
          <legend className="text-[11px] uppercase tracking-[0.18em] text-mc-mute">{c.processes}</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {processes.map((p) => (
              <Chip key={p.en} active={procs.includes(p.en)} onClick={() => setProcs((x) => toggle(x, p.en))}>
                {t(p)}
              </Chip>
            ))}
          </div>
        </fieldset>
      )}

      <Field label={c.message}>
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
        {c.consent}
      </label>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <button
          type="submit"
          className="rounded-full bg-mc-ink px-8 py-3 text-sm text-mc-paper transition-colors hover:bg-mc-burgundy"
        >
          {c.send}
        </button>
        <p className="text-xs text-mc-mute" aria-live="polite">
          {sent ? c.sent : c.idle}
        </p>
      </div>
    </form>
  );
};

import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { company } from "@/content/mycerra";
import { testGroupLabel, testItems, type TestGroup } from "@/content/testReports";
import { useCopy, useLang } from "@/i18n/LanguageProvider";

const copy = {
  en: {
    item: "Test item",
    method: "Method",
    unit: "Unit",
    result: "Result",
    lab: "Laboratory",
    report: "Report",
    pending: "Testing scheduled",
    view: "View PDF",
    reported: "reported",
    note: "Results will be published here with the original test report as each test is completed. Methods shown are the planned standards.",
    request: "Request a test report",
  },
  ko: {
    item: "시험 항목",
    method: "시험법",
    unit: "단위",
    result: "결과",
    lab: "시험기관",
    report: "성적서",
    pending: "시험 예정",
    view: "PDF 보기",
    reported: "보고 완료",
    note: "시험이 끝나는 대로 원본 성적서와 함께 결과를 이곳에 공개합니다. 표기된 시험법은 계획 기준입니다.",
    request: "성적서 요청",
  },
};

const groups: TestGroup[] = ["physical", "colour", "comfort"];

// 성능지표 성적서 표시 자리 — 데이터는 src/content/testReports.ts
export const TestReports = () => {
  const c = useCopy(copy);
  const { t } = useLang();
  const done = testItems.filter((i) => i.result !== null).length;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-mc-line">
            <div className="h-full bg-mc-ink" style={{ width: `${(done / testItems.length) * 100}%` }} />
          </div>
          <p className="text-sm text-mc-mute">
            {done} / {testItems.length} {c.reported}
          </p>
        </div>
        <a
          href={`mailto:${company.email}?subject=${encodeURIComponent("[Mycerra] Test report request")}`}
          className="text-sm underline underline-offset-4"
        >
          {c.request}
        </a>
      </div>

      {groups.map((g) => (
        <section key={g} className="mt-10">
          <h3 className="font-mc-sans text-[11px] uppercase tracking-[0.18em] text-mc-mute">{t(testGroupLabel[g])}</h3>
          {/* 데스크톱: 표 / 모바일: 카드 */}
          <table className="mt-3 hidden w-full table-fixed border-t border-mc-ink text-left text-sm md:table">
            {/* 그룹별 표의 열 위치를 맞추기 위해 너비 고정 */}
            <colgroup>
              <col className="w-[32%]" />
              <col className="w-[15%]" />
              <col className="w-[13%]" />
              <col className="w-[15%]" />
              <col className="w-[13%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-mc-line text-[11px] uppercase tracking-[0.14em] text-mc-mute">
                <th className="py-3 pr-4 font-normal">{c.item}</th>
                <th className="py-3 pr-4 font-normal">{c.method}</th>
                <th className="py-3 pr-4 font-normal">{c.unit}</th>
                <th className="py-3 pr-4 font-normal">{c.result}</th>
                <th className="py-3 pr-4 font-normal">{c.lab}</th>
                <th className="py-3 font-normal">{c.report}</th>
              </tr>
            </thead>
            <tbody>
              {testItems
                .filter((i) => i.group === g)
                .map((i) => (
                  <tr key={i.id} className="border-b border-mc-line align-middle">
                    <td className="py-4 pr-4 font-mc-serif text-base">{t(i.name)}</td>
                    <td className="py-4 pr-4 text-mc-mute">{i.method}</td>
                    <td className="py-4 pr-4 text-mc-mute">{i.unit}</td>
                    <td className="py-4 pr-4">
                      {i.result ?? <PendingChip label={c.pending} />}
                    </td>
                    <td className="py-4 pr-4 text-mc-mute">{i.lab ?? "—"}</td>
                    <td className="py-4">
                      <ReportSlot url={i.reportUrl} date={i.reportDate} label={c.view} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <ul className="mt-3 divide-y divide-mc-line border-y border-mc-ink md:hidden">
            {testItems
              .filter((i) => i.group === g)
              .map((i) => (
                <li key={i.id} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mc-serif text-base">{t(i.name)}</span>
                    {i.result ? <span>{i.result}</span> : <PendingChip label={c.pending} />}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-mc-mute">
                    <span>
                      {i.method} · {i.unit}
                      {i.lab ? ` · ${i.lab}` : ""}
                    </span>
                    <ReportSlot url={i.reportUrl} date={i.reportDate} label={c.view} />
                  </div>
                </li>
              ))}
          </ul>
        </section>
      ))}

      <p className="mt-6 text-xs leading-relaxed text-mc-mute">{c.note}</p>
    </div>
  );
};

const PendingChip = ({ label }: { label: string }) => (
  <span className="inline-flex rounded-full border border-dashed border-mc-ink/25 px-2.5 py-0.5 text-[11px] text-mc-mute">
    {label}
  </span>
);

const ReportSlot = ({ url, date, label }: { url: string | null; date: string | null; label: string }) =>
  url ? (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 underline underline-offset-4">
      <FileText className="h-4 w-4" />
      {label}
      {date && <span className="text-mc-mute no-underline">({date})</span>}
    </a>
  ) : (
    <span className={cn("inline-flex items-center gap-1.5 text-mc-mute/50")} aria-label="No report yet">
      <FileText className="h-4 w-4" />—
    </span>
  );

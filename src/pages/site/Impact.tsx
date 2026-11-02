import type { ReactNode } from "react";
import { Reveal } from "@/components/site/Reveal";
import { Container, Display, Eyebrow, PillButton, ProofBadge } from "@/components/site/primitives";
import { claims, company, traceability } from "@/content/mycerra";
import { usePageCopy } from "@/content/site";
import { Sections } from "@/components/site/Sections";
import { useCopy, useLang } from "@/i18n/LanguageProvider";
import { FileText } from "lucide-react";

// 문구·사진·섹션 순서: src/content/data/site.json › pages.impact (운영 도구 "페이지" 탭)


// 근거 문서 링크 문구 (화면 조작용)
const proofCopy = {
  en: { view: "View report (PDF)", verify: "Verify with the lab", cert: "Certificate no." },
  ko: { view: "성적서 보기 (PDF)", verify: "시험기관에서 진위 확인", cert: "인증 번호" },
};

const Impact = () => {
  const c = usePageCopy("impact");
  const p = useCopy(proofCopy);
  const { t } = useLang();

  const sections: Record<string, ReactNode> = {
    intro: (
      <section className="pb-20 pt-36 md:pt-44">
        <Container>
          <Eyebrow>{c.eyebrow}</Eyebrow>
          <Display as="h1" className="mt-5 max-w-5xl text-[clamp(2.75rem,7vw,6.5rem)]">
            {c.title}
          </Display>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-mc-mute">{c.intro}</p>
        </Container>
      </section>
    ),

    // 수치 + 근거 문서 상태
    claims: (
      <section className="border-t border-mc-line">
        <Container>
          <ul className="divide-y divide-mc-line">
            {claims.map((cl, i) => (
              <Reveal as="li" key={i} delay={i * 80} className="grid gap-6 py-12 md:grid-cols-12 md:items-center">
                <p className="font-mc-serif text-7xl md:col-span-3 md:text-8xl">{cl.value}</p>
                <div className="md:col-span-5">
                  <p className="text-sm uppercase tracking-[0.18em]">{t(cl.label)}</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-mc-mute">{t(cl.detail)}</p>
                </div>
                <div className="flex min-w-0 flex-col items-start gap-2 md:col-span-4 md:items-end md:text-right">
                  <p className="font-mc-serif text-lg">{t(cl.proof.title)}</p>
                  <ProofBadge status={cl.proof.status} />
                  {cl.proof.meta && <p className="text-xs leading-relaxed text-mc-mute">{t(cl.proof.meta)}</p>}
                  {cl.proof.href && (
                    <a
                      href={cl.proof.href}
                      target="_blank"
                      rel="noreferrer"
                      data-testid="claim-proof"
                      className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4"
                    >
                      <FileText className="h-4 w-4" /> {p.view}
                    </a>
                  )}
                  {cl.proof.verifyUrl && (
                    <p className="max-w-full text-xs text-mc-mute">
                      <a href={cl.proof.verifyUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                        {p.verify}
                      </a>
                      {cl.proof.certificate && (
                        <span className="mt-1 block break-all font-mono text-[11px]">
                          {p.cert} {cl.proof.certificate}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </Reveal>
            ))}
          </ul>
        </Container>
      </section>
    ),

    // 원산지 추적 · EUDR
    traceability: (
      <section className="bg-mc-ink text-mc-paper">
        <div className="grid md:grid-cols-2">
          <div className="relative min-h-[320px]">
            <img src={c.facilityImage} alt={c.facilityAlt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          </div>
          <div className="px-5 py-20 md:px-14 md:py-28">
            <Reveal>
              <Eyebrow className="text-mc-paper/50">{c.traceEyebrow}</Eyebrow>
              <Display className="mt-4 text-4xl md:text-5xl">{t(traceability.title)}</Display>
              <p className="mt-6 text-[15px] leading-relaxed text-mc-paper/75">{t(traceability.body)}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <span className="font-mc-serif text-lg">{t(traceability.proof.title)}</span>
                <ProofBadge status={traceability.proof.status} light />
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    ),

    // 원칙 3축
    principles: (
      <section className="py-24 md:py-32">
        <Container>
          <Reveal>
            <Eyebrow>{c.principlesEyebrow}</Eyebrow>
            <Display className="mt-4 max-w-3xl text-[clamp(2.25rem,5vw,4.5rem)]">{c.principlesTitle}</Display>
          </Reveal>
          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {c.principles.map((p, i) => (
              <Reveal key={i} delay={i * 120} className="border-t border-mc-ink pt-6">
                <span aria-hidden className="block select-none font-mc-serif text-6xl leading-none text-mc-ink/[0.14] [font-variant-numeric:lining-nums]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-mc-serif text-2xl">{p.t}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-mc-mute">{p.b}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
    ),

    // 근거 문서 요청
    docs: (
      <section className="pb-24 md:pb-32">
        <Container>
          <div className="rounded-sm bg-mc-cream p-8 md:flex md:items-center md:justify-between md:p-12">
            <p className="max-w-xl font-mc-serif text-2xl leading-snug">{c.docsQuestion}</p>
            <PillButton
              href={`mailto:${company.email}?subject=${encodeURIComponent("[Mycerra] Impact documentation request")}`}
              className="mt-6 md:mt-0"
            >
              {c.docsCta}
            </PillButton>
          </div>
        </Container>
      </section>
    ),
  };

  return (
    <>
      <Sections page="impact" sections={sections} />
    </>
  );
};

export default Impact;

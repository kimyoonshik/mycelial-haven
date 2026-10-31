import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Reveal } from "@/components/site/Reveal";
import { InquiryForm } from "@/components/site/InquiryForm";
import { Container, Display, Eyebrow, ProofBadge, TextLink } from "@/components/site/primitives";
import { company, downloads, inquiryTypes, workSpecs, type InquiryTypeId } from "@/content/mycerra";
import { usePageCopy } from "@/content/site";
import { Sections } from "@/components/site/Sections";
import { useLang } from "@/i18n/LanguageProvider";

// 문구·섹션 순서: src/content/data/site.json › pages["work-with-us"] (운영 도구 "페이지" 탭)


const WorkWithUs = () => {
  const c = usePageCopy("work-with-us");
  const { t } = useLang();
  const [params] = useSearchParams();
  const typeParam = params.get("type");
  const initialType = inquiryTypes.some((x) => x.id === typeParam) ? (typeParam as InquiryTypeId) : "brand";

  const sections: Record<string, ReactNode> = {
    intro: (
      <section className="pb-20 pt-36 md:pt-44">
        <Container>
          <Eyebrow>{c.eyebrow}</Eyebrow>
          <Display as="h1" className="mt-5 max-w-5xl text-[clamp(2.75rem,7vw,6.5rem)]">
            {c.titleBefore}
            <sup className="align-super text-[0.3em]">™</sup>.
          </Display>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-mc-mute">{c.intro}</p>
        </Container>
      </section>
    ),
    steps: (
      <section className="border-t border-mc-line">
        <Container>
          <div className="grid gap-px bg-mc-line md:grid-cols-4">
            {c.steps.map((s, i) => (
              <Reveal key={i} delay={i * 100} className="bg-mc-paper py-10 md:px-6 md:first:pl-0">
                <p className="text-xs tracking-[0.2em] text-mc-mute">0{i + 1}</p>
                <h3 className="mt-3 font-mc-serif text-2xl">{s.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-mc-mute">{s.b}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
    ),
    supply: (
      <section className="bg-mc-cream py-20 md:py-28">
        <Container className="grid gap-16 md:grid-cols-12">
          <Reveal className="md:col-span-6">
            <Eyebrow>{c.supplyEyebrow}</Eyebrow>
            <Display className="mt-4 text-4xl md:text-5xl">{c.supplyTitle}</Display>
            <dl className="mt-8 divide-y divide-mc-line border-y border-mc-line">
              {workSpecs.map((s) => (
                <div key={s.label.en} className="flex justify-between gap-6 py-4 text-[15px]">
                  <dt className="text-mc-mute">{t(s.label)}</dt>
                  <dd className="text-right">{s.value ? t(s.value) : <span className="text-mc-mute">{c.onRequest}</span>}</dd>
                </div>
              ))}
            </dl>
            <TextLink to="/shop" className="mt-8">
              {c.shopCta}
            </TextLink>
          </Reveal>
          <Reveal className="md:col-span-5 md:col-start-8" delay={150}>
            <div id="downloads" className="scroll-mt-24">
              <Eyebrow>{c.docsEyebrow}</Eyebrow>
              <Display className="mt-4 text-4xl md:text-5xl">{c.docsTitle}</Display>
              <ul className="mt-8 divide-y divide-mc-line border-y border-mc-line">
                {downloads.map((d) => (
                  <li key={d.title.en} className="flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-mc-serif text-xl">{t(d.title)}</span>
                    <span className="flex items-center gap-3">
                      <ProofBadge status={d.status} />
                      <a
                        href={`mailto:${company.email}?subject=${encodeURIComponent(`[Mycerra] Request: ${d.title.en}`)}`}
                        className="text-sm underline underline-offset-4"
                      >
                        {c.request}
                      </a>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </Container>
      </section>
    ),
    inquiry: (
      <section id="inquiry" className="scroll-mt-16 py-20 md:py-28">
        <Container className="grid gap-16 md:grid-cols-12">
          <div className="md:col-span-4">
            <Eyebrow>{c.inquiryEyebrow}</Eyebrow>
            <Display className="mt-4 text-4xl md:text-5xl">{c.inquiryTitle}</Display>
            <p className="mt-6 text-[15px] leading-relaxed text-mc-mute">{c.inquiryBody}</p>
            <a href={`mailto:${company.email}`} className="mt-6 inline-block font-mc-serif text-xl underline underline-offset-4">
              {company.email}
            </a>
          </div>
          <div className="md:col-span-7 md:col-start-6">
            <InquiryForm key={`${initialType}-${params.get("ref")}`} initialType={initialType} initialRef={params.get("ref")} />
          </div>
        </Container>
      </section>
    ),
  };

  return (
    <>
      <Sections page="work-with-us" sections={sections} />
    </>
  );
};

export default WorkWithUs;

import { useSearchParams } from "react-router-dom";
import { Reveal } from "@/components/site/Reveal";
import { InquiryForm } from "@/components/site/InquiryForm";
import { Container, Display, Eyebrow, ProofBadge, TextLink } from "@/components/site/primitives";
import { company, downloads, inquiryTypes, workSpecs, type InquiryTypeId } from "@/content/mycerra";
import { useCopy, useLang } from "@/i18n/LanguageProvider";

const copy = {
  en: {
    eyebrow: "Work with us",
    titleBefore: "How to work with Mycerra",
    intro:
      "Mycerra™ is available as swatch kits, full sheets or custom developments. Every collaboration begins with a short conversation.",
    steps: [
      {
        t: "Start a conversation",
        b: "Tell us about your product, quantities and timeline. We help you identify the most suitable Mycerra™ expression.",
      },
      { t: "Evaluate swatches", b: "Receive a swatch kit, review the Technical Data Sheet and test the material on your own lines." },
      {
        t: "Prototype & develop",
        b: "Order full sheets for prototyping, or develop a custom colour and finish together with our team.",
      },
      { t: "Scale", b: "Each batch is cultivated, stabilized, finished and origin-documented in Korea, then shipped worldwide." },
    ],
    supplyEyebrow: "Supply",
    supplyTitle: "Formats & ordering",
    onRequest: "On request",
    shopCta: "Order swatches and sheets in the shop",
    docsEyebrow: "Documents",
    docsTitle: "Downloads",
    request: "Request",
    inquiryEyebrow: "Inquiry",
    inquiryTitle: "Let’s grow something together.",
    inquiryBody:
      "Brands, tanneries, investors and press — choose who you are so we can route your message to the right person.",
  },
  ko: {
    eyebrow: "협업 안내",
    titleBefore: "Mycerra와 함께 일하는 방법",
    intro: "Mycerra™는 스와치 키트, 풀시트, 맞춤 개발 형태로 공급됩니다. 모든 협업은 짧은 대화에서 시작합니다.",
    steps: [
      { t: "상담 시작", b: "제품, 수량, 일정을 알려 주시면 가장 적합한 Mycerra™ 표현을 함께 찾습니다." },
      { t: "스와치 평가", b: "스와치 키트를 받아 기술자료를 검토하고, 귀사의 라인에서 직접 테스트합니다." },
      { t: "시제품·개발", b: "시제품용 풀시트를 주문하거나, 저희 팀과 맞춤 컬러·마감을 개발합니다." },
      { t: "양산", b: "모든 배치는 국내에서 배양·안정화·마감되고 원산지가 기록된 뒤 전 세계로 배송됩니다." },
    ],
    supplyEyebrow: "공급",
    supplyTitle: "공급 형태와 주문",
    onRequest: "문의",
    shopCta: "쇼핑몰에서 스와치·시트 주문하기",
    docsEyebrow: "문서",
    docsTitle: "자료 내려받기",
    request: "요청",
    inquiryEyebrow: "문의",
    inquiryTitle: "함께 키워 갈 것을 이야기해 주세요.",
    inquiryBody: "브랜드, 제혁사, 투자자, 언론 중 해당하는 구분을 선택해 주시면 담당자에게 바로 전달됩니다.",
  },
};

const WorkWithUs = () => {
  const c = useCopy(copy);
  const { t } = useLang();
  const [params] = useSearchParams();
  const typeParam = params.get("type");
  const initialType = inquiryTypes.some((x) => x.id === typeParam) ? (typeParam as InquiryTypeId) : "brand";

  return (
    <>
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

      <section className="border-t border-mc-line">
        <Container>
          <div className="grid gap-px bg-mc-line md:grid-cols-4">
            {c.steps.map((s, i) => (
              <Reveal key={s.t} delay={i * 100} className="bg-mc-paper py-10 md:px-6 md:first:pl-0">
                <p className="text-xs tracking-[0.2em] text-mc-mute">0{i + 1}</p>
                <h3 className="mt-3 font-mc-serif text-2xl">{s.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-mc-mute">{s.b}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

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
    </>
  );
};

export default WorkWithUs;

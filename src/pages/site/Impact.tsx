import facility from "@/assets/mycerra/process-facility.webp";
import { Reveal } from "@/components/site/Reveal";
import { Container, Display, Eyebrow, PillButton, ProofBadge } from "@/components/site/primitives";
import { claims, company, traceability } from "@/content/mycerra";
import { useCopy, useLang } from "@/i18n/LanguageProvider";

const copy = {
  en: {
    eyebrow: "Impact",
    title: "Sustainability with proof, not promise.",
    intro:
      "We develop materials that restore balance — minimizing environmental impact while maximizing circular value. Every claim on this page is linked to the document that supports it.",
    traceEyebrow: "Traceability",
    facilityAlt: "Controlled mycelium cultivation facility in Korea",
    principlesEyebrow: "Our principles",
    principlesTitle: "Less water. Less waste. More balance.",
    principles: [
      {
        t: "No animal inputs",
        b: "Cultivated independently from livestock, grazing land and feed crops — advancing animal welfare and removing deforestation risk.",
      },
      {
        t: "Designed for circularity",
        b: "No petrochemical binders and no composite layers, so the material can return to the earth at the end of its life.",
      },
      {
        t: "Low-energy growth",
        b: "Uniform growth under ambient conditions keeps energy demand low while ensuring industrial consistency.",
      },
    ],
    docsQuestion: "Need our LCA or test reports for supplier due diligence?",
    docsCta: "Request documentation",
  },
  ko: {
    eyebrow: "임팩트",
    title: "약속이 아닌 증거로 말하는 지속가능성.",
    intro:
      "환경 영향은 최소화하고 순환 가치는 극대화해 균형을 되찾는 소재를 개발합니다. 이 페이지의 모든 주장은 이를 뒷받침하는 문서와 연결됩니다.",
    traceEyebrow: "원산지 추적",
    facilityAlt: "국내 균사 배양 통제 시설",
    principlesEyebrow: "우리의 원칙",
    principlesTitle: "물은 적게, 폐기물은 적게, 균형은 더.",
    principles: [
      {
        t: "동물성 원료 무투입",
        b: "가축·방목지·사료작물과 무관하게 배양해 동물 복지를 높이고 산림파괴 위험을 없앱니다.",
      },
      {
        t: "순환을 전제로 한 설계",
        b: "석유화학 바인더와 복합 레이어가 없어 수명이 다하면 흙으로 돌아갈 수 있습니다.",
      },
      {
        t: "저에너지 생장",
        b: "상온에서의 균일한 생장으로 에너지 수요를 낮추면서 산업적 일관성을 확보합니다.",
      },
    ],
    docsQuestion: "공급망 실사를 위해 LCA나 시험 성적서가 필요하신가요?",
    docsCta: "문서 요청",
  },
};

const Impact = () => {
  const c = useCopy(copy);
  const { t } = useLang();

  return (
    <>
      <section className="pb-20 pt-36 md:pt-44">
        <Container>
          <Eyebrow>{c.eyebrow}</Eyebrow>
          <Display as="h1" className="mt-5 max-w-5xl text-[clamp(2.75rem,7vw,6.5rem)]">
            {c.title}
          </Display>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-mc-mute">{c.intro}</p>
        </Container>
      </section>

      {/* 수치 + 근거 문서 상태 */}
      <section className="border-t border-mc-line">
        <Container>
          <ul className="divide-y divide-mc-line">
            {claims.map((cl, i) => (
              <Reveal as="li" key={cl.value} delay={i * 80} className="grid gap-6 py-12 md:grid-cols-12 md:items-center">
                <p className="font-mc-serif text-7xl font-light md:col-span-3 md:text-8xl">{cl.value}</p>
                <div className="md:col-span-5">
                  <p className="text-sm uppercase tracking-[0.18em]">{t(cl.label)}</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-mc-mute">{t(cl.detail)}</p>
                </div>
                <div className="flex flex-col items-start gap-2 md:col-span-4 md:items-end">
                  <p className="font-mc-serif text-lg">{t(cl.proof.title)}</p>
                  <ProofBadge status={cl.proof.status} />
                </div>
              </Reveal>
            ))}
          </ul>
        </Container>
      </section>

      {/* 원산지 추적 · EUDR */}
      <section className="bg-mc-ink text-mc-paper">
        <div className="grid md:grid-cols-2">
          <div className="relative min-h-[320px]">
            <img src={facility} alt={c.facilityAlt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
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

      {/* 원칙 3축 */}
      <section className="py-24 md:py-32">
        <Container>
          <Reveal>
            <Eyebrow>{c.principlesEyebrow}</Eyebrow>
            <Display className="mt-4 max-w-3xl text-[clamp(2.25rem,5vw,4.5rem)]">{c.principlesTitle}</Display>
          </Reveal>
          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {c.principles.map((p, i) => (
              <Reveal key={p.t} delay={i * 120} className="border-t border-mc-ink pt-6">
                <h3 className="font-mc-serif text-2xl">{p.t}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-mc-mute">{p.b}</p>
              </Reveal>
            ))}
          </div>
          <div className="mt-16 rounded-sm bg-mc-cream p-8 md:flex md:items-center md:justify-between md:p-12">
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
    </>
  );
};

export default Impact;

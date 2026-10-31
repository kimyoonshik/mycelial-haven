import facility from "@/assets/mycerra/process-facility.webp";
import { Reveal } from "@/components/site/Reveal";
import { Container, Display, Eyebrow, PillButton, ProofBadge } from "@/components/site/primitives";
import { claims, company, traceability } from "@/content/mycerra";

const Impact = () => (
  <>
    <section className="pb-20 pt-36 md:pt-44">
      <Container>
        <Eyebrow>Impact</Eyebrow>
        <Display as="h1" className="mt-5 max-w-5xl text-[clamp(2.75rem,7vw,6.5rem)]">
          Sustainability with proof, not promise.
        </Display>
        <p className="mt-8 max-w-2xl text-lg leading-relaxed text-mc-mute">
          We develop materials that restore balance — minimizing environmental impact while maximizing circular
          value. Every claim on this page is linked to the document that supports it.
        </p>
      </Container>
    </section>

    {/* 수치 + 근거 문서 상태 */}
    <section className="border-t border-mc-line">
      <Container>
        <ul className="divide-y divide-mc-line">
          {claims.map((c, i) => (
            <Reveal as="li" key={c.label} delay={i * 80} className="grid gap-6 py-12 md:grid-cols-12 md:items-center">
              <p className="font-mc-serif text-7xl font-light md:col-span-3 md:text-8xl">{c.value}</p>
              <div className="md:col-span-5">
                <p className="font-mc-sans text-sm uppercase tracking-[0.18em]">{c.label}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-mc-mute">{c.detail}</p>
              </div>
              <div className="flex flex-col items-start gap-2 md:col-span-4 md:items-end">
                <p className="font-mc-serif text-lg">{c.proof.title}</p>
                <ProofBadge status={c.proof.status} />
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
          <img
            src={facility}
            alt="Controlled mycelium cultivation facility in Korea"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        <div className="px-5 py-20 md:px-14 md:py-28">
          <Reveal>
            <Eyebrow className="text-mc-paper/50">Traceability</Eyebrow>
            <Display className="mt-4 text-4xl md:text-5xl">{traceability.title}</Display>
            <p className="mt-6 text-[15px] leading-relaxed text-mc-paper/75">{traceability.body}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="font-mc-serif text-lg">{traceability.proof.title}</span>
              <span className="rounded-full border border-mc-paper/30 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-mc-paper/60">
                {traceability.proof.status === "published" ? "Document available" : "Document in preparation"}
              </span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>

    {/* 원리 3축 */}
    <section className="py-24 md:py-32">
      <Container>
        <Reveal>
          <Eyebrow>Our principles</Eyebrow>
          <Display className="mt-4 max-w-3xl text-[clamp(2.25rem,5vw,4.5rem)]">Less water. Less waste. More balance.</Display>
        </Reveal>
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {[
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
          ].map((p, i) => (
            <Reveal key={p.t} delay={i * 120} className="border-t border-mc-ink pt-6">
              <h3 className="font-mc-serif text-2xl">{p.t}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-mc-mute">{p.b}</p>
            </Reveal>
          ))}
        </div>
        <div className="mt-16 rounded-sm bg-mc-cream p-8 md:flex md:items-center md:justify-between md:p-12">
          <p className="max-w-xl font-mc-serif text-2xl leading-snug">
            Need our LCA or test reports for supplier due diligence?
          </p>
          <PillButton href={`mailto:${company.email}?subject=${encodeURIComponent("[Mycerra] Impact documentation request")}`} className="mt-6 md:mt-0">
            Request documentation
          </PillButton>
        </div>
      </Container>
    </section>
  </>
);

export default Impact;

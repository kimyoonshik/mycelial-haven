import { useEffect, useState } from "react";
import processMycelium from "@/assets/mycerra/process-mycelium.webp";
import finishedCurl from "@/assets/mycerra/impact-curl.webp";
import processSurface from "@/assets/mycerra/process-surface.webp";
import finishPure from "@/assets/mycerra/finish-pure.webp";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/site/Reveal";
import { Container, Display, Eyebrow, PillButton } from "@/components/site/primitives";
import { features, futurePlatform, processSteps } from "@/content/mycerra";

const chapters = [
  { id: "structure", label: "Structure" },
  { id: "cultivate", label: "Cultivate" },
  { id: "stabilize", label: "Stabilize" },
  { id: "finish", label: "Finish" },
  { id: "performance", label: "Performance" },
  { id: "platform", label: "Platform" },
];

const stepImages: Record<string, string> = {
  cultivate: processMycelium,
  stabilize: processSurface,
  finish: finishedCurl,
};

// 스크롤 위치에 따라 왼쪽 목차의 현재 챕터를 표시
const useActiveChapter = () => {
  const [active, setActive] = useState(chapters[0].id);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    chapters.forEach((c) => {
      const el = document.getElementById(c.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return active;
};

const Technology = () => {
  const active = useActiveChapter();

  return (
    <>
      <section className="pb-20 pt-36 md:pt-44">
        <Container>
          <Eyebrow>Technology</Eyebrow>
          <Display as="h1" className="mt-5 max-w-5xl text-[clamp(2.75rem,7vw,6.5rem)]">
            Biotechnology, guided by design.
          </Display>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-mc-mute">
            A pure mycelium mat grown through biotechnology and design — engineered for structural independence,
            process stability and eco-integrity.
          </p>
        </Container>
      </section>

      <Container className="relative grid gap-10 pb-24 md:grid-cols-12">
        <nav className="hidden md:col-span-2 md:block" aria-label="Chapters">
          <ol className="sticky top-28 space-y-2">
            {chapters.map((c) => (
              <li key={c.id}>
                <a
                  href={`#${c.id}`}
                  className={cn(
                    "text-[13px] transition-colors",
                    active === c.id ? "text-mc-ink" : "text-mc-mute/60 hover:text-mc-mute",
                  )}
                >
                  {c.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="md:col-span-10">
          <section id="structure" className="scroll-mt-24 border-t border-mc-line py-16">
            <div className="grid gap-10 lg:grid-cols-2">
              <Reveal>
                <Eyebrow>Structure</Eyebrow>
                <Display className="mt-4 text-4xl md:text-5xl">The mat is the material.</Display>
                <p className="mt-6 text-[15px] leading-relaxed text-mc-mute">
                  Most leather alternatives laminate a coating onto a textile or polymer backing. Mycerra™ uses
                  no non-woven backings, scaffolds or foreign substrates: it is a self-supporting mat cultivated
                  entirely from mycelium. That is what lets it be shaved, dyed and embossed like a hide — and
                  composted at the end of its life.
                </p>
              </Reveal>
              <Reveal delay={150}>
                <div className="aspect-[4/3] overflow-hidden bg-mc-cream">
                  <img src={finishPure} alt="Pure Mycerra — unembossed, undyed mycelium mat" className="h-full w-full object-cover" />
                </div>
              </Reveal>
            </div>
          </section>

          {processSteps.map((s) => {
            const id = s.title.toLowerCase();
            return (
              <section key={s.no} id={id} className="scroll-mt-24 border-t border-mc-line py-16">
                <div className="grid gap-10 lg:grid-cols-2">
                  <Reveal className="lg:order-2">
                    <div className="aspect-[4/3] overflow-hidden bg-mc-cream">
                      <img src={stepImages[id]} alt={s.title} loading="lazy" className="h-full w-full object-cover" />
                    </div>
                  </Reveal>
                  <Reveal delay={150}>
                    <p className="font-mc-sans text-xs tracking-[0.2em] text-mc-mute">{s.no}</p>
                    <Display className="mt-3 text-4xl md:text-5xl">{s.title}</Display>
                    <p className="mt-6 text-[15px] leading-relaxed text-mc-mute">{s.body}</p>
                  </Reveal>
                </div>
              </section>
            );
          })}

          <section id="performance" className="scroll-mt-24 border-t border-mc-line py-16">
            <Reveal>
              <Eyebrow>Performance</Eyebrow>
              <Display className="mt-4 text-4xl md:text-5xl">Redefining how performance materials are made.</Display>
            </Reveal>
            <div className="mt-12 grid gap-px bg-mc-line sm:grid-cols-2">
              {features.map((f, i) => (
                <Reveal key={f.title} delay={i * 100} className="bg-mc-paper p-8">
                  <h3 className="font-mc-serif text-2xl">{f.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-mc-mute">{f.body}</p>
                </Reveal>
              ))}
            </div>
          </section>

          <section id="platform" className="scroll-mt-24 border-t border-mc-line py-16">
            <Reveal>
              <Eyebrow>The future we’re growing</Eyebrow>
              <Display className="mt-4 text-4xl md:text-5xl">Mycerra™ is only the beginning.</Display>
              <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-mc-mute">
                Our research expands into foams, textiles, coatings and bio-composites — a material platform for
                the next generation of industries.
              </p>
            </Reveal>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {futurePlatform.map((f, i) => (
                <Reveal key={f.title} delay={i * 100} className="border-t border-mc-ink pt-5">
                  <h3 className="font-mc-serif text-2xl">{f.title}</h3>
                  <p className="mt-2 text-sm text-mc-mute">{f.body}</p>
                </Reveal>
              ))}
            </div>
            <PillButton to="/work-with-us?type=manufacturer#inquiry" className="mt-12">
              Discuss a development project
            </PillButton>
          </section>
        </div>
      </Container>
    </>
  );
};

export default Technology;

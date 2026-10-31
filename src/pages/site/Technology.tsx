import { useEffect, useState } from "react";
import processMycelium from "@/assets/mycerra/process-mycelium.webp";
import finishedCurl from "@/assets/mycerra/impact-curl.webp";
import processSurface from "@/assets/mycerra/process-surface.webp";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/site/Reveal";
import { TestReports } from "@/components/site/TestReports";
import { Container, Display, Eyebrow, PillButton } from "@/components/site/primitives";
import { features, futurePlatform, processSteps } from "@/content/mycerra";
import { useCopy, useLang } from "@/i18n/LanguageProvider";
const finishPure = "/media/materials/finish-pure.webp";

const chapterIds = ["structure", "cultivate", "stabilize", "finish", "performance", "test-reports", "platform"] as const;

const copy = {
  en: {
    chapters: ["Structure", "Cultivate", "Stabilize", "Finish", "Performance", "Test reports", "Platform"],
    eyebrow: "Technology",
    title: "Biotechnology, guided by design.",
    intro:
      "A pure mycelium mat grown through biotechnology and design — engineered for structural independence, process stability and eco-integrity.",
    structureTitle: "The mat is the material.",
    structureBody:
      "Most leather alternatives laminate a coating onto a textile or polymer backing. Mycerra™ uses no non-woven backings, scaffolds or foreign substrates: it is a self-supporting mat cultivated entirely from mycelium. That is what lets it be shaved, dyed and embossed like a hide — and composted at the end of its life.",
    structureAlt: "Pure Mycerra — unembossed, undyed mycelium mat",
    performanceTitle: "Redefining how performance materials are made.",
    reportsTitle: "Performance test reports.",
    reportsBody: "Twelve indicators covering physical strength, colour fastness and comfort, each linked to its original report.",
    platformEyebrow: "The future we’re growing",
    platformTitle: "Mycerra™ is only the beginning.",
    platformBody:
      "Our research expands into foams, textiles, coatings and bio-composites — a material platform for the next generation of industries.",
    platformCta: "Discuss a development project",
  },
  ko: {
    chapters: ["구조", "배양", "안정화", "마감", "성능", "시험 성적서", "플랫폼"],
    eyebrow: "기술",
    title: "디자인이 이끄는 바이오테크놀로지.",
    intro: "바이오테크놀로지와 디자인으로 키운 순수 균사 매트. 구조적 자립성, 공정 안정성, 친환경 무결성을 목표로 설계했습니다.",
    structureTitle: "매트 자체가 소재입니다.",
    structureBody:
      "대부분의 가죽 대체재는 섬유나 고분자 배접 위에 코팅을 적층합니다. Mycerra™는 부직포 배접, 지지체, 이물 기재 없이 오직 균사로만 배양한 자립형 매트입니다. 그래서 원피처럼 쉐이빙·염색·엠보가 가능하고, 수명이 다하면 퇴비화됩니다.",
    structureAlt: "순수 Mycerra — 무엠보, 무염색 균사 매트",
    performanceTitle: "고성능 소재를 만드는 방식을 다시 씁니다.",
    reportsTitle: "성능 시험 성적서.",
    reportsBody: "물리적 강도, 염색 견뢰도, 쾌적성을 아우르는 12개 지표를 원본 성적서와 함께 공개합니다.",
    platformEyebrow: "우리가 키우는 미래",
    platformTitle: "Mycerra™는 시작일 뿐입니다.",
    platformBody: "연구는 폼, 텍스타일, 코팅, 바이오 복합재로 확장되고 있습니다. 다음 세대 산업을 위한 소재 플랫폼입니다.",
    platformCta: "개발 프로젝트 문의",
  },
};

const stepImages: Record<string, string> = {
  cultivate: processMycelium,
  stabilize: processSurface,
  finish: finishedCurl,
};

// 스크롤 위치에 따라 왼쪽 목차의 현재 챕터를 표시
const useActiveChapter = () => {
  const [active, setActive] = useState<string>(chapterIds[0]);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    chapterIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return active;
};

const Technology = () => {
  const c = useCopy(copy);
  const { t } = useLang();
  const active = useActiveChapter();

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

      <Container className="relative grid gap-10 pb-24 md:grid-cols-12">
        <nav className="hidden md:col-span-2 md:block" aria-label="Chapters">
          <ol className="sticky top-28 space-y-2">
            {chapterIds.map((id, i) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={cn(
                    "text-[13px] transition-colors",
                    active === id ? "text-mc-ink" : "text-mc-mute/60 hover:text-mc-mute",
                  )}
                >
                  {c.chapters[i]}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="md:col-span-10">
          <section id="structure" className="scroll-mt-24 border-t border-mc-line py-16">
            <div className="grid gap-10 lg:grid-cols-2">
              <Reveal>
                <Eyebrow>{c.chapters[0]}</Eyebrow>
                <Display className="mt-4 text-4xl md:text-5xl">{c.structureTitle}</Display>
                <p className="mt-6 text-[15px] leading-relaxed text-mc-mute">{c.structureBody}</p>
              </Reveal>
              <Reveal delay={150}>
                <div className="aspect-[4/3] overflow-hidden bg-mc-cream">
                  <img src={finishPure} alt={c.structureAlt} className="h-full w-full object-cover" />
                </div>
              </Reveal>
            </div>
          </section>

          {processSteps.map((s) => (
            <section key={s.no} id={s.id} className="scroll-mt-24 border-t border-mc-line py-16">
              <div className="grid gap-10 lg:grid-cols-2">
                <Reveal className="lg:order-2">
                  <div className="aspect-[4/3] overflow-hidden bg-mc-cream">
                    <img src={stepImages[s.id]} alt={t(s.title)} loading="lazy" className="h-full w-full object-cover" />
                  </div>
                </Reveal>
                <Reveal delay={150}>
                  <p className="text-xs tracking-[0.2em] text-mc-mute">{s.no}</p>
                  <Display className="mt-3 text-4xl md:text-5xl">{t(s.title)}</Display>
                  <p className="mt-6 text-[15px] leading-relaxed text-mc-mute">{t(s.body)}</p>
                </Reveal>
              </div>
            </section>
          ))}

          <section id="performance" className="scroll-mt-24 border-t border-mc-line py-16">
            <Reveal>
              <Eyebrow>{c.chapters[4]}</Eyebrow>
              <Display className="mt-4 text-4xl md:text-5xl">{c.performanceTitle}</Display>
            </Reveal>
            <div className="mt-12 grid gap-px bg-mc-line sm:grid-cols-2">
              {features.map((f, i) => (
                <Reveal key={f.title.en} delay={i * 100} className="bg-mc-paper p-8">
                  <h3 className="font-mc-serif text-2xl">{t(f.title)}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-mc-mute">{t(f.body)}</p>
                </Reveal>
              ))}
            </div>
          </section>

          <section id="test-reports" className="scroll-mt-24 border-t border-mc-line py-16">
            <Reveal>
              <Eyebrow>{c.chapters[5]}</Eyebrow>
              <Display className="mt-4 text-4xl md:text-5xl">{c.reportsTitle}</Display>
              <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-mc-mute">{c.reportsBody}</p>
            </Reveal>
            <div className="mt-10">
              <TestReports />
            </div>
          </section>

          <section id="platform" className="scroll-mt-24 border-t border-mc-line py-16">
            <Reveal>
              <Eyebrow>{c.platformEyebrow}</Eyebrow>
              <Display className="mt-4 text-4xl md:text-5xl">{c.platformTitle}</Display>
              <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-mc-mute">{c.platformBody}</p>
            </Reveal>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {futurePlatform.map((f, i) => (
                <Reveal key={f.title.en} delay={i * 100} className="border-t border-mc-ink pt-5">
                  <h3 className="font-mc-serif text-2xl">{t(f.title)}</h3>
                  <p className="mt-2 text-sm text-mc-mute">{t(f.body)}</p>
                </Reveal>
              ))}
            </div>
            <PillButton to="/work-with-us?type=manufacturer#inquiry" className="mt-12">
              {c.platformCta}
            </PillButton>
          </section>
        </div>
      </Container>
    </>
  );
};

export default Technology;

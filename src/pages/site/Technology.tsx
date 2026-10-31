import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/site/Reveal";
import { TestReports } from "@/components/site/TestReports";
import { Container, Display, Eyebrow, PillButton } from "@/components/site/primitives";
import { features, futurePlatform, processSteps } from "@/content/mycerra";
import { pageSections, usePageCopy, useSectionsCopy } from "@/content/site";
import { useLang } from "@/i18n/LanguageProvider";

// 문구·사진·섹션 순서: src/content/data/site.json › pages.technology (운영 도구 "페이지" 탭)
// 왼쪽 목차는 표시 중인 섹션 순서를 그대로 따른다. "process" 섹션은 공정 3단계(배양·안정화·마감)로 펼쳐진다.

// 스크롤 위치에 따라 왼쪽 목차의 현재 챕터를 표시
const useActiveChapter = (ids: string[]) => {
  const [active, setActive] = useState(ids[0]);
  const key = ids.join(",");
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
    key.split(",").forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [key]);
  return active;
};

const Technology = () => {
  const c = usePageCopy("technology");
  const s = useSectionsCopy("technology");
  const { t } = useLang();
  const order = pageSections("technology").filter((id) => id !== "intro");
  const navLabels: Record<string, string> = {
    structure: s.structure.navLabel,
    performance: s.performance.navLabel,
    "test-reports": s["test-reports"].navLabel,
    platform: s.platform.navLabel,
  };

  // 목차: 섹션 순서대로, 공정 섹션은 단계별로
  const chapters = order.flatMap((id) =>
    id === "process"
      ? processSteps.map((step) => ({ id: step.id, label: t(step.title) }))
      : navLabels[id]
        ? [{ id, label: navLabels[id] }]
        : [],
  );
  const active = useActiveChapter(chapters.map((ch) => ch.id));

  const sections: Record<string, ReactNode> = {
    structure: (
      <section id="structure" className="scroll-mt-24 border-t border-mc-line py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <Reveal>
            <Eyebrow>{navLabels.structure}</Eyebrow>
            <Display className="mt-4 text-4xl md:text-5xl">{c.structureTitle}</Display>
            <p className="mt-6 text-[15px] leading-relaxed text-mc-mute">{c.structureBody}</p>
          </Reveal>
          <Reveal delay={150}>
            <div className="aspect-[4/3] overflow-hidden bg-mc-cream">
              <img src={c.structureImage} alt={c.structureAlt} className="h-full w-full object-cover" />
            </div>
          </Reveal>
        </div>
      </section>
    ),

    process: (
      <>
        {processSteps.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-24 border-t border-mc-line py-16">
            <div className="grid gap-10 lg:grid-cols-2">
              <Reveal className="lg:order-2">
                <div className="aspect-[4/3] overflow-hidden bg-mc-cream">
                  <img src={s.image} alt={t(s.title)} loading="lazy" className="h-full w-full object-cover" />
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
      </>
    ),

    performance: (
      <section id="performance" className="scroll-mt-24 border-t border-mc-line py-16">
        <Reveal>
          <Eyebrow>{navLabels.performance}</Eyebrow>
          <Display className="mt-4 text-4xl md:text-5xl">{c.performanceTitle}</Display>
        </Reveal>
        <div className="mt-12 grid gap-px bg-mc-line sm:grid-cols-2">
          {features.map((f, i) => (
            <Reveal key={i} delay={i * 100} className="bg-mc-paper p-8">
              <h3 className="font-mc-serif text-2xl">{t(f.title)}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-mc-mute">{t(f.body)}</p>
            </Reveal>
          ))}
        </div>
      </section>
    ),

    "test-reports": (
      <section id="test-reports" className="scroll-mt-24 border-t border-mc-line py-16">
        <Reveal>
          <Eyebrow>{navLabels["test-reports"]}</Eyebrow>
          <Display className="mt-4 text-4xl md:text-5xl">{c.reportsTitle}</Display>
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-mc-mute">{c.reportsBody}</p>
        </Reveal>
        <div className="mt-10">
          <TestReports />
        </div>
      </section>
    ),

    platform: (
      <section id="platform" className="scroll-mt-24 border-t border-mc-line py-16">
        <Reveal>
          <Eyebrow>{c.platformEyebrow}</Eyebrow>
          <Display className="mt-4 text-4xl md:text-5xl">{c.platformTitle}</Display>
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-mc-mute">{c.platformBody}</p>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {futurePlatform.map((f, i) => (
            <Reveal key={i} delay={i * 100} className="border-t border-mc-ink pt-5">
              <h3 className="font-mc-serif text-2xl">{t(f.title)}</h3>
              <p className="mt-2 text-sm text-mc-mute">{t(f.body)}</p>
            </Reveal>
          ))}
        </div>
        <PillButton to="/work-with-us?type=manufacturer#inquiry" className="mt-12">
          {c.platformCta}
        </PillButton>
      </section>
    ),
  };

  return (
    <>
      {pageSections("technology").includes("intro") && (
        <section id="sec-intro" data-section="intro" className="pb-20 pt-36 md:pt-44">
          <Container>
            <Eyebrow>{c.eyebrow}</Eyebrow>
            <Display as="h1" className="mt-5 max-w-5xl text-[clamp(2.75rem,7vw,6.5rem)]">
              {c.title}
            </Display>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-mc-mute">{c.intro}</p>
          </Container>
        </section>
      )}

      <Container className={cn("relative grid gap-10 pb-24 md:grid-cols-12", !pageSections("technology").includes("intro") && "pt-28")}>
        <nav className="hidden md:col-span-2 md:block" aria-label="Chapters">
          <ol className="sticky top-28 space-y-2">
            {chapters.map((ch) => (
              <li key={ch.id}>
                <a
                  href={`#${ch.id}`}
                  className={cn(
                    "text-[13px] transition-colors",
                    active === ch.id ? "text-mc-ink" : "text-mc-mute/60 hover:text-mc-mute",
                  )}
                >
                  {ch.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="md:col-span-10">
          {order.map((id) => (
            <div key={id} id={`sec-${id}`} data-section={id}>
              {sections[id]}
            </div>
          ))}
        </div>
      </Container>
    </>
  );
};

export default Technology;

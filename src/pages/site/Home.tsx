import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/site/Reveal";
import { Container, Display, Eyebrow, PillButton, ProofBadge, TextLink } from "@/components/site/primitives";
import { claims, collections, expressions, familyLabel, futurePlatform, news, processSteps } from "@/content/mycerra";
import { categories } from "@/content/shop";
import { usePageCopy } from "@/content/site";
import { Sections } from "@/components/site/Sections";
import { useLang } from "@/i18n/LanguageProvider";

// 문구·사진·섹션 순서: src/content/data/site.json › pages.home (운영 도구 "페이지" 탭)
const Home = () => {
  const c = usePageCopy("home");
  const { t } = useLang();

  const sections: Record<string, ReactNode> = {
    // 전면 첫 화면 — 소재 사진 한 장과 한 줄
    hero: (
      <section className="relative h-[100svh] min-h-[560px] overflow-hidden bg-mc-burgundy text-white">
        <img src={c.image} alt={c.heroAlt} className="absolute inset-0 h-full w-full scale-105 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/55" />
        <Container className="relative flex h-full flex-col justify-end pb-14 md:pb-20">
          <Eyebrow className="mb-5 text-white/70">{c.heroEyebrow}</Eyebrow>
          <Display as="h1" className="max-w-4xl text-[clamp(3rem,8vw,7.5rem)]">
            {c.heroTitle.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </Display>
          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <p className="max-w-md text-base text-white/85 md:text-lg">{c.heroBody}</p>
            <div className="flex flex-wrap gap-3">
              <PillButton to="/mycerra" variant="light">
                {c.heroCta}
              </PillButton>
              <PillButton to="/shop" variant="outline" className="border-white/40 text-white hover:border-white hover:bg-white/10">
                {c.heroCta2}
              </PillButton>
            </div>
          </div>
        </Container>
      </section>
    ),

    // 핵심 문장 — 섹션 하나에 문장 하나
    statement: (
      <section className="py-28 md:py-44">
        <Container>
          <Reveal>
            <Display className="mx-auto max-w-5xl text-center text-[clamp(2rem,4.4vw,4rem)]">{c.statement}</Display>
          </Reveal>
        </Container>
      </section>
    ),

    // What / Why / How
    pillars: (
      <section className="border-t border-mc-line">
        <Container className="grid gap-12 py-20 md:grid-cols-3 md:gap-10">
          {c.pillars.map((col, i) => (
            <Reveal key={i} delay={i * 120}>
              <Eyebrow>{col.k}</Eyebrow>
              <h3 className="mt-5 font-mc-serif text-3xl leading-tight">{col.t}</h3>
              <p className="mt-4 text-[15px] leading-relaxed text-mc-mute">{col.b}</p>
              <TextLink to={col.to} className="mt-6">
                {col.cta}
              </TextLink>
            </Reveal>
          ))}
        </Container>
      </section>
    ),

    // 하나의 매트, 여러 표현
    library: (
      <section className="bg-mc-cream py-24 md:py-32">
        <Container>
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <Reveal>
              <Eyebrow>{c.libraryEyebrow}</Eyebrow>
              <Display className="mt-4 max-w-2xl text-[clamp(2.25rem,5vw,4.5rem)]">{c.libraryTitle}</Display>
            </Reveal>
            <Reveal delay={150}>
              <p className="max-w-sm text-[15px] leading-relaxed text-mc-mute">{c.libraryBody}</p>
              <p className="mt-5 font-mc-sans text-[11px] uppercase tracking-[0.18em] text-mc-mute/80">
                {expressions.length} {t({ en: "expressions", ko: "가지 표현" })} · 4 {t({ en: "conditions", ko: "가공 조건" })} · 3{" "}
                {t({ en: "sheet sizes", ko: "원단 크기" })}
              </p>
            </Reveal>
          </div>
        </Container>
        <div className="mt-14 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-4 md:scroll-px-10 md:px-10 [scrollbar-width:thin]">
          {expressions.map((e) => (
            <Link
              key={e.code}
              to={`/mycerra?code=${e.code}`}
              className="group relative w-[68vw] shrink-0 snap-start sm:w-[44vw] md:w-[26vw] lg:w-[20vw]"
            >
              <div className="aspect-[4/5] overflow-hidden bg-mc-line">
                <img
                  src={e.image}
                  alt={`${e.name} ${e.code} — ${t(e.description)}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <p className="font-mc-serif text-lg">{e.name}</p>
                <p className="text-[11px] tracking-[0.16em] text-mc-mute">{e.code}</p>
              </div>
              <p className="text-xs text-mc-mute">{t(familyLabel[e.family])}</p>
            </Link>
          ))}
        </div>
        <Container className="mt-10">
          <TextLink to="/mycerra">{c.libraryCta}</TextLink>
        </Container>
      </section>
    ),

    // 공정 3단계
    process: (
      <section className="py-24 md:py-32">
        <Container>
          <Reveal>
            <Eyebrow>{c.processEyebrow}</Eyebrow>
            <Display className="mt-4 max-w-3xl text-[clamp(2.25rem,5vw,4.5rem)]">{c.processTitle}</Display>
          </Reveal>
          <div className="mt-16 grid gap-10 md:grid-cols-3">
            {processSteps.map((s, i) => (
              <Reveal key={s.id} delay={i * 120}>
                <span
                  aria-hidden
                  className="mb-4 block select-none font-mc-serif text-6xl leading-none text-mc-ink/[0.14] [font-variant-numeric:lining-nums]"
                >
                  {s.no}
                </span>
                <div className="aspect-[4/3] overflow-hidden bg-mc-line">
                  <img src={s.image} alt={t(s.title)} loading="lazy" className="h-full w-full object-cover" />
                </div>
                <h3 className="mt-5 font-mc-serif text-3xl">{t(s.title)}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-mc-mute">{t(s.body)}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
    ),

    // 임팩트 수치
    impact: (
      <section className="bg-mc-ink py-24 text-mc-paper md:py-32">
        <Container>
          <Reveal>
            <Eyebrow className="text-mc-paper/50">{c.impactEyebrow}</Eyebrow>
            <Display className="mt-4 max-w-3xl text-[clamp(2.25rem,5vw,4.5rem)]">{c.impactTitle}</Display>
          </Reveal>
          <div
            className={cn(
              "mt-16 grid gap-px overflow-hidden bg-mc-paper/10 sm:grid-cols-2",
              claims.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4",
            )}
          >
            {claims.map((cl, i) => (
              <Reveal
                key={i}
                delay={i * 100}
                // 홀수 개일 때 첫 항목을 넓혀 빈칸이 생기지 않게
                className={cn("bg-mc-ink p-8", claims.length % 2 === 1 && i === 0 && "sm:col-span-2 lg:col-span-1")}
              >
                <p className="font-mc-serif text-6xl font-light">{cl.value}</p>
                <p className="mt-2 text-sm uppercase tracking-[0.18em] text-mc-paper/70">{t(cl.label)}</p>
                <p className="mt-4 text-sm leading-relaxed text-mc-paper/60">{t(cl.detail)}</p>
                {cl.proof.status === "published" && (
                  <div className="mt-5">
                    <ProofBadge status="published" light />
                  </div>
                )}
              </Reveal>
            ))}
          </div>
          <div className="mt-10">
            <TextLink to="/impact" light>
              {c.impactCta}
            </TextLink>
          </div>
        </Container>
      </section>
    ),

    // 쇼핑몰 진입 — 4개 카테고리
    shop: (
      <section className="py-24 md:py-32">
        <Container>
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <Reveal>
              <Eyebrow>{c.shopEyebrow}</Eyebrow>
              <Display className="mt-4 text-[clamp(2.25rem,5vw,4.5rem)]">{c.shopTitle}</Display>
            </Reveal>
            <Reveal delay={150}>
              <p className="max-w-sm text-[15px] leading-relaxed text-mc-mute">{c.shopBody}</p>
            </Reveal>
          </div>
          <div className="mt-14 grid gap-px bg-mc-line sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((cat, i) => (
              <Reveal key={cat.id} delay={i * 100} className="bg-mc-paper">
                <Link to={`/shop?cat=${cat.id}`} className="group block h-full p-8 transition-colors hover:bg-mc-cream">
                  <p className="text-xs tracking-[0.2em] text-mc-mute">0{i + 1}</p>
                  <h3 className="mt-3 font-mc-serif text-2xl">{t(cat.title)}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-mc-mute">{t(cat.summary)}</p>
                </Link>
              </Reveal>
            ))}
          </div>
          <div className="mt-10">
            <TextLink to="/shop">{c.shopCta}</TextLink>
          </div>
        </Container>
      </section>
    ),

    // 컬렉션
    collections: (
      <section className="border-t border-mc-line py-24 md:py-32">
        <Container>
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <Reveal>
              <Eyebrow>{c.collectionsEyebrow}</Eyebrow>
              <Display className="mt-4 text-[clamp(2.25rem,5vw,4.5rem)]">{c.collectionsTitle}</Display>
            </Reveal>
            <Reveal delay={150}>
              <p className="max-w-sm text-[15px] leading-relaxed text-mc-mute">{c.collectionsBody}</p>
            </Reveal>
          </div>
          <div className="mt-14 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {collections.map((col, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="aspect-square overflow-hidden bg-mc-cream">
                  <img src={col.image} alt={col.title} loading="lazy" className="h-full w-full object-cover" />
                </div>
                <h3 className="mt-4 font-mc-serif text-xl">{col.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mc-mute">{t(col.body)}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
    ),

    // 대상별 진입점
    audiences: (
      <section className="grid md:grid-cols-2">
        {c.audiences.map((p, i) => (
          <div key={i} className={`${p.dark ? "bg-mc-mocha text-mc-paper" : "bg-mc-cream"} px-5 py-20 md:px-14 md:py-28`}>
            <Reveal>
              <Eyebrow className={p.dark ? "text-mc-paper/60" : undefined}>{p.k}</Eyebrow>
              <h3 className="mt-5 max-w-md font-mc-serif text-4xl font-light leading-tight md:text-5xl">{p.t}</h3>
              <p className={`mt-5 max-w-md text-[15px] leading-relaxed ${p.dark ? "text-mc-paper/75" : "text-mc-mute"}`}>{p.b}</p>
              <PillButton to={p.to} variant={p.dark ? "light" : "dark"} className="mt-8">
                {p.cta}
              </PillButton>
            </Reveal>
          </div>
        ))}
      </section>
    ),

    // 회사 · 소식 · 향후 플랫폼
    company: (
      <section className="py-24 md:py-32">
        <Container className="grid gap-16 md:grid-cols-12">
          <Reveal className="md:col-span-5">
            <Eyebrow>SAVE EARTH Inc.</Eyebrow>
            <Display className="mt-4 text-[clamp(2rem,4vw,3.5rem)]">{c.companyTitle}</Display>
            <p className="mt-6 text-[15px] leading-relaxed text-mc-mute">{c.companyBody}</p>
            <ul className="mt-6 divide-y divide-mc-line border-y border-mc-line">
              {futurePlatform.map((f, i) => (
                <li key={i} className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-6">
                  <span className="font-mc-serif text-lg sm:w-56 sm:shrink-0">{t(f.title)}</span>
                  <span className="text-sm text-mc-mute">{t(f.body)}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal className="md:col-span-6 md:col-start-7" delay={150}>
            <Eyebrow>{c.newsEyebrow}</Eyebrow>
            <ul className="mt-6 divide-y divide-mc-line border-y border-mc-line">
              {news.map((n) => (
                <li key={n.id} className="grid grid-cols-[96px_1fr] gap-4 py-5">
                  <span className="pt-1 text-[11px] uppercase tracking-[0.16em] text-mc-mute">{t(n.tag)}</span>
                  <span>
                    <span className="block font-mc-serif text-xl">{t(n.title)}</span>
                    <span className="text-sm text-mc-mute">{t(n.meta)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </Container>
      </section>
    ),
  };

  return (
    <>
      <Sections page="home" sections={sections} />
    </>
  );
};

export default Home;

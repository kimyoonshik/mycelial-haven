import { Link } from "react-router-dom";
import heroImage from "@/assets/mycerra/color-burgundy-05.webp";
import processMycelium from "@/assets/mycerra/process-mycelium.webp";
import processSurface from "@/assets/mycerra/process-surface.webp";
import finishedCurl from "@/assets/mycerra/impact-curl.webp";
import { Reveal } from "@/components/site/Reveal";
import { Container, Display, Eyebrow, PillButton, TextLink } from "@/components/site/primitives";
import { claims, collections, expressions, familyLabel, futurePlatform, news, processSteps } from "@/content/mycerra";
import { categories } from "@/content/shop";
import { useCopy, useLang } from "@/i18n/LanguageProvider";

const processImages = [processMycelium, processSurface, finishedCurl];

const copy = {
  en: {
    heroTitle: ["Grown,", "not manufactured."],
    heroBody: "Mycerra™ is the leather alternative made exclusively from pure mycelium — no backing, no scaffold, no plastic.",
    heroCta: "Explore the material",
    heroAlt: "Burgundy Mycerra pure mycelium mat, dyed three times, curling to show its grain",
    statement:
      "A 100% pure mycelium mat that is finished to the same standard as premium leather — and returns to the earth at the end of its life.",
    pillars: [
      {
        k: "What we make",
        t: "A material, not a laminate.",
        b: "Mycerra™ uses no non-woven backings, scaffolds or foreign substrates. The mat is the material — cultivated, stabilized and finished.",
        to: "/mycerra",
        cta: "Material library",
      },
      {
        k: "Why it matters",
        t: "Sustainability with proof, not promise.",
        b: "−92% greenhouse-gas emissions versus animal leather, no animal inputs, and every batch origin-tracked for EUDR compliance.",
        to: "/impact",
        cta: "Impact & evidence",
      },
      {
        k: "How we do it",
        t: "Biotechnology and design.",
        b: "Uniform growth under ambient conditions, then a proprietary stabilization step that gives the mat leather-grade strength and handfeel.",
        to: "/technology",
        cta: "Technology",
      },
    ],
    libraryEyebrow: "Material library",
    libraryTitle: "One mat, many expressions.",
    libraryBody:
      "The same cultivated mat takes aniline dyeing, crocodile and caviar embossing, or stays as a raw natural surface.",
    libraryCta: "See all expressions",
    processEyebrow: "From cultivation to finish",
    processTitle: "Three steps. One material.",
    impactEyebrow: "Impact",
    impactTitle: "Less water. Less waste. More balance.",
    impactCta: "How we measure it",
    shopEyebrow: "Mycerra™ shop",
    shopTitle: "Order the material.",
    shopBody: "From the pure mat to fully finished leather — order swatches or full sheets online.",
    shopCta: "Visit the shop",
    collectionsEyebrow: "Made with Mycerra™",
    collectionsTitle: "Collections",
    collectionsBody: "Handbags and small leather goods handcrafted from pure mycelium mat.",
    audiences: [
      {
        k: "For brands",
        t: "Design with a material that grows.",
        b: "Swatch kits, full sheets and custom colour or finish development for fashion, accessories and interiors.",
        to: "/work-with-us?type=brand#inquiry",
        cta: "Request swatches",
        dark: false,
      },
      {
        k: "For tanneries & manufacturers",
        t: "Process it like premium hides.",
        b: "Mycerra™ is shavable and takes aniline dyeing and embossing on existing finishing lines. Let’s run trials together.",
        to: "/work-with-us?type=manufacturer#inquiry",
        cta: "Start a processing trial",
        dark: true,
      },
    ],
    companyTitle: "Materials that are cultivated, not extracted.",
    companyBody: "Mycerra™ is the first expression of a material platform. Our research extends into new mycelium materials:",
    newsEyebrow: "News & media",
  },
  ko: {
    heroTitle: ["제조하지 않고,", "키웁니다."],
    heroBody: "Mycerra™는 오직 순수 균사로만 만든 가죽 대체 소재입니다. 배접도, 지지체도, 플라스틱도 없습니다.",
    heroCta: "소재 살펴보기",
    heroAlt: "3회 염색한 버건디 Mycerra 순수 균사 매트가 말려 올라가 결이 드러난 모습",
    statement: "프리미엄 가죽과 같은 기준으로 마감되고, 수명이 다하면 흙으로 돌아가는 100% 순수 균사 매트.",
    pillars: [
      {
        k: "무엇을 만드는가",
        t: "적층물이 아닌, 하나의 소재.",
        b: "Mycerra™는 부직포 배접, 지지체, 이물 기재를 쓰지 않습니다. 매트 자체가 소재이며, 배양·안정화·마감을 거칩니다.",
        to: "/mycerra",
        cta: "소재 라이브러리",
      },
      {
        k: "왜 중요한가",
        t: "약속이 아닌 증거로 말하는 지속가능성.",
        b: "동물 가죽 대비 온실가스 −92%, 동물성 원료 무투입, 모든 배치의 원산지를 추적해 EUDR에 대응합니다.",
        to: "/impact",
        cta: "임팩트와 근거",
      },
      {
        k: "어떻게 만드는가",
        t: "바이오테크놀로지와 디자인.",
        b: "상온에서 균일하게 생장시킨 뒤, 독자적인 안정화 공정으로 가죽 수준의 강도와 핸드필을 부여합니다.",
        to: "/technology",
        cta: "기술",
      },
    ],
    libraryEyebrow: "소재 라이브러리",
    libraryTitle: "하나의 매트, 여러 표현.",
    libraryBody: "같은 배양 매트가 아닐린 염색, 크로커다일·캐비어 엠보를 입거나, 무가공 내추럴 표면 그대로 쓰입니다.",
    libraryCta: "전체 표현 보기",
    processEyebrow: "배양에서 마감까지",
    processTitle: "세 단계, 하나의 소재.",
    impactEyebrow: "임팩트",
    impactTitle: "물은 적게, 폐기물은 적게, 균형은 더.",
    impactCta: "측정 방식 보기",
    shopEyebrow: "Mycerra™ 쇼핑몰",
    shopTitle: "원단을 주문하세요.",
    shopBody: "순수원단부터 최종 피니시 원단까지, 스와치와 풀시트를 온라인으로 주문할 수 있습니다.",
    shopCta: "쇼핑몰 가기",
    collectionsEyebrow: "Made with Mycerra™",
    collectionsTitle: "컬렉션",
    collectionsBody: "순수 균사 매트로 수작업 제작한 핸드백과 소형 가죽 제품.",
    audiences: [
      {
        k: "브랜드",
        t: "자라나는 소재로 디자인하세요.",
        b: "패션, 액세서리, 인테리어를 위한 스와치 키트, 풀시트, 맞춤 컬러·마감 개발을 제공합니다.",
        to: "/work-with-us?type=brand#inquiry",
        cta: "스와치 요청",
        dark: false,
      },
      {
        k: "제혁·제조사",
        t: "프리미엄 원피처럼 가공하세요.",
        b: "Mycerra™는 쉐이빙이 가능하고 기존 마감 라인에서 아닐린 염색과 엠보를 할 수 있습니다. 함께 테스트해 보시죠.",
        to: "/work-with-us?type=manufacturer#inquiry",
        cta: "가공 테스트 신청",
        dark: true,
      },
    ],
    companyTitle: "채굴하지 않고, 배양하는 소재.",
    companyBody: "Mycerra™는 소재 플랫폼의 첫 번째 결과물입니다. 연구는 새로운 균사 소재로 확장되고 있습니다.",
    newsEyebrow: "소식·미디어",
  },
};

const Home = () => {
  const c = useCopy(copy);
  const { t } = useLang();

  return (
    <>
      {/* 1. 전면 첫 화면 — 소재 사진 한 장과 한 줄 */}
      <section className="relative h-[100svh] min-h-[560px] overflow-hidden bg-mc-burgundy text-white">
        <img src={heroImage} alt={c.heroAlt} className="absolute inset-0 h-full w-full scale-105 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/50" />
        <Container className="relative flex h-full flex-col justify-end pb-14 md:pb-20">
          <Display as="h1" className="max-w-4xl text-[clamp(3rem,8vw,7.5rem)]">
            {c.heroTitle[0]}
            <br />
            {c.heroTitle[1]}
          </Display>
          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <p className="max-w-md text-base text-white/85 md:text-lg">{c.heroBody}</p>
            <PillButton to="/mycerra" variant="light" className="self-start md:self-auto">
              {c.heroCta}
            </PillButton>
          </div>
        </Container>
      </section>

      {/* 2. 핵심 문장 — 섹션 하나에 문장 하나 */}
      <section className="py-28 md:py-44">
        <Container>
          <Reveal>
            <Display className="mx-auto max-w-5xl text-center text-[clamp(2rem,4.4vw,4rem)]">{c.statement}</Display>
          </Reveal>
        </Container>
      </section>

      {/* 3. What / Why / How */}
      <section className="border-t border-mc-line">
        <Container className="grid gap-12 py-20 md:grid-cols-3 md:gap-10">
          {c.pillars.map((col, i) => (
            <Reveal key={col.to} delay={i * 120}>
              <Eyebrow>{col.k}</Eyebrow>
              <h3 className="mt-5 font-mc-serif text-3xl font-light leading-tight">{col.t}</h3>
              <p className="mt-4 text-[15px] leading-relaxed text-mc-mute">{col.b}</p>
              <TextLink to={col.to} className="mt-6">
                {col.cta}
              </TextLink>
            </Reveal>
          ))}
        </Container>
      </section>

      {/* 4. 하나의 매트, 여러 표현 */}
      <section className="bg-mc-cream py-24 md:py-32">
        <Container>
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <Reveal>
              <Eyebrow>{c.libraryEyebrow}</Eyebrow>
              <Display className="mt-4 max-w-2xl text-[clamp(2.25rem,5vw,4.5rem)]">{c.libraryTitle}</Display>
            </Reveal>
            <Reveal delay={150}>
              <p className="max-w-sm text-[15px] leading-relaxed text-mc-mute">{c.libraryBody}</p>
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

      {/* 5. 공정 3단계 */}
      <section className="py-24 md:py-32">
        <Container>
          <Reveal>
            <Eyebrow>{c.processEyebrow}</Eyebrow>
            <Display className="mt-4 max-w-3xl text-[clamp(2.25rem,5vw,4.5rem)]">{c.processTitle}</Display>
          </Reveal>
          <div className="mt-16 grid gap-10 md:grid-cols-3">
            {processSteps.map((s, i) => (
              <Reveal key={s.no} delay={i * 120}>
                <div className="aspect-[4/3] overflow-hidden bg-mc-line">
                  <img src={processImages[i]} alt={t(s.title)} loading="lazy" className="h-full w-full object-cover" />
                </div>
                <p className="mt-6 text-xs tracking-[0.2em] text-mc-mute">{s.no}</p>
                <h3 className="mt-2 font-mc-serif text-3xl font-light">{t(s.title)}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-mc-mute">{t(s.body)}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* 6. 임팩트 수치 */}
      <section className="bg-mc-ink py-24 text-mc-paper md:py-32">
        <Container>
          <Reveal>
            <Eyebrow className="text-mc-paper/50">{c.impactEyebrow}</Eyebrow>
            <Display className="mt-4 max-w-3xl text-[clamp(2.25rem,5vw,4.5rem)]">{c.impactTitle}</Display>
          </Reveal>
          <div className="mt-16 grid gap-px overflow-hidden bg-mc-paper/10 sm:grid-cols-2 lg:grid-cols-4">
            {claims.map((cl, i) => (
              <Reveal key={cl.value} delay={i * 100} className="bg-mc-ink p-8">
                <p className="font-mc-serif text-6xl font-light">{cl.value}</p>
                <p className="mt-2 text-sm uppercase tracking-[0.18em] text-mc-paper/70">{t(cl.label)}</p>
                <p className="mt-4 text-sm leading-relaxed text-mc-paper/60">{t(cl.detail)}</p>
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

      {/* 7. 쇼핑몰 진입 — 4개 카테고리 */}
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

      {/* 8. 컬렉션 */}
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
              <Reveal key={col.title} delay={i * 100}>
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

      {/* 9. 대상별 진입점 */}
      <section className="grid md:grid-cols-2">
        {c.audiences.map((p) => (
          <div key={p.to} className={`${p.dark ? "bg-mc-mocha text-mc-paper" : "bg-mc-cream"} px-5 py-20 md:px-14 md:py-28`}>
            <Reveal>
              <Eyebrow className={p.dark ? "text-mc-paper/60" : undefined}>{p.k}</Eyebrow>
              <h3 className="mt-5 max-w-md font-mc-serif text-4xl font-light leading-tight md:text-5xl">{p.t}</h3>
              <p className={`mt-5 max-w-md text-[15px] leading-relaxed ${p.dark ? "text-mc-paper/75" : "text-mc-mute"}`}>
                {p.b}
              </p>
              <PillButton to={p.to} variant={p.dark ? "light" : "dark"} className="mt-8">
                {p.cta}
              </PillButton>
            </Reveal>
          </div>
        ))}
      </section>

      {/* 10. 회사 · 소식 · 향후 플랫폼 */}
      <section className="py-24 md:py-32">
        <Container className="grid gap-16 md:grid-cols-12">
          <Reveal className="md:col-span-5">
            <Eyebrow>SAVE EARTH Inc.</Eyebrow>
            <Display className="mt-4 text-[clamp(2rem,4vw,3.5rem)]">{c.companyTitle}</Display>
            <p className="mt-6 text-[15px] leading-relaxed text-mc-mute">{c.companyBody}</p>
            <ul className="mt-6 divide-y divide-mc-line border-y border-mc-line">
              {futurePlatform.map((f) => (
                <li key={f.title.en} className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-6">
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
                <li key={n.title.en} className="grid grid-cols-[96px_1fr] gap-4 py-5">
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
    </>
  );
};

export default Home;

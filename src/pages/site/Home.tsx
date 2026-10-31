import { Link } from "react-router-dom";
import heroImage from "@/assets/mycerra/color-burgundy-05.webp";
import processMycelium from "@/assets/mycerra/process-mycelium.webp";
import finishedCurl from "@/assets/mycerra/impact-curl.webp";
import processSurface from "@/assets/mycerra/process-surface.webp";
import { Reveal } from "@/components/site/Reveal";
import { Container, Display, Eyebrow, PillButton, TextLink } from "@/components/site/primitives";
import { claims, collections, expressions, futurePlatform, news, processSteps } from "@/content/mycerra";

const processImages = [processMycelium, processSurface, finishedCurl];

const Home = () => (
  <>
    {/* 1. 전면 첫 화면 — 소재 사진 한 장과 한 줄 */}
    <section className="relative h-[100svh] min-h-[560px] overflow-hidden bg-mc-burgundy text-white">
      <img
        src={heroImage}
        alt="Burgundy Mycerra pure mycelium mat, dyed three times, curling to show its grain"
        className="absolute inset-0 h-full w-full scale-105 object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/50" />
      <Container className="relative flex h-full flex-col justify-end pb-14 md:pb-20">
        <Display as="h1" className="max-w-4xl text-[clamp(3rem,8vw,7.5rem)]">
          Grown,
          <br />
          not manufactured.
        </Display>
        <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <p className="max-w-md font-mc-sans text-base text-white/85 md:text-lg">
            Mycerra™ is the leather alternative made exclusively from pure mycelium — no backing, no
            scaffold, no plastic.
          </p>
          <div className="flex gap-3">
            <PillButton to="/mycerra" variant="light">
              Explore the material
            </PillButton>
          </div>
        </div>
      </Container>
    </section>

    {/* 2. 핵심 문장 — 섹션 하나에 문장 하나 */}
    <section className="py-28 md:py-44">
      <Container>
        <Reveal>
          <Display className="mx-auto max-w-5xl text-center text-[clamp(2rem,4.4vw,4rem)]">
            A 100% pure mycelium mat that is finished to the same standard as premium leather — and returns
            to the earth at the end of its life.
          </Display>
        </Reveal>
      </Container>
    </section>

    {/* 3. What / Why / How */}
    <section className="border-t border-mc-line">
      <Container className="grid gap-12 py-20 md:grid-cols-3 md:gap-10">
        {[
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
        ].map((col, i) => (
          <Reveal key={col.k} delay={i * 120}>
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
            <Eyebrow>Material library</Eyebrow>
            <Display className="mt-4 max-w-2xl text-[clamp(2.25rem,5vw,4.5rem)]">One mat, many expressions.</Display>
          </Reveal>
          <Reveal delay={150}>
            <p className="max-w-sm text-[15px] leading-relaxed text-mc-mute">
              The same cultivated mat takes aniline dyeing, crocodile and caviar embossing, or stays as a raw
              natural surface.
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
                alt={`${e.name} ${e.code} — ${e.description}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <p className="font-mc-serif text-lg">{e.name}</p>
              <p className="font-mc-sans text-[11px] tracking-[0.16em] text-mc-mute">{e.code}</p>
            </div>
            <p className="font-mc-sans text-xs text-mc-mute">{e.family}</p>
          </Link>
        ))}
      </div>
      <Container className="mt-10">
        <TextLink to="/mycerra">See all expressions</TextLink>
      </Container>
    </section>

    {/* 5. 공정 3단계 */}
    <section className="py-24 md:py-32">
      <Container>
        <Reveal>
          <Eyebrow>From cultivation to finish</Eyebrow>
          <Display className="mt-4 max-w-3xl text-[clamp(2.25rem,5vw,4.5rem)]">Three steps. One material.</Display>
        </Reveal>
        <div className="mt-16 grid gap-10 md:grid-cols-3">
          {processSteps.map((s, i) => (
            <Reveal key={s.no} delay={i * 120}>
              <div className="aspect-[4/3] overflow-hidden bg-mc-line">
                <img src={processImages[i]} alt={s.title} loading="lazy" className="h-full w-full object-cover" />
              </div>
              <p className="mt-6 font-mc-sans text-xs tracking-[0.2em] text-mc-mute">{s.no}</p>
              <h3 className="mt-2 font-mc-serif text-3xl font-light">{s.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-mc-mute">{s.body}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>

    {/* 6. 임팩트 수치 — 주장마다 근거 문서 상태 표시 */}
    <section className="bg-mc-ink py-24 text-mc-paper md:py-32">
      <Container>
        <Reveal>
          <Eyebrow className="text-mc-paper/50">Impact</Eyebrow>
          <Display className="mt-4 max-w-3xl text-[clamp(2.25rem,5vw,4.5rem)]">
            Less water. Less waste. More balance.
          </Display>
        </Reveal>
        <div className="mt-16 grid gap-px overflow-hidden bg-mc-paper/10 sm:grid-cols-2 lg:grid-cols-4">
          {claims.map((c, i) => (
            <Reveal key={c.label} delay={i * 100} className="bg-mc-ink p-8">
              <p className="font-mc-serif text-6xl font-light">{c.value}</p>
              <p className="mt-2 font-mc-sans text-sm uppercase tracking-[0.18em] text-mc-paper/70">{c.label}</p>
              <p className="mt-4 text-sm leading-relaxed text-mc-paper/60">{c.detail}</p>
            </Reveal>
          ))}
        </div>
        <div className="mt-10">
          <TextLink to="/impact" light>
            How we measure it
          </TextLink>
        </div>
      </Container>
    </section>

    {/* 7. 컬렉션 */}
    <section className="py-24 md:py-32">
      <Container>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <Reveal>
            <Eyebrow>Made with Mycerra™</Eyebrow>
            <Display className="mt-4 text-[clamp(2.25rem,5vw,4.5rem)]">Collections</Display>
          </Reveal>
          <Reveal delay={150}>
            <p className="max-w-sm text-[15px] leading-relaxed text-mc-mute">
              Handbags and small leather goods handcrafted from pure mycelium mat.
            </p>
          </Reveal>
        </div>
        <div className="mt-14 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {collections.map((c, i) => (
            <Reveal key={c.title} delay={i * 100}>
              <div className="aspect-square overflow-hidden bg-mc-cream">
                <img src={c.image} alt={c.title} loading="lazy" className="h-full w-full object-cover" />
              </div>
              <h3 className="mt-4 font-mc-serif text-xl">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mc-mute">{c.body}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>

    {/* 8. 대상별 진입점 */}
    <section className="grid md:grid-cols-2">
      {[
        {
          k: "For brands",
          t: "Design with a material that grows.",
          b: "Swatch kits, full sheets and custom colour or finish development for fashion, accessories and interiors.",
          to: "/work-with-us?type=brand#inquiry",
          cta: "Request swatches",
          cls: "bg-mc-cream",
        },
        {
          k: "For tanneries & manufacturers",
          t: "Process it like premium hides.",
          b: "Mycerra™ is shavable and takes aniline dyeing and embossing on existing finishing lines. Let’s run trials together.",
          to: "/work-with-us?type=manufacturer#inquiry",
          cta: "Start a processing trial",
          cls: "bg-mc-mocha text-mc-paper",
        },
      ].map((p) => (
        <div key={p.k} className={`${p.cls} px-5 py-20 md:px-14 md:py-28`}>
          <Reveal>
            <Eyebrow className={p.cls.includes("mocha") ? "text-mc-paper/60" : undefined}>{p.k}</Eyebrow>
            <h3 className="mt-5 max-w-md font-mc-serif text-4xl font-light leading-tight md:text-5xl">{p.t}</h3>
            <p className={`mt-5 max-w-md text-[15px] leading-relaxed ${p.cls.includes("mocha") ? "text-mc-paper/75" : "text-mc-mute"}`}>
              {p.b}
            </p>
            <PillButton to={p.to} variant={p.cls.includes("mocha") ? "light" : "dark"} className="mt-8">
              {p.cta}
            </PillButton>
          </Reveal>
        </div>
      ))}
    </section>

    {/* 9. 회사 · 소식 · 향후 플랫폼 */}
    <section className="py-24 md:py-32">
      <Container className="grid gap-16 md:grid-cols-12">
        <Reveal className="md:col-span-5">
          <Eyebrow>SAVE EARTH Inc.</Eyebrow>
          <Display className="mt-4 text-[clamp(2rem,4vw,3.5rem)]">Materials that are cultivated, not extracted.</Display>
          <p className="mt-6 text-[15px] leading-relaxed text-mc-mute">
            Mycerra™ is the first expression of a material platform. Our research extends into new mycelium
            materials:
          </p>
          <ul className="mt-6 divide-y divide-mc-line border-y border-mc-line">
            {futurePlatform.map((f) => (
              <li key={f.title} className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-6">
                <span className="font-mc-serif text-lg sm:w-56 sm:shrink-0">{f.title}</span>
                <span className="text-sm text-mc-mute">{f.body}</span>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal className="md:col-span-6 md:col-start-7" delay={150}>
          <Eyebrow>News & media</Eyebrow>
          <ul className="mt-6 divide-y divide-mc-line border-y border-mc-line">
            {news.map((n) => (
              <li key={n.title} className="grid grid-cols-[96px_1fr] gap-4 py-5">
                <span className="pt-1 font-mc-sans text-[11px] uppercase tracking-[0.16em] text-mc-mute">{n.tag}</span>
                <span>
                  <span className="block font-mc-serif text-xl">{n.title}</span>
                  <span className="text-sm text-mc-mute">{n.meta}</span>
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      </Container>
    </section>
  </>
);

export default Home;

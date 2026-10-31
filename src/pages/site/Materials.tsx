import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/site/Reveal";
import { Container, Display, Eyebrow, PillButton } from "@/components/site/primitives";
import {
  expressions,
  familyLabel,
  features,
  finishingOptions,
  type Expression,
  type FinishFamily,
} from "@/content/mycerra";
import { products } from "@/content/shop";
import { useCopy, useLang } from "@/i18n/LanguageProvider";

const families: ("All" | FinishFamily)[] = ["All", "Grain", "Embossed", "Natural", "Dyed"];

const copy = {
  en: {
    eyebrow: "Mycerra™ material library",
    title: "One cultivated mat. Many expressions.",
    intro:
      "Mycerra™ is a 100% pure mycelium mat — no non-woven backing, scaffold or foreign substrate. It can be finished to the same standard as animal leather, supports aniline dyeing and takes crocodile-grain embossing with excellent definition.",
    request: "Request this swatch",
    buy: "Order in the shop",
    filter: "Filter by finish family",
    finishingEyebrow: "Finishing",
    finishingTitle: "Finished like premium hides.",
    custom: "Finishing and colour customization available upon request.",
    performanceEyebrow: "Performance",
    tdsBefore: "Full physical properties and test reports are listed on the",
    tdsLink: "Technology page",
  },
  ko: {
    eyebrow: "Mycerra™ 소재 라이브러리",
    title: "하나의 배양 매트, 여러 표현.",
    intro:
      "Mycerra™는 부직포 배접, 지지체, 이물 기재가 없는 100% 순수 균사 매트입니다. 동물 가죽과 같은 기준으로 마감할 수 있고, 아닐린 염색이 가능하며, 크로커다일 엠보가 선명하게 표현됩니다.",
    request: "이 스와치 요청",
    buy: "쇼핑몰에서 주문",
    filter: "마감 계열로 보기",
    finishingEyebrow: "마감",
    finishingTitle: "프리미엄 원피처럼 마감합니다.",
    custom: "마감과 컬러는 요청에 따라 맞춤 제작할 수 있습니다.",
    performanceEyebrow: "성능",
    tdsBefore: "전체 물성과 시험 성적서는 다음 페이지에서 확인할 수 있습니다:",
    tdsLink: "기술 페이지",
  },
};

// 배경이 어두운 대표색이면 밝은 글자를 쓴다
const isDark = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
};

const Feature = ({ e }: { e: Expression }) => {
  const c = useCopy(copy);
  const { t } = useLang();
  const dark = isDark(e.accent);
  const sku = products.find((p) => p.libraryCode === e.code)?.sku;
  return (
    <section
      className={cn("transition-colors duration-700", dark ? "text-mc-paper" : "text-mc-ink")}
      style={{ backgroundColor: e.accent }}
    >
      <Container className="grid items-center gap-10 py-20 md:grid-cols-12 md:py-28">
        <div className="md:col-span-7">
          <div className="aspect-[4/3] overflow-hidden">
            <img key={e.code} src={e.image} alt={`${e.name} ${e.code}`} className="h-full w-full animate-fade-in object-cover" />
          </div>
        </div>
        <div className="md:col-span-4 md:col-start-9">
          <p className={cn("text-xs tracking-[0.2em]", dark ? "text-mc-paper/60" : "text-mc-mute")}>
            {e.code} · {t(familyLabel[e.family])}
          </p>
          <Display className="mt-3 text-5xl md:text-6xl">{e.name}</Display>
          <p className={cn("mt-5 text-[15px] leading-relaxed", dark ? "text-mc-paper/80" : "text-mc-mute")}>
            {t(e.description)}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PillButton to={`/work-with-us?type=brand&ref=${e.code}#inquiry`} variant={dark ? "light" : "dark"}>
              {c.request}
            </PillButton>
            {sku && (
              <Link
                to={`/shop/p/${sku}`}
                className={cn(
                  "inline-flex items-center rounded-full border px-6 py-3 text-sm transition-colors",
                  dark ? "border-mc-paper/40 hover:border-mc-paper" : "border-mc-ink/30 hover:border-mc-ink",
                )}
              >
                {c.buy}
              </Link>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
};

const Materials = () => {
  const c = useCopy(copy);
  const { t } = useLang();
  const [family, setFamily] = useState<(typeof families)[number]>("All");
  const [params] = useSearchParams();
  // 홈 스와치에서 ?code=MG-02 형태로 들어오면 해당 소재를 먼저 보여준다
  const [selected, setSelected] = useState<Expression>(
    () => expressions.find((e) => e.code === params.get("code")) ?? expressions[0],
  );
  const list = useMemo(
    () => (family === "All" ? expressions : expressions.filter((e) => e.family === family)),
    [family],
  );

  return (
    <>
      <section className="pb-16 pt-36 md:pt-44">
        <Container>
          <Eyebrow>{c.eyebrow}</Eyebrow>
          <Display as="h1" className="mt-5 max-w-5xl text-[clamp(2.75rem,7vw,6.5rem)]">
            {c.title}
          </Display>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-mc-mute">{c.intro}</p>
        </Container>
      </section>

      <Feature e={selected} />

      <section className="py-20 md:py-28">
        <Container>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label={c.filter}>
            {families.map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={family === f}
                onClick={() => setFamily(f)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition-colors",
                  family === f ? "border-mc-ink bg-mc-ink text-mc-paper" : "border-mc-line hover:border-mc-ink",
                )}
              >
                {t(familyLabel[f])}
                <span className="ml-1.5 opacity-50">
                  {f === "All" ? expressions.length : expressions.filter((e) => e.family === f).length}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {list.map((e) => (
              <button
                key={e.code}
                id={e.code}
                type="button"
                onClick={() => {
                  setSelected(e);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="group scroll-mt-24 self-start text-left"
              >
                <div
                  className={cn(
                    "aspect-[4/5] overflow-hidden ring-offset-4 ring-offset-mc-paper transition",
                    selected.code === e.code && "ring-1 ring-mc-ink",
                  )}
                >
                  <img
                    src={e.image}
                    alt={`${e.name} ${e.code}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <span className="font-mc-serif text-lg">{e.name}</span>
                  <span className="text-[11px] tracking-[0.16em] text-mc-mute">{e.code}</span>
                </div>
                <span className="text-xs text-mc-mute">{t(e.description)}</span>
              </button>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-mc-line bg-mc-cream py-20 md:py-28">
        <Container className="grid gap-16 md:grid-cols-12">
          <Reveal className="md:col-span-4">
            <Eyebrow>{c.finishingEyebrow}</Eyebrow>
            <Display className="mt-4 text-4xl md:text-5xl">{c.finishingTitle}</Display>
            <ul className="mt-8 space-y-3 text-[15px] text-mc-mute">
              {finishingOptions.map((o) => (
                <li key={o.en} className="flex gap-3">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-mc-ink" />
                  {t(o)}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-mc-mute">{c.custom}</p>
          </Reveal>
          <Reveal className="md:col-span-7 md:col-start-6" delay={150}>
            <Eyebrow>{c.performanceEyebrow}</Eyebrow>
            <dl className="mt-6 divide-y divide-mc-line border-y border-mc-line">
              {features.map((f) => (
                <div key={f.title.en} className="grid gap-2 py-6 sm:grid-cols-[220px_1fr] sm:gap-8">
                  <dt className="font-mc-serif text-xl">{t(f.title)}</dt>
                  <dd className="text-[15px] leading-relaxed text-mc-mute">{t(f.body)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-sm text-mc-mute">
              {c.tdsBefore}{" "}
              <Link to="/technology#test-reports" className="underline underline-offset-4">
                {c.tdsLink}
              </Link>
              .
            </p>
          </Reveal>
        </Container>
      </section>
    </>
  );
};

export default Materials;

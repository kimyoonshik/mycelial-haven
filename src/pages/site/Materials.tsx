import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/site/Reveal";
import { Container, Display, Eyebrow, PillButton } from "@/components/site/primitives";
import { expressions, features, finishingOptions, type Expression, type FinishFamily } from "@/content/mycerra";

const families: ("All" | FinishFamily)[] = ["All", "Grain", "Embossed", "Natural", "Dyed"];

// 배경이 어두운 대표색이면 밝은 글자를 쓴다
const isDark = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
};

const Feature = ({ e }: { e: Expression }) => {
  const dark = isDark(e.accent);
  return (
    <section
      className={cn("transition-colors duration-700", dark ? "text-mc-paper" : "text-mc-ink")}
      style={{ backgroundColor: e.accent }}
    >
      <Container className="grid items-center gap-10 py-20 md:grid-cols-12 md:py-28">
        <div className="md:col-span-7">
          <div className="aspect-[4/3] overflow-hidden">
            <img key={e.code} src={e.image} alt={`${e.name} ${e.code}`} className="h-full w-full object-cover animate-fade-in" />
          </div>
        </div>
        <div className="md:col-span-4 md:col-start-9">
          <p className={cn("font-mc-sans text-xs tracking-[0.2em]", dark ? "text-mc-paper/60" : "text-mc-mute")}>
            {e.code} · {e.family}
          </p>
          <Display className="mt-3 text-5xl md:text-6xl">{e.name}</Display>
          <p className={cn("mt-5 text-[15px] leading-relaxed", dark ? "text-mc-paper/80" : "text-mc-mute")}>
            {e.description}
          </p>
          <PillButton
            to={`/work-with-us?type=brand&ref=${e.code}#inquiry`}
            variant={dark ? "light" : "dark"}
            className="mt-8"
          >
            Request this swatch
          </PillButton>
        </div>
      </Container>
    </section>
  );
};

const Materials = () => {
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
          <Eyebrow>Mycerra™ material library</Eyebrow>
          <Display as="h1" className="mt-5 max-w-5xl text-[clamp(2.75rem,7vw,6.5rem)]">
            One cultivated mat. Many expressions.
          </Display>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-mc-mute">
            Mycerra™ is a 100% pure mycelium mat — no non-woven backing, scaffold or foreign substrate. It can be
            finished to the same standard as animal leather, supports aniline dyeing and takes crocodile-grain
            embossing with excellent definition.
          </p>
        </Container>
      </section>

      <Feature e={selected} />

      <section className="py-20 md:py-28">
        <Container>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by finish family">
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
                {f}
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
                <span className="text-xs text-mc-mute">{e.description}</span>
              </button>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-mc-line bg-mc-cream py-20 md:py-28">
        <Container className="grid gap-16 md:grid-cols-12">
          <Reveal className="md:col-span-4">
            <Eyebrow>Finishing</Eyebrow>
            <Display className="mt-4 text-4xl md:text-5xl">Finished like premium hides.</Display>
            <ul className="mt-8 space-y-3 text-[15px] text-mc-mute">
              {finishingOptions.map((o) => (
                <li key={o} className="flex gap-3">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-mc-ink" />
                  {o}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-mc-mute">Finishing and colour customization available upon request.</p>
          </Reveal>
          <Reveal className="md:col-span-7 md:col-start-6" delay={150}>
            <Eyebrow>Performance</Eyebrow>
            <dl className="mt-6 divide-y divide-mc-line border-y border-mc-line">
              {features.map((f) => (
                <div key={f.title} className="grid gap-2 py-6 sm:grid-cols-[220px_1fr] sm:gap-8">
                  <dt className="font-mc-serif text-xl">{f.title}</dt>
                  <dd className="text-[15px] leading-relaxed text-mc-mute">{f.body}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-sm text-mc-mute">
              Full physical properties are listed in the Technical Data Sheet —{" "}
              <Link to="/work-with-us#downloads" className="underline underline-offset-4">
                request it here
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

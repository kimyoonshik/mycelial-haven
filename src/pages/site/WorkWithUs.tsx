import { useSearchParams } from "react-router-dom";
import { Reveal } from "@/components/site/Reveal";
import { InquiryForm } from "@/components/site/InquiryForm";
import { Container, Display, Eyebrow, ProofBadge } from "@/components/site/primitives";
import { company, downloads, inquiryTypes, workSpecs, type InquiryTypeId } from "@/content/mycerra";

const steps = [
  {
    no: "01",
    t: "Start a conversation",
    b: "Tell us about your product, quantities and timeline. We help you identify the most suitable Mycerra™ expression.",
  },
  {
    no: "02",
    t: "Evaluate swatches",
    b: "Receive a swatch kit, review the Technical Data Sheet and test the material on your own lines.",
  },
  {
    no: "03",
    t: "Prototype & develop",
    b: "Order full sheets for prototyping, or develop a custom colour and finish together with our team.",
  },
  {
    no: "04",
    t: "Scale",
    b: "Each batch is cultivated, stabilized, finished and origin-documented in Korea, then shipped worldwide.",
  },
];

const WorkWithUs = () => {
  const [params] = useSearchParams();
  const typeParam = params.get("type");
  const initialType = inquiryTypes.some((t) => t.id === typeParam) ? (typeParam as InquiryTypeId) : "brand";

  return (
    <>
      <section className="pb-20 pt-36 md:pt-44">
        <Container>
          <Eyebrow>Work with us</Eyebrow>
          <Display as="h1" className="mt-5 max-w-5xl text-[clamp(2.75rem,7vw,6.5rem)]">
            How to work with Mycerra<sup className="text-[0.3em] align-super">™</sup>.
          </Display>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-mc-mute">
            Mycerra™ is available as swatch kits, full sheets or custom developments. Every collaboration begins
            with a short conversation.
          </p>
        </Container>
      </section>

      <section className="border-t border-mc-line">
        <Container>
          <div className="grid gap-px bg-mc-line md:grid-cols-4">
            {steps.map((s, i) => (
              <Reveal key={s.no} delay={i * 100} className="bg-mc-paper py-10 md:px-6 md:first:pl-0">
                <p className="text-xs tracking-[0.2em] text-mc-mute">{s.no}</p>
                <h3 className="mt-3 font-mc-serif text-2xl">{s.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-mc-mute">{s.b}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-mc-cream py-20 md:py-28">
        <Container className="grid gap-16 md:grid-cols-12">
          <Reveal className="md:col-span-6">
            <Eyebrow>Supply</Eyebrow>
            <Display className="mt-4 text-4xl md:text-5xl">Formats & ordering</Display>
            <dl className="mt-8 divide-y divide-mc-line border-y border-mc-line">
              {workSpecs.map((s) => (
                <div key={s.label} className="flex justify-between gap-6 py-4 text-[15px]">
                  <dt className="text-mc-mute">{s.label}</dt>
                  <dd className="text-right">{s.value ?? <span className="text-mc-mute">On request</span>}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
          <Reveal className="md:col-span-5 md:col-start-8" delay={150}>
            <div id="downloads" className="scroll-mt-24">
              <Eyebrow>Documents</Eyebrow>
              <Display className="mt-4 text-4xl md:text-5xl">Downloads</Display>
              <ul className="mt-8 divide-y divide-mc-line border-y border-mc-line">
                {downloads.map((d) => (
                  <li key={d.title} className="flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-mc-serif text-xl">{d.title}</span>
                    <span className="flex items-center gap-3">
                      <ProofBadge status={d.status} />
                      <a
                        href={`mailto:${company.email}?subject=${encodeURIComponent(`[Mycerra] Request: ${d.title}`)}`}
                        className="text-sm underline underline-offset-4"
                      >
                        Request
                      </a>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </Container>
      </section>

      <section id="inquiry" className="scroll-mt-16 py-20 md:py-28">
        <Container className="grid gap-16 md:grid-cols-12">
          <div className="md:col-span-4">
            <Eyebrow>Inquiry</Eyebrow>
            <Display className="mt-4 text-4xl md:text-5xl">Let’s grow something together.</Display>
            <p className="mt-6 text-[15px] leading-relaxed text-mc-mute">
              Brands, tanneries, investors and press — choose who you are so we can route your message to the
              right person.
            </p>
            <a href={`mailto:${company.email}`} className="mt-6 inline-block font-mc-serif text-xl underline underline-offset-4">
              {company.email}
            </a>
          </div>
          <div className="md:col-span-7 md:col-start-6">
            <InquiryForm key={`${initialType}-${params.get("ref")}`} initialType={initialType} initialRef={params.get("ref")} />
          </div>
        </Container>
      </section>
    </>
  );
};

export default WorkWithUs;

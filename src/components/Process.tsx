import { Sprout, TestTube, Package, Sun, RefreshCw } from "lucide-react";

const steps = [
  {
    icon: Sprout,
    title: "Culture",
    description: "We begin with mycelium cultures, selecting strains optimized for material properties.",
  },
  {
    icon: TestTube,
    title: "Grow",
    description: "Mycelium grows through agricultural byproducts, forming dense networks over 7-14 days.",
  },
  {
    icon: Package,
    title: "Shape",
    description: "Material is grown into reusable molds, creating precise forms without waste.",
  },
  {
    icon: Sun,
    title: "Cure",
    description: "Low-energy heat treatment halts growth and stabilizes the material structure.",
  },
  {
    icon: RefreshCw,
    title: "Return",
    description: "At end of life, pieces compost back into soil nutrients—completing the cycle.",
  },
];

export const Process = () => {
  return (
    <section id="process" className="bg-deep-burgundy py-20 md:py-32">
      <div className="section-container">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-5xl text-foreground mb-4">
            Our Process
          </h2>
          <p className="font-body text-lg text-foreground/70 max-w-2xl mx-auto">
            From culture to compost—each step honors the living logic of mycelium.
          </p>
        </div>

        <div className="relative">
          {/* Timeline connector */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-[2px] bg-foreground/20" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-6">
            {steps.map((step, index) => (
              <div key={step.title} className="relative text-center group">
                {/* Icon circle */}
                <div className="relative z-10 inline-flex items-center justify-center w-20 h-20 rounded-full bg-cognac text-ink-light mb-6 group-hover:scale-110 transition-transform duration-350">
                  <step.icon className="w-8 h-8" />
                </div>

                {/* Number */}
                <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1 font-display text-6xl text-foreground/10 pointer-events-none">
                  {index + 1}
                </div>

                <h3 className="font-display text-xl text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="font-body text-sm text-foreground/70 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="font-body text-sm text-foreground/60 italic max-w-2xl mx-auto">
            Molds are reusable; hardware remains reversible. Each element is designed for longevity and eventual return to nature.
          </p>
        </div>
      </div>
    </section>
  );
};

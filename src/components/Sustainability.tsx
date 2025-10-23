import { Leaf, Recycle, MapPin } from "lucide-react";

const metrics = [
  {
    icon: Leaf,
    value: "85%",
    label: "Carbon reduction vs. synthetic leather",
    description: "Minimal energy input throughout cultivation and curing",
  },
  {
    icon: Recycle,
    value: "100%",
    label: "Compostability",
    description: "All materials return to soil as nutrients within 180 days",
  },
  {
    icon: MapPin,
    value: "95%",
    label: "Local byproduct utilization",
    description: "Agricultural waste streams transformed into raw materials",
  },
];

export const Sustainability = () => {
  return (
    <section id="sustainability" className="bg-warm-beige py-20 md:py-32">
      <div className="section-container">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-5xl text-ink-dark mb-4">
            Circular by design
          </h2>
          <p className="font-body text-lg text-ink-dark/70 max-w-2xl mx-auto leading-relaxed">
            Our pieces are grown, not manufactured. End-of-life is designed from the start—
            every material returns to become soil nutrients.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="text-center p-8 rounded-xl bg-white/50 hairline-border card-shadow hover:scale-[1.02] transition-transform duration-350"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cognac/10 mb-6">
                <metric.icon className="w-8 h-8 text-cognac" />
              </div>
              
              <div className="font-display text-4xl md:text-5xl text-cognac mb-2">
                {metric.value}
              </div>
              
              <h3 className="font-ui text-sm uppercase tracking-wide text-ink-dark/80 mb-3">
                {metric.label}
              </h3>
              
              <p className="font-body text-sm text-ink-dark/60 leading-relaxed">
                {metric.description}
              </p>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto space-y-6 text-center">
          <p className="font-body text-base text-ink-dark/80 leading-relaxed">
            Mycelium grows rapidly using agricultural byproducts that would otherwise go to waste. 
            Our low-temperature curing process requires minimal energy compared to synthetic material production. 
            No petrochemicals, no plastic binders—just pure fungal architecture.
          </p>
          
          <p className="font-body text-base text-ink-dark/80 leading-relaxed">
            When a MYCERRA piece reaches the end of its useful life, it can be composted to return nutrients 
            to the soil. This isn't an afterthought—it's built into every design decision from the beginning.
          </p>

          <div className="pt-6">
            <div className="inline-block px-6 py-3 rounded-lg bg-cognac/10 border border-cognac/20">
              <p className="font-ui text-sm text-cognac uppercase tracking-wide">
                Grown • Not Manufactured • Designed to Return
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

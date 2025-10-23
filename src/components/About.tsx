import aboutImage from "@/assets/about-mycelium.jpg";

export const About = () => {
  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const stats = [
    { value: "0%", label: "Petrochemical binder" },
    { value: "Low", label: "Energy curing" },
    { value: "100%", label: "Compostable end-of-life" },
  ];

  return (
    <section id="about" className="bg-warm-beige py-20 md:py-32">
      <div className="section-container">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1">
            <img
              src={aboutImage}
              alt="Mycelium research and craftsmanship"
              className="rounded-xl w-full h-auto object-cover card-shadow"
              loading="lazy"
            />
          </div>
          
          <div className="order-1 md:order-2 space-y-6">
            <h2 className="font-display text-3xl md:text-5xl text-ink-dark leading-tight">
              Designing with mycelium's living logic
            </h2>
            
            <div className="space-y-4 font-body text-base md:text-lg text-ink-dark/80 leading-relaxed">
              <p>
                We are a bio-design studio working with the living logic of mycelium. Our practice blends science and craft to grow pure mycelium materials and objects with minimal energy and waste.
              </p>
              
              <p>
                MYCERRA translates the growth logic of mycelium into low-energy, low-waste materials, objects, and experiences. Each piece embodies a commitment to circularity—from cultivation to compost.
              </p>
              
              <p>
                Our work stands at the intersection of material innovation and thoughtful craft, creating products that respect both nature and design.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="font-display text-2xl md:text-3xl text-cognac">
                    {stat.value}
                  </div>
                  <div className="font-ui text-xs uppercase tracking-wide text-ink-dark/60 mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 pt-6">
              <button
                onClick={() => scrollToSection("#process")}
                className="inline-flex items-center px-4 py-2 rounded-lg border border-ink-dark/20 text-sm font-ui text-ink-dark hover:bg-ink-dark/5 transition-colors duration-300 focus-ring"
              >
                Our Process
              </button>
              <button
                onClick={() => scrollToSection("#sustainability")}
                className="inline-flex items-center px-4 py-2 rounded-lg border border-ink-dark/20 text-sm font-ui text-ink-dark hover:bg-ink-dark/5 transition-colors duration-300 focus-ring"
              >
                Sustainability
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

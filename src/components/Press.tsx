import { Quote } from "lucide-react";

const testimonials = [
  {
    quote: "MYCERRA transforms the conversation around sustainable materials—proving that eco-conscious design can be both elegant and enduring.",
    author: "Elena Rodriguez",
    role: "Curator, Material Futures Institute",
  },
  {
    quote: "Their work represents a fundamental shift: designing with living systems rather than against them. The results are breathtaking.",
    author: "Dr. James Chen",
    role: "Biomaterials Researcher, MIT Media Lab",
  },
  {
    quote: "Pure artistry meets pure science. MYCERRA's mycelium pieces feel like the future—grown from intelligence, not extracted from the earth.",
    author: "Sofia Andersson",
    role: "Design Editor, Form & Function",
  },
];

export const Press = () => {
  return (
    <section id="press" className="bg-deep-burgundy py-20 md:py-32">
      <div className="section-container">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-5xl text-foreground mb-4">
            Recognition
          </h2>
          <p className="font-body text-lg text-foreground/70 max-w-2xl mx-auto">
            Our work has been featured by leading voices in design and sustainability.
          </p>
        </div>

        {/* Testimonials Slider */}
        <div className="max-w-4xl mx-auto space-y-12 mb-16">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative p-8 md:p-12 rounded-xl bg-warm-beige/10 hairline-border card-shadow"
            >
              <Quote className="absolute top-6 left-6 w-8 h-8 text-cognac/30" />
              
              <blockquote className="relative z-10 space-y-6">
                <p className="font-body text-lg md:text-xl text-foreground/90 leading-relaxed italic">
                  "{testimonial.quote}"
                </p>
                
                <footer className="font-ui text-sm">
                  <div className="text-foreground font-medium">{testimonial.author}</div>
                  <div className="text-foreground/60">{testimonial.role}</div>
                </footer>
              </blockquote>
            </div>
          ))}
        </div>

        {/* Press Logos Placeholder */}
        <div className="text-center">
          <div className="inline-flex items-center gap-8 flex-wrap justify-center opacity-50">
            <div className="font-ui text-sm uppercase tracking-widest text-foreground">
              Featured in
            </div>
            <div className="font-display text-xl text-foreground">Dezeen</div>
            <div className="font-display text-xl text-foreground">Material Bank</div>
            <div className="font-display text-xl text-foreground">Design Milk</div>
            <div className="font-display text-xl text-foreground">Wallpaper*</div>
          </div>
        </div>

        {/* Lookbook Download */}
        <div className="text-center mt-12">
          <a
            href="#"
            className="inline-flex items-center font-ui text-sm text-foreground hover:text-cognac transition-colors duration-300 underline underline-offset-4 focus-ring"
          >
            Download Lookbook (PDF) →
          </a>
        </div>
      </div>
    </section>
  );
};

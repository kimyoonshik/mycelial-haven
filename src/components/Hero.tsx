import { Button } from "@/components/ui/button";
import heroTexture from "@/assets/hero-texture.jpg";

export const Hero = () => {
  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: `url(${heroTexture})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-deep-burgundy/80" />
      
      <div className="relative z-10 section-container text-center">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          <p className="font-ui text-xs uppercase tracking-widest text-foreground/70">
            PURE MYCELIUM • NO PETRO BINDERS • CIRCULAR BY DESIGN
          </p>
          
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl leading-tight text-foreground">
            Born from nature's intelligence—
            <br />
            crafted purely from mycelium.
          </h1>
          
          <p className="font-body text-lg md:text-xl text-foreground/80 max-w-2xl mx-auto leading-relaxed">
            We blend science, design, and ecology to build circular materials and experiences.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              variant="hero"
              size="lg"
              onClick={() => scrollToSection("#portfolio")}
              className="focus-ring"
            >
              Explore Portfolio
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => scrollToSection("#materials")}
              className="focus-ring"
            >
              See Materials
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

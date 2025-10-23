import { useState } from "react";
import { X } from "lucide-react";
import compressionMat from "@/assets/compression-mat-swatch.jpg";
import mycoFelt from "@/assets/mycofelt-panel-hero.jpg";

interface Material {
  id: string;
  name: string;
  shortSpec: string;
  tags: string[];
  image: string;
  details: {
    density: string;
    texture: string;
    endOfLife: string;
    care: string;
  };
}

const materials: Material[] = [
  {
    id: "compression-mat",
    name: "Pure Mycelium Compression Mat",
    shortSpec: "Dense, fine-pored mycelium sheet",
    tags: ["Sheet", "Dense", "Durable"],
    image: compressionMat,
    details: {
      density: "High (approx. 0.4-0.6 g/cm³)",
      texture: "Smooth, leather-like finish with subtle natural variation",
      endOfLife: "Fully compostable in 90-180 days; biodegrades into soil nutrients",
      care: "Wipe clean with damp cloth; store in cool, dry place; avoid prolonged water exposure",
    },
  },
  {
    id: "mycofelt-soft",
    name: "MycoFelt L-Soft",
    shortSpec: "Flexible felt-like sheet for liners",
    tags: ["Sheet", "Flexible", "Soft"],
    image: mycoFelt,
    details: {
      density: "Medium-low (approx. 0.2-0.3 g/cm³)",
      texture: "Soft, tactile felt with natural fiber appearance",
      endOfLife: "Compostable in 60-120 days; breaks down into organic matter",
      care: "Gentle spot cleaning; air dry; suitable for diffusion applications",
    },
  },
  {
    id: "mycopanel",
    name: "MycoPanel S-200",
    shortSpec: "Semi-rigid panel for acoustic use",
    tags: ["Panel", "Acoustic", "Rigid"],
    image: compressionMat,
    details: {
      density: "Medium (approx. 0.3-0.4 g/cm³)",
      texture: "Slightly textured surface with excellent sound absorption",
      endOfLife: "Compostable in 120-180 days; suitable for industrial composting",
      care: "Dust with soft brush; avoid moisture; ideal for interior applications",
    },
  },
  {
    id: "mycoshell",
    name: "MycoShell Light-Grade",
    shortSpec: "Thin shells for lighting and enclosures",
    tags: ["Shell", "Lightweight", "Translucent"],
    image: mycoFelt,
    details: {
      density: "Low (approx. 0.15-0.25 g/cm³)",
      texture: "Smooth, slightly translucent with organic patterns",
      endOfLife: "Rapidly compostable in 45-90 days",
      care: "Handle gently; avoid direct water contact; perfect for ambient lighting",
    },
  },
  {
    id: "mycoboard",
    name: "MycoBoard W-Expanded",
    shortSpec: "Lightweight board, dyeable, laser-friendly",
    tags: ["Board", "Dyeable", "Laser-cut"],
    image: compressionMat,
    details: {
      density: "Medium-low (approx. 0.25-0.35 g/cm³)",
      texture: "Expanded structure, accepts natural dyes and laser etching",
      endOfLife: "Compostable in 90-150 days; suitable for home composting",
      care: "Clean with dry cloth; can be treated with natural sealants",
    },
  },
  {
    id: "mycobrick",
    name: "MycoBrick B-Compact",
    shortSpec: "Experimental dense unit for structure",
    tags: ["Brick", "Experimental", "Dense"],
    image: mycoFelt,
    details: {
      density: "High (approx. 0.5-0.7 g/cm³)",
      texture: "Very dense, structural-grade with minimal porosity",
      endOfLife: "Compostable in 180-240 days; industrial composting recommended",
      care: "Durable; minimal maintenance; suitable for structural applications",
    },
  },
];

export const Materials = () => {
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  const scrollToContact = (subject: string) => {
    const element = document.querySelector("#contact");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      // In a real implementation, you would prefill the contact form
    }
  };

  return (
    <section id="materials" className="bg-deep-burgundy py-20 md:py-32">
      <div className="section-container">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-5xl text-foreground mb-4">
            Materials grown to shape
          </h2>
          <p className="font-body text-lg text-foreground/70 max-w-2xl mx-auto">
            Each material embodies nature's intelligence—cultivated without petrochemicals, 
            designed for circularity.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {materials.map((material) => (
            <button
              key={material.id}
              onClick={() => setSelectedMaterial(material)}
              className="group relative bg-warm-beige rounded-xl overflow-hidden hairline-border hover:scale-[1.02] transition-all duration-350 focus-ring text-left"
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={material.image}
                  alt={material.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="p-6 space-y-3">
                <h3 className="font-display text-xl text-ink-dark">
                  {material.name}
                </h3>
                <p className="font-body text-sm text-ink-dark/70">
                  {material.shortSpec}
                </p>
                <div className="flex flex-wrap gap-2">
                  {material.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block px-3 py-1 rounded-full bg-cognac/10 text-xs font-ui text-cognac uppercase tracking-wide"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="pt-2 text-sm font-ui text-cognac">
                  View spec →
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={() => scrollToContact("Swatch Request")}
            className="inline-flex items-center font-ui text-sm text-foreground hover:text-cognac transition-colors duration-300 underline underline-offset-4 focus-ring"
          >
            Prefer swatches first? Request a kit →
          </button>
        </div>
      </div>

      {/* Material Detail Modal */}
      {selectedMaterial && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-deep-burgundy/95 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setSelectedMaterial(null)}
        >
          <div
            className="relative bg-warm-beige rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto card-shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedMaterial(null)}
              className="sticky top-4 float-right m-4 p-2 rounded-lg bg-ink-dark/10 hover:bg-ink-dark/20 transition-colors focus-ring"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 text-ink-dark" />
            </button>

            <div className="p-8 space-y-6">
              <div className="aspect-video rounded-lg overflow-hidden">
                <img
                  src={selectedMaterial.image}
                  alt={selectedMaterial.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h3 className="font-display text-3xl text-ink-dark mb-2">
                  {selectedMaterial.name}
                </h3>
                <p className="font-body text-lg text-ink-dark/70">
                  {selectedMaterial.shortSpec}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-ui text-xs uppercase tracking-wide text-ink-dark/60 mb-2">
                    Density
                  </h4>
                  <p className="font-body text-sm text-ink-dark">
                    {selectedMaterial.details.density}
                  </p>
                </div>
                <div>
                  <h4 className="font-ui text-xs uppercase tracking-wide text-ink-dark/60 mb-2">
                    Texture
                  </h4>
                  <p className="font-body text-sm text-ink-dark">
                    {selectedMaterial.details.texture}
                  </p>
                </div>
                <div>
                  <h4 className="font-ui text-xs uppercase tracking-wide text-ink-dark/60 mb-2">
                    End of Life
                  </h4>
                  <p className="font-body text-sm text-ink-dark">
                    {selectedMaterial.details.endOfLife}
                  </p>
                </div>
                <div>
                  <h4 className="font-ui text-xs uppercase tracking-wide text-ink-dark/60 mb-2">
                    Care Notes
                  </h4>
                  <p className="font-body text-sm text-ink-dark">
                    {selectedMaterial.details.care}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedMaterial(null);
                  scrollToContact(`Inquiry: ${selectedMaterial.name}`);
                }}
                className="w-full py-3 px-6 rounded-lg bg-cognac text-ink-light font-ui font-medium hover:opacity-90 transition-opacity focus-ring"
              >
                Request sample
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

import { useState } from "react";
import { X } from "lucide-react";
import museTote from "@/assets/muse-tote-hero.jpg";
import arcShoulder from "@/assets/arc-shoulder-hero.jpg";
import truffleMini from "@/assets/truffle-mini-hero.jpg";
import atlasWeekender from "@/assets/atlas-weekender-hero.jpg";
import compressionMat from "@/assets/compression-mat-swatch.jpg";
import mycoFelt from "@/assets/mycofelt-panel-hero.jpg";

interface PortfolioItem {
  id: string;
  category: "handbag" | "textile";
  name: string;
  coverImage: string;
  blurb: string;
  specs: {
    dimensions?: string;
    weight?: string;
    materials: string;
    features: string;
  };
  gallery: string[];
}

const portfolioItems: PortfolioItem[] = [
  {
    id: "muse-tote",
    category: "handbag",
    name: "Muse Tote",
    coverImage: museTote,
    blurb: "Structured tote with Pure Mycelium Compression Mat; hand-wrapped edge; cognac-brown straps.",
    specs: {
      dimensions: "320×290×120mm",
      weight: "~680g",
      materials: "Shell: Pure Mycelium Compression Mat; Lining: MycoFelt; Hardware: Reversible brass",
      features: "Hand-wrapped edges, adjustable straps, repair-friendly construction",
    },
    gallery: [museTote, compressionMat, mycoFelt],
  },
  {
    id: "arc-shoulder",
    category: "handbag",
    name: "Arc Shoulder",
    coverImage: arcShoulder,
    blurb: "Crescent silhouette with soft diffusion grain; dust-taupe finish.",
    specs: {
      dimensions: "270×170×70mm",
      weight: "~520g",
      materials: "Pure Mycelium Mat with natural dust-taupe finish",
      features: "Adjustable strap, magnetic closure, repair-friendly design",
    },
    gallery: [arcShoulder, mycoFelt],
  },
  {
    id: "truffle-mini",
    category: "handbag",
    name: "Truffle Mini",
    coverImage: truffleMini,
    blurb: "Compact form grown in a reusable mold; warm-beige interior pockets.",
    specs: {
      dimensions: "190×130×60mm",
      weight: "~410g",
      materials: "Molded Pure Mycelium with warm-beige interior",
      features: "Magnetic closure, interior pockets, compact travel design",
    },
    gallery: [truffleMini, compressionMat],
  },
  {
    id: "atlas-weekender",
    category: "handbag",
    name: "Atlas Weekender",
    coverImage: atlasWeekender,
    blurb: "Lightweight travel holdall with modular panels for repair/reuse.",
    specs: {
      dimensions: "450×280×220mm",
      weight: "~1.2kg",
      materials: "Modular MycoBoard panels with cognac accents",
      features: "Replaceable straps and base, modular panel system, lightweight construction",
    },
    gallery: [atlasWeekender, mycoFelt, compressionMat],
  },
  {
    id: "compression-swatch",
    category: "textile",
    name: "Pure Mycelium Compression Mat — Swatch Set",
    coverImage: compressionMat,
    blurb: "Colorways tuned to the brand palette; natural sealant option.",
    specs: {
      dimensions: "100×100mm x 5pcs",
      materials: "Pure Mycelium Compression Mat in various natural tones",
      features: "High density, compostable after use, natural sealant compatible",
    },
    gallery: [compressionMat, mycoFelt],
  },
  {
    id: "mycofelt-panel",
    category: "textile",
    name: "MycoFelt L-Soft — Panel",
    coverImage: mycoFelt,
    blurb: "Flexible sheets used as bag liners and soft dividers.",
    specs: {
      dimensions: "600×400×3mm",
      materials: "MycoFelt L-Soft in warm beige",
      features: "Warm tactile finish, flexible application, biodegradable",
    },
    gallery: [mycoFelt, compressionMat],
  },
];

export const Portfolio = () => {
  const [filter, setFilter] = useState<"all" | "handbag" | "textile">("all");
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);

  const filteredItems = portfolioItems.filter(
    (item) => filter === "all" || item.category === filter
  );

  const scrollToContact = (subject: string) => {
    const element = document.querySelector("#contact");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="portfolio" className="bg-warm-beige py-20 md:py-32">
      <div className="section-container">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-5xl text-ink-dark mb-4">
            Collections grown from pure mycelium
          </h2>
          <p className="font-body text-lg text-ink-dark/70 max-w-2xl mx-auto">
            Each piece embodies quiet, enduring beauty—handcrafted from nature's intelligence.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex justify-center gap-4 mb-12">
          {[
            { value: "all", label: "All" },
            { value: "handbag", label: "Handbags" },
            { value: "textile", label: "Textiles" },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value as typeof filter)}
              className={`px-6 py-2 rounded-lg font-ui text-sm uppercase tracking-wide transition-all duration-300 focus-ring ${
                filter === value
                  ? "bg-cognac text-ink-light"
                  : "bg-transparent border border-ink-dark/20 text-ink-dark hover:bg-ink-dark/5"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Portfolio Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="group text-left focus-ring rounded-xl overflow-hidden"
            >
              <div className="aspect-[4/5] overflow-hidden rounded-xl bg-white card-shadow">
                <img
                  src={item.coverImage}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="pt-4 space-y-2">
                <h3 className="font-display text-xl text-ink-dark group-hover:text-cognac transition-colors">
                  {item.name}
                </h3>
                <p className="font-body text-sm text-ink-dark/70 line-clamp-2">
                  {item.blurb}
                </p>
                <div className="font-ui text-sm text-cognac">
                  Inquire →
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Portfolio Item Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-deep-burgundy/95 backdrop-blur-md p-4 animate-fade-in overflow-y-auto"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="relative bg-warm-beige rounded-xl max-w-4xl w-full my-8 card-shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedItem(null)}
              className="sticky top-4 float-right m-4 p-2 rounded-lg bg-ink-dark/10 hover:bg-ink-dark/20 transition-colors z-10 focus-ring"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 text-ink-dark" />
            </button>

            <div className="p-8 space-y-8">
              {/* Gallery */}
              <div className="grid grid-cols-1 gap-4">
                {selectedItem.gallery.map((image, index) => (
                  <div key={index} className="aspect-video rounded-lg overflow-hidden">
                    <img
                      src={image}
                      alt={`${selectedItem.name} view ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>

              {/* Details */}
              <div>
                <h3 className="font-display text-3xl text-ink-dark mb-3">
                  {selectedItem.name}
                </h3>
                <p className="font-body text-lg text-ink-dark/80 mb-6">
                  {selectedItem.blurb}
                </p>

                <div className="space-y-4">
                  {selectedItem.specs.dimensions && (
                    <div>
                      <h4 className="font-ui text-xs uppercase tracking-wide text-ink-dark/60 mb-1">
                        Dimensions & Weight
                      </h4>
                      <p className="font-body text-sm text-ink-dark">
                        {selectedItem.specs.dimensions} • {selectedItem.specs.weight}
                      </p>
                    </div>
                  )}
                  <div>
                    <h4 className="font-ui text-xs uppercase tracking-wide text-ink-dark/60 mb-1">
                      Materials
                    </h4>
                    <p className="font-body text-sm text-ink-dark">
                      {selectedItem.specs.materials}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-ui text-xs uppercase tracking-wide text-ink-dark/60 mb-1">
                      Features
                    </h4>
                    <p className="font-body text-sm text-ink-dark">
                      {selectedItem.specs.features}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-ui text-xs uppercase tracking-wide text-ink-dark/60 mb-1">
                      Care & Afterlife
                    </h4>
                    <p className="font-body text-sm text-ink-dark">
                      Wipe clean with damp cloth; store in cool, dry place. Fully compostable at end of life (90-180 days in industrial composting).
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedItem(null);
                  scrollToContact(`Inquiry: ${selectedItem.name}`);
                }}
                className="w-full py-3 px-6 rounded-lg bg-cognac text-ink-light font-ui font-medium hover:opacity-90 transition-opacity focus-ring"
              >
                Inquire about this piece
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

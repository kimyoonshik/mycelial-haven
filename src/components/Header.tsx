import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "About", href: "#about" },
  { name: "Materials", href: "#materials" },
  { name: "Portfolio", href: "#portfolio" },
  { name: "Process", href: "#process" },
  { name: "Sustainability", href: "#sustainability" },
  { name: "Contact", href: "#contact" },
];

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsOpen(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-deep-burgundy/95 backdrop-blur-sm border-b border-border/20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#hero" className="font-display text-xl font-semibold tracking-tight text-foreground">
            MYCERRA
          </a>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="focus-ring"
            aria-label="Toggle navigation"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="ml-2 font-ui text-sm uppercase tracking-wide">Explore</span>
          </Button>
        </div>
      </header>

      {/* Overlay Menu */}
      <div
        className={`fixed inset-0 z-40 bg-deep-burgundy/98 backdrop-blur-md transition-all duration-500 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <nav className="flex items-center justify-center min-h-screen">
          <ul className="space-y-6 text-center">
            {navigation.map((item) => (
              <li key={item.name}>
                <button
                  onClick={() => scrollToSection(item.href)}
                  className="font-display text-3xl md:text-4xl text-foreground hover:text-cognac transition-colors duration-350 focus-ring"
                >
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
};

import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Materials } from "@/components/Materials";
import { Portfolio } from "@/components/Portfolio";
import { Process } from "@/components/Process";
import { Sustainability } from "@/components/Sustainability";
import { Press } from "@/components/Press";
import { Contact } from "@/components/Contact";

const Index = () => {
  return (
    <div className="w-full">
      <Header />
      <main>
        <Hero />
        <About />
        <Materials />
        <Portfolio />
        <Process />
        <Sustainability />
        <Press />
        <Contact />
      </main>
      
      <footer className="bg-deep-burgundy border-t border-foreground/10 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="font-ui text-sm text-foreground/60">
            © 2025 MYCERRA. Born from nature's intelligence—crafted purely from mycelium.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

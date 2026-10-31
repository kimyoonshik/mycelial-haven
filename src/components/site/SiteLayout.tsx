import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { company } from "@/content/mycerra";
import { Container } from "./primitives";

const nav = [
  { to: "/mycerra", label: "Mycerra™" },
  { to: "/technology", label: "Technology" },
  { to: "/impact", label: "Impact" },
  { to: "/work-with-us", label: "Work with us" },
];

const SiteHeader = () => {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  // 홈 첫 화면(전면 사진) 위에서만 투명 헤더
  const overHero = pathname === "/" && !scrolled && !open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-500",
        overHero ? "bg-transparent text-white" : "border-b border-mc-line/70 bg-mc-paper/90 text-mc-ink backdrop-blur",
      )}
    >
      <Container className="flex h-16 items-center justify-between">
        <Link to="/" className="font-mc-serif text-xl tracking-tight">
          Mycerra<span className="align-super text-[10px]">™</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "font-mc-sans text-[13px] transition-opacity hover:opacity-100",
                  isActive ? "opacity-100" : "opacity-70",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          <Link
            to="/work-with-us#inquiry"
            className={cn(
              "rounded-full px-4 py-2 font-mc-sans text-[13px] transition-colors",
              overHero ? "bg-white/15 hover:bg-white/25" : "bg-mc-ink text-mc-paper hover:bg-mc-burgundy",
            )}
          >
            Request swatches
          </Link>
        </nav>

        <button
          type="button"
          className="md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </Container>

      {open && (
        <nav className="border-t border-mc-line bg-mc-paper md:hidden">
          <Container className="flex flex-col py-4">
            {nav.map((item) => (
              <NavLink key={item.to} to={item.to} className="py-3 font-mc-serif text-2xl">
                {item.label}
              </NavLink>
            ))}
            <Link to="/work-with-us#inquiry" className="py-3 font-mc-serif text-2xl text-mc-burgundy">
              Request swatches
            </Link>
          </Container>
        </nav>
      )}
    </header>
  );
};

const SiteFooter = () => (
  <footer className="bg-mc-ink text-mc-paper">
    <Container className="grid gap-12 py-16 md:grid-cols-12">
      <div className="md:col-span-5">
        <p className="font-mc-serif text-3xl font-light leading-tight">
          Grown, not manufactured.
          <br />
          <span className="text-mc-paper/50">Pure mycelium — no compromise.</span>
        </p>
      </div>
      <div className="font-mc-sans text-sm md:col-span-3">
        <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-mc-paper/50">Explore</p>
        <ul className="space-y-2">
          {nav.map((item) => (
            <li key={item.to}>
              <Link to={item.to} className="opacity-80 hover:opacity-100">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="font-mc-sans text-sm md:col-span-4">
        <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-mc-paper/50">Contact</p>
        <a href={`mailto:${company.email}`} className="opacity-80 hover:opacity-100">
          {company.email}
        </a>
        <p className="mt-4 text-mc-paper/60">{company.origin}.</p>
      </div>
    </Container>
    <Container className="flex flex-col justify-between gap-2 border-t border-mc-paper/10 py-6 font-mc-sans text-xs text-mc-paper/50 md:flex-row">
      <p>Mycerra™ is a brand of {company.name}</p>
      <p>© {new Date().getFullYear()} {company.name} All rights reserved.</p>
    </Container>
  </footer>
);

const ScrollManager = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      // 레이아웃이 그려진 뒤 앵커로 이동
      requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" }));
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
};

export const SiteLayout = () => {
  // 기본 body 배경(구 사이트 버건디)이 오버스크롤 시 비치지 않도록 교체
  useEffect(() => {
    document.body.classList.add("bg-mc-paper");
    return () => document.body.classList.remove("bg-mc-paper");
  }, []);

  return (
    <div className="min-h-screen bg-mc-paper font-mc-sans text-mc-ink antialiased">
      <ScrollManager />
      <SiteHeader />
      <main>
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
};

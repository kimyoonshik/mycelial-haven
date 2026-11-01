import { useEffect, useState } from "react";
import { SocialLinks } from "@/components/site/Social";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, ShoppingBag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { company, footerCopy } from "@/content/mycerra";
import { pageSections } from "@/content/site";
import { useLang, type L } from "@/i18n/LanguageProvider";
import { useCart } from "@/shop/CartProvider";
import { useRouteSeo } from "@/lib/seo";
import { Container } from "./primitives";

const nav: { to: string; label: L }[] = [
  { to: "/mycerra", label: { en: "Mycerra™", ko: "Mycerra™" } },
  { to: "/technology", label: { en: "Technology", ko: "기술" } },
  { to: "/impact", label: { en: "Impact", ko: "임팩트" } },
  { to: "/shop", label: { en: "Shop", ko: "쇼핑몰" } },
  { to: "/work-with-us", label: { en: "Work with us", ko: "협업 안내" } },
];

const requestLabel: L = { en: "Request swatches", ko: "스와치 요청" };

// 기본 영문, 우측 상단 한/영 전환
const LangToggle = ({ overHero }: { overHero: boolean }) => {
  const { lang, setLang } = useLang();
  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        "flex items-center rounded-full border p-0.5 text-[12px]",
        overHero ? "border-white/40" : "border-mc-ink/20",
      )}
    >
      {(["en", "ko"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            "rounded-full px-2.5 py-1 transition-colors",
            lang === l
              ? overHero
                ? "bg-white text-mc-ink"
                : "bg-mc-ink text-mc-paper"
              : "opacity-70 hover:opacity-100",
          )}
        >
          {l === "en" ? "EN" : "한글"}
        </button>
      ))}
    </div>
  );
};

const CartButton = () => {
  const { lines } = useCart();
  const count = lines.length; // 담긴 품목 수
  const { t } = useLang();
  return (
    <Link to="/shop/cart" className="relative p-1" aria-label={`${t({ en: "Cart", ko: "장바구니" })} (${count})`}>
      <ShoppingBag className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-mc-marigold px-1 text-[10px] font-medium text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
};

const SiteHeader = () => {
  const { pathname } = useLocation();
  const { t } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  // 홈 첫 화면(전면 사진) 위에서만 투명 헤더
  // 홈 첫 섹션이 전면 사진(hero)일 때만 투명 헤더 (운영 도구에서 순서를 바꾸면 일반 헤더)
  const overHero = pathname === "/" && pageSections("home")[0] === "hero" && !scrolled && !open;

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
        "fixed inset-x-0 top-0 z-50 transition-colors duration-500 print:hidden",
        overHero ? "bg-transparent text-white" : "border-b border-mc-line/70 bg-mc-paper/90 text-mc-ink backdrop-blur",
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link to="/" className="font-mc-serif text-2xl tracking-tight">
          Mycerra<span className="align-super text-[10px]">™</span>
        </Link>

        <div className="flex items-center gap-3 lg:gap-7">
          <nav className="hidden items-center gap-7 lg:flex">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn("text-[13px] transition-opacity hover:opacity-100", isActive ? "opacity-100" : "opacity-70")
                }
              >
                {t(item.label)}
              </NavLink>
            ))}
            <Link
              to="/work-with-us#inquiry"
              className={cn(
                "rounded-full px-4 py-2 text-[13px] transition-colors",
                overHero ? "bg-white/15 hover:bg-white/25" : "bg-mc-ink text-mc-paper hover:bg-mc-burgundy",
              )}
            >
              {t(requestLabel)}
            </Link>
          </nav>
          <CartButton />
          <LangToggle overHero={overHero} />
          <button
            type="button"
            className="lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </Container>

      {open && (
        <nav className="border-t border-mc-line bg-mc-paper lg:hidden">
          <Container className="flex flex-col py-4">
            {nav.map((item) => (
              <NavLink key={item.to} to={item.to} className="py-3 font-mc-serif text-2xl">
                {t(item.label)}
              </NavLink>
            ))}
            <Link to="/work-with-us#inquiry" className="py-3 font-mc-serif text-2xl text-mc-burgundy">
              {t(requestLabel)}
            </Link>
          </Container>
        </nav>
      )}
    </header>
  );
};

const SiteFooter = () => {
  const { t } = useLang();
  return (
    <footer className="bg-mc-ink text-mc-paper print:hidden">
      <Container className="grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="font-mc-serif text-3xl leading-tight">
            {t(footerCopy.line1)}
            <br />
            <span className="text-mc-paper/50">{t(footerCopy.line2)}</span>
          </p>
        </div>
        <div className="text-sm md:col-span-3">
          <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-mc-paper/50">
            {t({ en: "Explore", ko: "둘러보기" })}
          </p>
          <ul className="space-y-2">
            {nav.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="opacity-80 hover:opacity-100">
                  {t(item.label)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="text-sm md:col-span-4">
          <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-mc-paper/50">
            {t({ en: "Contact", ko: "연락처" })}
          </p>
          <a href={`mailto:${company.email}`} className="opacity-80 hover:opacity-100">
            {company.email}
          </a>
          <p className="mt-4 text-mc-paper/60">{t(company.origin)}.</p>
          <SocialLinks className="mt-6 text-mc-paper" />
        </div>
      </Container>
      <Container className="flex flex-col justify-between gap-2 border-t border-mc-paper/10 py-6 text-xs text-mc-paper/50 md:flex-row">
        <p>
          {t({ en: `Mycerra™ is a brand of ${company.name}`, ko: `Mycerra™는 ${company.name}의 브랜드입니다` })}
        </p>
        <p>
          © {new Date().getFullYear()} {company.name} All rights reserved.
        </p>
      </Container>
    </footer>
  );
};

const ScrollManager = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    // 페이지를 나눠 불러오므로(lazy) 앵커 요소가 그려질 때까지 최대 3초 기다렸다가 이동
    let frame = 0;
    const started = performance.now();
    const seek = () => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) el.scrollIntoView({ behavior: "smooth" });
      else if (performance.now() - started < 3000) frame = requestAnimationFrame(seek);
    };
    frame = requestAnimationFrame(seek);
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);
  return null;
};

export const SiteLayout = () => {
  useRouteSeo();
  // 기본 body 배경(구 사이트 버건디)이 오버스크롤 시 비치지 않도록 교체
  useEffect(() => {
    document.body.classList.add("bg-mc-paper", "print:bg-white");
    return () => document.body.classList.remove("bg-mc-paper", "print:bg-white");
  }, []);

  return (
    <div className="min-h-screen bg-mc-paper font-mc-sans text-mc-ink antialiased print:bg-white">
      <ScrollManager />
      <SiteHeader />
      <main>
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
};

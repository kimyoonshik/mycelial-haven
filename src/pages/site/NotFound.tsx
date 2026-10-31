import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Container, Display, Eyebrow, PillButton } from "@/components/site/primitives";
import { useCopy } from "@/i18n/LanguageProvider";

const copy = {
  en: { eyebrow: "404", title: "This page could not be found.", body: "The address may have changed when we updated the site.", home: "Go to home", shop: "Visit the shop" },
  ko: { eyebrow: "404", title: "페이지를 찾을 수 없습니다.", body: "사이트 개편으로 주소가 바뀌었을 수 있습니다.", home: "홈으로", shop: "쇼핑몰 가기" },
};

const NotFound = () => {
  const c = useCopy(copy);
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = `404 — Mycerra™`;
    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex";
  }, [pathname]);

  return (
    <Container className="pb-32 pt-40 md:pt-48">
      <Eyebrow>{c.eyebrow}</Eyebrow>
      <Display as="h1" className="mt-5 max-w-3xl text-5xl md:text-7xl">
        {c.title}
      </Display>
      <p className="mt-6 text-[15px] text-mc-mute">
        {c.body} <code className="text-mc-ink">{pathname}</code>
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <PillButton to="/">{c.home}</PillButton>
        <PillButton to="/shop" variant="outline">
          {c.shop}
        </PillButton>
      </div>
    </Container>
  );
};

export default NotFound;

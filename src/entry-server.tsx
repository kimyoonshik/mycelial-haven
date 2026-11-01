// 빌드 시 서버 렌더링 입구 (scripts/prerender.mjs 가 사용).
// 페이지 글자·이미지·링크를 HTML에 미리 담아, 자바스크립트를 실행하지 않는 검색엔진과
// AI 수집기(ChatGPT·Claude·Perplexity 등)도 내용을 읽을 수 있게 한다. 언어는 기본(영문)으로 그린다.
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { LanguageProvider } from "./i18n/LanguageProvider";
import { CartProvider } from "./shop/CartProvider";
import { AppRoutes, type PublicPages } from "./AppRoutes";
import Materials from "./pages/site/Materials";
import Technology from "./pages/site/Technology";
import Impact from "./pages/site/Impact";
import WorkWithUs from "./pages/site/WorkWithUs";
import Shop from "./pages/shop/Shop";
import ProductDetail from "./pages/shop/ProductDetail";
import Cart from "./pages/shop/Cart";
import Checkout from "./pages/shop/Checkout";
import PurchaseOrder from "./pages/shop/PurchaseOrder";
import NotFound from "./pages/site/NotFound";

const pages: PublicPages = { Materials, Technology, Impact, WorkWithUs, Shop, ProductDetail, Cart, Checkout, PurchaseOrder, NotFound };

export const render = (url: string) =>
  renderToString(
    <LanguageProvider>
      <CartProvider>
        <StaticRouter location={url}>
          <AppRoutes pages={pages} />
        </StaticRouter>
      </CartProvider>
    </LanguageProvider>,
  );

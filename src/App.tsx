import { lazy } from "react";
import { BrowserRouter, MemoryRouter, Route } from "react-router-dom";
import { LanguageProvider } from "./i18n/LanguageProvider";
import { CartProvider } from "./shop/CartProvider";
import { AppRoutes, Page, type PublicPages } from "./AppRoutes";

// 첫 화면(홈)만 즉시 불러오고, 나머지 페이지는 이동할 때 내려받는다
const pages: PublicPages = {
  Materials: lazy(() => import("./pages/site/Materials")),
  Technology: lazy(() => import("./pages/site/Technology")),
  Impact: lazy(() => import("./pages/site/Impact")),
  WorkWithUs: lazy(() => import("./pages/site/WorkWithUs")),
  Shop: lazy(() => import("./pages/shop/Shop")),
  ProductDetail: lazy(() => import("./pages/shop/ProductDetail")),
  Cart: lazy(() => import("./pages/shop/Cart")),
  Checkout: lazy(() => import("./pages/shop/Checkout")),
  PurchaseOrder: lazy(() => import("./pages/shop/PurchaseOrder")),
  NotFound: lazy(() => import("./pages/site/NotFound")),
};

// 내부 도구: VITE_ENABLE_ADMIN=true 빌드에서만 포함 (공개 빌드에서는 코드째 제거됨)
const ADMIN = import.meta.env.VITE_ENABLE_ADMIN === "true";
const InvoiceGenerator = ADMIN ? lazy(() => import("./pages/admin/InvoiceGenerator")) : null;
const ContentManager = ADMIN ? lazy(() => import("./pages/admin/ContentManager")) : null;
// 이전 단일 페이지 버전 — 개발 서버에서만 비교용으로 제공
const Legacy = import.meta.env.DEV ? lazy(() => import("./pages/Index")) : null;

// 주소 경로를 쓸 수 없는 미리보기(예: 공유용 임시 페이지)에서는 VITE_ROUTER=memory 로 빌드한다
const Router = import.meta.env.VITE_ROUTER === "memory" ? MemoryRouter : BrowserRouter;

const App = () => (
  <LanguageProvider>
    <CartProvider>
      <Router>
        <AppRoutes
          pages={pages}
          extra={
            <>
              {InvoiceGenerator && <Route path="/admin/invoice" element={<Page><InvoiceGenerator /></Page>} />}
              {ContentManager && <Route path="/admin/content" element={<Page><ContentManager /></Page>} />}
              {Legacy && <Route path="/legacy" element={<Page><Legacy /></Page>} />}
            </>
          }
        />
      </Router>
    </CartProvider>
  </LanguageProvider>
);

export default App;

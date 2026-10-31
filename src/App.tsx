import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, MemoryRouter, Routes, Route } from "react-router-dom";
import { SiteLayout } from "./components/site/SiteLayout";
import Home from "./pages/site/Home";
import { LanguageProvider } from "./i18n/LanguageProvider";
import { CartProvider } from "./shop/CartProvider";

// 첫 화면(홈)만 즉시 불러오고, 나머지 페이지는 이동할 때 내려받는다
const Materials = lazy(() => import("./pages/site/Materials"));
const Technology = lazy(() => import("./pages/site/Technology"));
const Impact = lazy(() => import("./pages/site/Impact"));
const WorkWithUs = lazy(() => import("./pages/site/WorkWithUs"));
const Shop = lazy(() => import("./pages/shop/Shop"));
const ProductDetail = lazy(() => import("./pages/shop/ProductDetail"));
const Cart = lazy(() => import("./pages/shop/Cart"));
const Checkout = lazy(() => import("./pages/shop/Checkout"));
const PurchaseOrder = lazy(() => import("./pages/shop/PurchaseOrder"));
const NotFound = lazy(() => import("./pages/site/NotFound"));

// 내부 도구: VITE_ENABLE_ADMIN=true 빌드에서만 포함 (공개 빌드에서는 코드째 제거됨)
const ADMIN = import.meta.env.VITE_ENABLE_ADMIN === "true";
const InvoiceGenerator = ADMIN ? lazy(() => import("./pages/admin/InvoiceGenerator")) : null;
const ContentManager = ADMIN ? lazy(() => import("./pages/admin/ContentManager")) : null;
// 이전 단일 페이지 버전 — 개발 서버에서만 비교용으로 제공
const Legacy = import.meta.env.DEV ? lazy(() => import("./pages/Index")) : null;

// 주소 경로를 쓸 수 없는 미리보기(예: 공유용 임시 페이지)에서는 VITE_ROUTER=memory 로 빌드한다
const Router = import.meta.env.VITE_ROUTER === "memory" ? MemoryRouter : BrowserRouter;

const Page = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<div className="min-h-screen" />}>{children}</Suspense>
);

const App = () => (
  <LanguageProvider>
    <CartProvider>
      <Router>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/mycerra" element={<Page><Materials /></Page>} />
            <Route path="/technology" element={<Page><Technology /></Page>} />
            <Route path="/impact" element={<Page><Impact /></Page>} />
            <Route path="/work-with-us" element={<Page><WorkWithUs /></Page>} />
            <Route path="/shop" element={<Page><Shop /></Page>} />
            <Route path="/shop/p/:sku" element={<Page><ProductDetail /></Page>} />
            <Route path="/shop/cart" element={<Page><Cart /></Page>} />
            <Route path="/shop/checkout" element={<Page><Checkout /></Page>} />
            <Route path="/shop/po" element={<Page><PurchaseOrder /></Page>} />
            <Route path="*" element={<Page><NotFound /></Page>} />
          </Route>
          {InvoiceGenerator && <Route path="/admin/invoice" element={<Page><InvoiceGenerator /></Page>} />}
          {ContentManager && <Route path="/admin/content" element={<Page><ContentManager /></Page>} />}
          {Legacy && <Route path="/legacy" element={<Page><Legacy /></Page>} />}
        </Routes>
      </Router>
    </CartProvider>
  </LanguageProvider>
);

export default App;

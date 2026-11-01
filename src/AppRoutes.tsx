// 공개 사이트의 주소 ↔ 화면 연결. 브라우저(App.tsx, 나눠 불러오기)와 빌드 시 서버 렌더링(entry-server.tsx, 바로 불러오기)이
// 같은 구조를 쓰도록 한 곳에서 정의한다 — 구조가 다르면 미리 그린 HTML을 이어받지 못한다.
import { Suspense, type ComponentType, type ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import { SiteLayout } from "./components/site/SiteLayout";
import Home from "./pages/site/Home";

export interface PublicPages {
  Materials: ComponentType;
  Technology: ComponentType;
  Impact: ComponentType;
  WorkWithUs: ComponentType;
  Shop: ComponentType;
  ProductDetail: ComponentType;
  Cart: ComponentType;
  Checkout: ComponentType;
  PurchaseOrder: ComponentType;
  NotFound: ComponentType;
}

export const Page = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<div className="min-h-screen" />}>{children}</Suspense>
);

export const AppRoutes = ({ pages: P, extra }: { pages: PublicPages; extra?: ReactNode }) => (
  <Routes>
    <Route element={<SiteLayout />}>
      <Route path="/" element={<Home />} />
      <Route path="/mycerra" element={<Page><P.Materials /></Page>} />
      <Route path="/technology" element={<Page><P.Technology /></Page>} />
      <Route path="/impact" element={<Page><P.Impact /></Page>} />
      <Route path="/work-with-us" element={<Page><P.WorkWithUs /></Page>} />
      <Route path="/shop" element={<Page><P.Shop /></Page>} />
      <Route path="/shop/p/:sku" element={<Page><P.ProductDetail /></Page>} />
      <Route path="/shop/cart" element={<Page><P.Cart /></Page>} />
      <Route path="/shop/checkout" element={<Page><P.Checkout /></Page>} />
      <Route path="/shop/po" element={<Page><P.PurchaseOrder /></Page>} />
      <Route path="*" element={<Page><P.NotFound /></Page>} />
    </Route>
    {extra}
  </Routes>
);

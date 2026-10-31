import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { SiteLayout } from "./components/site/SiteLayout";
import Home from "./pages/site/Home";
import Materials from "./pages/site/Materials";
import Technology from "./pages/site/Technology";
import Impact from "./pages/site/Impact";
import WorkWithUs from "./pages/site/WorkWithUs";
import Shop from "./pages/shop/Shop";
import ProductDetail from "./pages/shop/ProductDetail";
import Cart from "./pages/shop/Cart";
import Checkout from "./pages/shop/Checkout";
import PurchaseOrder from "./pages/shop/PurchaseOrder";
import { lazy, Suspense } from "react";
import { LanguageProvider } from "./i18n/LanguageProvider";

// 내부 인보이스 작성기: VITE_ENABLE_ADMIN=true 빌드에서만 포함 (공개 빌드에서는 코드째 제거됨)
const InvoiceGenerator =
  import.meta.env.VITE_ENABLE_ADMIN === "true" ? lazy(() => import("./pages/admin/InvoiceGenerator")) : null;
import { CartProvider } from "./shop/CartProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <LanguageProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<SiteLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/mycerra" element={<Materials />} />
                <Route path="/technology" element={<Technology />} />
                <Route path="/impact" element={<Impact />} />
                <Route path="/work-with-us" element={<WorkWithUs />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/shop/p/:sku" element={<ProductDetail />} />
                <Route path="/shop/cart" element={<Cart />} />
                <Route path="/shop/checkout" element={<Checkout />} />
                <Route path="/shop/po" element={<PurchaseOrder />} />
              </Route>
              {InvoiceGenerator && (
                <Route
                  path="/admin/invoice"
                  element={
                    <Suspense fallback={null}>
                      <InvoiceGenerator />
                    </Suspense>
                  }
                />
              )}
              {/* 이전 단일 페이지 버전 — 비교용 */}
              <Route path="/legacy" element={<Index />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

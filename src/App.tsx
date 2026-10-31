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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/mycerra" element={<Materials />} />
            <Route path="/technology" element={<Technology />} />
            <Route path="/impact" element={<Impact />} />
            <Route path="/work-with-us" element={<WorkWithUs />} />
          </Route>
          {/* 이전 단일 페이지 버전 — 비교용 */}
          <Route path="/legacy" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

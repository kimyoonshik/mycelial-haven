import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { endHydration, startedFromServerHtml } from "./lib/hydration";

const root = document.getElementById("root")!;
// 미리 그린 HTML이 있으면 이어받고(깜빡임 없음), 없으면(장바구니·결제 등) 새로 그린다.
// 필터가 붙은 주소(?cat=… 등)는 미리 그린 HTML이 필터 전 화면이라 React가 해당 부분을 다시 그린다 — 정상 동작이므로 기록하지 않는다.
if (startedFromServerHtml) {
  hydrateRoot(root, <App />, {
    onRecoverableError: (error) => {
      if (!window.location.search) console.error(error);
    },
  });
  // 첫 화면(나눠 받는 페이지 포함)이 붙을 시간을 둔 뒤 일반 동작으로
  window.setTimeout(endHydration, 2000);
} else {
  createRoot(root).render(<App />);
}

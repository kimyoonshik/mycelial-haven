// 서버에서 미리 그린 HTML(prerender)을 브라우저가 이어받는 중인지 여부.
// 이어받는 첫 화면은 서버 결과와 똑같이 그려야 하므로, 브라우저에만 있는 값(저장된 언어·장바구니)은
// 화면이 붙은 뒤(useEffect)에 반영한다.
export const startedFromServerHtml =
  typeof document !== "undefined" && !!document.getElementById("root")?.hasAttribute("data-ssr");

export const isServer = typeof window === "undefined";

// 첫 화면을 이어받는 동안만 true — 이후 페이지 이동에서는 등장 애니메이션을 그대로 쓴다
let hydrating = startedFromServerHtml;
export const isHydrating = () => hydrating;
export const endHydration = () => {
  hydrating = false;
};

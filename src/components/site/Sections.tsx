import type { ReactNode } from "react";
import { pageSections, type PageId } from "@/content/site";

// 운영 도구에서 정한 순서·표시 여부대로 섹션을 그린다.
// 각 섹션은 id="sec-<섹션ID>" 로 감싸 운영 도구 미리보기가 해당 위치로 이동할 수 있게 한다.
// 머리글 높이를 고려한 첫 화면 섹션(intro/hero)이 숨겨지면, 첫 섹션이 머리글에 가리지 않도록 위 여백을 준다.
const OPENERS = new Set(["intro", "hero"]);

export const Sections = ({ page, sections }: { page: PageId; sections: Record<string, ReactNode> }) => {
  const ids = pageSections(page).filter((id) => id in sections);
  return (
    <>
      {ids.map((id, i) => (
        <div
          key={id}
          id={`sec-${id}`}
          data-section={id}
          className={i === 0 && !OPENERS.has(id) ? "scroll-mt-16 pt-16" : "scroll-mt-16"}
        >
          {sections[id]}
        </div>
      ))}
    </>
  );
};

# REA Site Cloner

웹사이트를 **오프라인에서 열람 가능한 정적 사본**으로 복제하는 CLI 도구입니다.
레퍼런스 사이트 구조·디자인 분석, 자사 사이트 백업/아카이브, 오프라인 데모용으로 사용합니다.

## 빠른 시작

```sh
npm run clone -- https://example.com
# 결과: clones/example.com/index.html
```

SPA(React 등 JS로 화면을 그리는 사이트)는 `--render`를 붙여 브라우저 렌더링 결과를 저장합니다.

```sh
npm run clone -- https://example.com --render --depth 1
```

## 옵션

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `--out <dir>` | `clones/<host>` | 출력 폴더 |
| `--depth <n>` | `2` | 같은 도메인 링크 추적 깊이 (0 = 시작 페이지만) |
| `--max-pages <n>` | `50` | 최대 수집 페이지 수 |
| `--max-assets <n>` | `2000` | 최대 에셋 수 |
| `--delay <ms>` | `300` | 요청 간 최소 간격 (서버 부하 방지) |
| `--render` | 꺼짐 | Playwright(Chromium)로 JS 실행 후 HTML 저장 |
| `--user-agent <ua>` | fetch: `REA-SiteCloner/1.0` 포함 UA / `--render`: Chromium 기본값 | User-Agent |

## 동작 방식

1. **robots.txt 확인**: `Disallow` 경로는 수집하지 않습니다.
2. **페이지 크롤링(BFS)**: 시작 URL과 같은 origin의 `<a href>`를 `--depth`, `--max-pages` 범위 안에서 따라갑니다.
3. **에셋 수집**: HTML의 `src`/`href`/`srcset`/`poster`/인라인 `style`/`<style>`, CSS의 `url()`·`@import`를 재귀적으로 내려받습니다. 외부 CDN 에셋은 `_ext/<host>/` 아래에 저장됩니다.
4. **링크 재작성**: 모든 참조를 상대경로로 바꿔 `file://`로 열어도 동작하게 합니다.
   - 복제하지 않은 페이지 링크는 원본 절대 URL로 남깁니다.
   - 재작성으로 무효가 되는 `integrity`(SRI)·`crossorigin` 속성과 `<base>` 태그는 제거합니다.
   - `canonical`/`alternate` 등 문서 메타 링크는 원본 URL을 유지합니다.
5. **매니페스트**: `_clone-manifest.json`에 페이지·에셋 매핑과 실패 목록을 기록합니다.

## 경로 규칙

| 원본 URL | 로컬 파일 |
|----------|-----------|
| `/` | `index.html` |
| `/about/` 또는 `/about` | `about/index.html` |
| `/page.html?x=1` | `page_<hash>.html` |
| `https://cdn.other.com/a.js` | `_ext/cdn.other.com/a.js` |

## 한계

- HTML 파싱은 정규식 기반이라 비정형 마크업에서는 일부 참조가 누락될 수 있습니다.
- JS가 실행 중 동적으로 불러오는 리소스(fetch/XHR, 지연 로딩 청크)는 `--render`를 써도 일부만 수집됩니다.
- 로그인이 필요한 페이지, 폼 제출, 서버 API는 복제되지 않습니다.

## 사용 시 유의사항

- 복제본은 **내부 분석·아카이브 용도**로만 사용하십시오. 타사 사이트의 텍스트·이미지·로고·상표는 저작권/상표권 대상이므로 그대로 재배포하거나 자사 사이트로 게시하지 마십시오.
- 레퍼런스 사이트를 참고해 MYCERRA 사이트를 만들 때는 **레이아웃·구조만 참고**하고 콘텐츠와 브랜드 자산은 자체 제작물로 교체해야 합니다.
- 대상 서버에 부담을 주지 않도록 `--delay`를 낮추지 마십시오.

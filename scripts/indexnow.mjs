// 게시 후 실행: 사이트의 모든 공개 주소를 IndexNow 로 알린다 (Bing·Naver·Yandex 등이 즉시 다시 수집).
// ChatGPT 검색 등은 Bing 색인을 함께 쓰므로 새 상품·소식을 빠르게 노출하는 데 도움이 된다.
// 사용: npm run indexnow   (정식 주소 www.saveearth.kr 에 게시된 뒤에만 실행)
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seo = JSON.parse(readFileSync(join(root, "src/content/data/seo.json"), "utf8"));
const sitemap = readFileSync(join(root, "dist/sitemap.xml"), "utf8");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => u.startsWith(seo.siteUrl));
const host = new URL(seo.siteUrl).host;

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key: seo.indexNowKey, keyLocation: `${seo.siteUrl}/${seo.indexNowKey}.txt`, urlList: urls }),
});
console.log(`IndexNow: ${urls.length}개 주소 전송 → 응답 ${res.status} ${res.status === 200 || res.status === 202 ? "(접수됨)" : "(확인 필요: 키 파일이 사이트에 게시됐는지 확인)"}`);

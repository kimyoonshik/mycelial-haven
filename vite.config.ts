import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mycerraContent } from "./cms/plugin";
import { existsSync } from "fs";
import type { Plugin } from "vite";

// 미리보기(npm run site · 사이트 보기 실행 파일)에서도 실제 호스팅처럼 /technology → dist/technology/index.html 을 응답
const pageFiles = (): Plugin => ({
  name: "mycerra-page-files",
  configurePreviewServer(server) {
    server.middlewares.use((req, _res, next) => {
      const [pathname, query] = (req.url ?? "/").split("?");
      if (pathname !== "/" && !path.extname(pathname)) {
        const file = path.join(server.config.build.outDir, decodeURIComponent(pathname), "index.html");
        if (existsSync(file)) req.url = `${pathname.replace(/\/$/, "")}/index.html${query ? `?${query}` : ""}`;
      }
      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode, isSsrBuild }) => ({
  // 서버 렌더링 빌드(dist-ssr)에는 사진 등 public 파일을 복사하지 않는다
  publicDir: isSsrBuild ? false : "public",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mycerraContent(__dirname), pageFiles(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

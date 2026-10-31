// Mycerra 콘텐츠 관리 (Vite 플러그인)
//
// 1) 모든 빌드: src/content/data/*.json 을 검사해 오류가 있으면 빌드를 멈춘다 (깨진 데이터가 배포되지 않도록).
// 2) `npm run cms` (vite --mode cms 개발 서버): 운영 도구(/admin/content)가 쓰는 로컬 API를 연다.
//    - 이 PC(127.0.0.1)에서만 접속 가능, 실행할 때마다 바뀌는 토큰이 있어야 요청을 받는다 (다른 웹사이트가 호출 불가)
//    - 저장 전 전체 검사, 저장 시 이전 파일을 .cms-backups/ 에 보관

import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join, resolve, sep } from "node:path";
import type { Plugin } from "vite";
import { collections, validateContent, type CollectionName, type ContentSet } from "../src/content/schema";

const NAMES = Object.keys(collections) as CollectionName[];
const MEDIA_FOLDERS = { materials: /\.(webp|jpe?g|png)$/i, products: /\.(webp|jpe?g|png)$/i, reports: /\.pdf$/i } as const;
type MediaFolder = keyof typeof MEDIA_FOLDERS;
const MAX_UPLOAD = 8 * 1024 * 1024;

export const mycerraContent = (root: string): Plugin => {
  const dataDir = join(root, "src/content/data");
  const publicDir = join(root, "public");
  const backupDir = join(root, ".cms-backups");
  const fileOf = (name: CollectionName) => join(dataDir, `${name}.json`);
  const readAll = (): ContentSet =>
    Object.fromEntries(NAMES.map((n) => [n, JSON.parse(readFileSync(fileOf(n), "utf8"))])) as unknown as ContentSet;
  const mediaExists = (p: string) => {
    const full = resolve(publicDir, `.${p}`);
    return full.startsWith(publicDir + sep) && existsSync(full);
  };

  let cmsEnabled = false;
  const token = randomBytes(24).toString("hex");

  return {
    name: "mycerra-content",

    config(_, { command, mode }) {
      cmsEnabled = command === "serve" && mode === "cms";
      if (cmsEnabled) {
        return {
          // CMS 모드에서는 이 PC에서만 접속되도록
          server: { host: "127.0.0.1" },
          define: { __CMS_TOKEN__: JSON.stringify(token) },
        };
      }
      return { define: { __CMS_TOKEN__: JSON.stringify("") } };
    },

    // CMS 저장·업로드로 데이터가 바뀌어도 열린 화면을 자동 새로고침하지 않는다
    // (운영 도구의 다른 탭에서 저장하지 않은 수정이 사라지지 않도록). 사이트 미리보기는 새로고침하면 반영된다.
    handleHotUpdate({ file }) {
      if (!cmsEnabled) return;
      if (resolve(file).startsWith(dataDir + sep) || resolve(file).startsWith(join(publicDir, "media") + sep)) return [];
    },

    buildStart() {
      const errors = validateContent(readAll(), mediaExists);
      if (errors.length) this.error(`콘텐츠 검사 실패 (${errors.length}건)\n  - ${errors.join("\n  - ")}`);
    },

    configureServer(server) {
      if (!cmsEnabled) return;

      const send = (res: ServerResponse, status: number, body: unknown) => {
        res.statusCode = status;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(body));
      };
      const readBody = (req: IncomingMessage, limit: number) =>
        new Promise<Buffer>((ok, fail) => {
          const chunks: Buffer[] = [];
          let size = 0;
          req.on("data", (c: Buffer) => {
            size += c.length;
            if (size > limit) {
              fail(new Error(`파일이 너무 큽니다 (최대 ${Math.round(limit / 1024 / 1024)}MB)`));
              req.destroy();
            } else chunks.push(c);
          });
          req.on("end", () => ok(Buffer.concat(chunks)));
          req.on("error", fail);
        });
      const run = (cmd: string, args: string[]) =>
        new Promise<{ code: number; out: string }>((ok) => {
          const p = spawn(cmd, args, { cwd: root, shell: process.platform === "win32" });
          let out = "";
          p.stdout.on("data", (d) => (out += d));
          p.stderr.on("data", (d) => (out += d));
          p.on("close", (code) => ok({ code: code ?? 1, out: out.slice(-6000) }));
          p.on("error", (e) => ok({ code: 1, out: String(e) }));
        });
      const backup = (name: string) => {
        mkdirSync(backupDir, { recursive: true });
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        copyFileSync(fileOf(name as CollectionName), join(backupDir, `${name}-${stamp}.json`));
      };

      server.middlewares.use("/__cms", async (req, res) => {
        // 이 PC에서만, 토큰을 가진 운영 도구에서만
        const addr = req.socket.remoteAddress ?? "";
        if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(addr)) return send(res, 403, { error: "local only" });
        if (req.headers["x-cms-token"] !== token) return send(res, 403, { error: "invalid token" });

        const url = new URL(req.url ?? "/", "http://localhost");
        const [, a, b] = url.pathname.split("/");
        try {
          // 전체 콘텐츠 읽기
          if (req.method === "GET" && a === "content") return send(res, 200, readAll());

          // 컬렉션 저장 (저장 후 전체 검사를 통과해야 기록)
          if (req.method === "PUT" && a === "content" && NAMES.includes(b as CollectionName)) {
            const next = JSON.parse((await readBody(req, 5 * 1024 * 1024)).toString("utf8"));
            const all = { ...readAll(), [b]: next } as ContentSet;
            const errors = validateContent(all, mediaExists);
            if (errors.length) return send(res, 422, { errors });
            backup(b);
            writeFileSync(fileOf(b as CollectionName), `${JSON.stringify(next, null, 2)}\n`);
            return send(res, 200, { ok: true });
          }

          if (req.method === "POST" && a === "validate") return send(res, 200, { errors: validateContent(readAll(), mediaExists) });

          // 미디어 목록·업로드
          if (a === "media" && b in MEDIA_FOLDERS) {
            const folder = b as MediaFolder;
            const dir = join(publicDir, "media", folder);
            mkdirSync(dir, { recursive: true });
            if (req.method === "GET") {
              const files = readdirSync(dir)
                .filter((f) => MEDIA_FOLDERS[folder].test(f))
                .map((f) => ({ path: `/media/${folder}/${f}`, size: statSync(join(dir, f)).size }));
              return send(res, 200, { files });
            }
            if (req.method === "POST") {
              const raw = decodeURIComponent(String(req.headers["x-filename"] ?? ""));
              const name = raw
                .toLowerCase()
                .replace(/[^a-z0-9.\-_]+/g, "-")
                .replace(/^-+|-+$/g, "");
              if (!name || !MEDIA_FOLDERS[folder].test(name))
                return send(res, 400, { error: folder === "reports" ? "PDF 파일만 올릴 수 있습니다" : "webp·jpg·png 이미지만 올릴 수 있습니다" });
              const target = join(dir, name);
              if (existsSync(target) && url.searchParams.get("overwrite") !== "1")
                return send(res, 409, { error: `같은 이름의 파일이 있습니다: ${name}` });
              writeFileSync(target, await readBody(req, MAX_UPLOAD));
              return send(res, 200, { path: `/media/${folder}/${name}` });
            }
          }

          // 빌드 (검사 + 페이지 생성 포함)
          if (req.method === "POST" && a === "build") {
            const r = await run("npm", ["run", "build"]);
            return send(res, 200, { ok: r.code === 0, log: r.out });
          }

          // 게시: 콘텐츠·미디어만 커밋하고 원격 저장소로 푸시 (Lovable·Netlify 등 연동 호스팅이 자동 배포)
          if (a === "git" && b === "status" && req.method === "GET") {
            const branch = await run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
            const status = await run("git", ["status", "--porcelain", "--untracked-files=all", "--", "src/content/data", "public/media"]);
            return send(res, 200, { branch: branch.out.trim(), changes: status.out.trim() });
          }
          if (a === "git" && b === "publish" && req.method === "POST") {
            const { message } = JSON.parse((await readBody(req, 10_000)).toString("utf8") || "{}");
            const msg = String(message || "Update site content").slice(0, 200);
            const errors = validateContent(readAll(), mediaExists);
            if (errors.length) return send(res, 422, { errors });
            const steps = [
              await run("git", ["add", "--", "src/content/data", "public/media"]),
              await run("git", ["commit", "-m", msg]),
              await run("git", ["push"]),
            ];
            if (/nothing to commit/i.test(steps[1].out)) return send(res, 200, { ok: false, log: "게시할 변경 사항이 없습니다." });
            const failed = steps.find((s) => s.code !== 0);
            return send(res, 200, { ok: !failed, log: steps.map((s) => s.out).join("\n") });
          }

          return send(res, 404, { error: "unknown endpoint" });
        } catch (e) {
          return send(res, 400, { error: e instanceof Error ? e.message : String(e) });
        }
      });

      server.httpServer?.once("listening", () => {
        const a = server.httpServer?.address();
        const port = typeof a === "object" && a ? a.port : 8080;
        server.config.logger.info(`\n  Mycerra CMS → http://127.0.0.1:${port}/admin/content\n`);
      });
    },
  };
};

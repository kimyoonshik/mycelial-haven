// 시험용 사이트(new.saveearth.kr) 업로드: 검색 차단 빌드 → 서버로 복사 → 한 번에 교체
// 사용: npm run deploy:staging   (설정: deploy.local.json — deploy.example.json 참고)
// 필요: Windows 10 이상 / Mac 에 기본 포함된 ssh·scp, 서버 접속 키 파일
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cfgPath = join(root, "deploy.local.json");
if (!existsSync(cfgPath)) {
  console.error("\n  [오류] deploy.local.json 이 없습니다. deploy.example.json 을 복사해 서버 정보를 채우세요.\n");
  process.exit(1);
}
const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
for (const k of ["host", "user", "keyFile", "remoteDir", "siteUrl"]) {
  if (!cfg[k]) {
    console.error(`\n  [오류] deploy.local.json 에 "${k}" 값이 없습니다.\n`);
    process.exit(1);
  }
}
if (!existsSync(cfg.keyFile)) {
  console.error(`\n  [오류] 접속 키 파일을 찾지 못했습니다: ${cfg.keyFile}\n`);
  process.exit(1);
}
const dir = cfg.remoteDir.replace(/\/$/, "");
if (!/^\/var\/www\/[\w.-]+$/.test(dir)) {
  console.error(`\n  [오류] remoteDir 는 /var/www/<폴더> 형식이어야 합니다 (안전을 위해): ${dir}\n`);
  process.exit(1);
}
const target = `${cfg.user}@${cfg.host}`;
const sshOpts = ["-i", cfg.keyFile, "-o", "StrictHostKeyChecking=accept-new", "-o", "ConnectTimeout=15"];
const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit", cwd: root, shell: false });

console.log("\n  [1/3] 시험용 사이트 빌드 (검색엔진 차단)...");
run(process.execPath, [join(root, "node_modules/vite/bin/vite.js"), "build", "--mode", "staging"]);
run(process.execPath, [join(root, "node_modules/vite/bin/vite.js"), "build", "--mode", "staging", "--ssr", "src/entry-server.tsx", "--outDir", "dist-ssr"]);
run(process.execPath, [join(root, "scripts/prerender.mjs"), "--staging", cfg.siteUrl]);

console.log(`\n  [2/3] 서버로 복사 (${target}:${dir}.new)...`);
// dist 폴더째 임시 폴더에 올린 뒤 이름을 바꾼다 (Windows·Mac scp 모두 같은 결과)
run("ssh", [...sshOpts, target, `rm -rf '${dir}.tmp' '${dir}.new' && mkdir -p '${dir}.tmp'`]);
run("scp", [...sshOpts, "-r", "-q", join(root, "dist"), `${target}:${dir}.tmp/`]);
run("ssh", [...sshOpts, target, `mv '${dir}.tmp/dist' '${dir}.new' && rmdir '${dir}.tmp'`]);

console.log("\n  [3/3] 새 버전으로 교체 (직전 버전은 .old 로 보관)...");
run("ssh", [...sshOpts, target, `rm -rf '${dir}.old'; if [ -d '${dir}' ]; then mv '${dir}' '${dir}.old'; fi; mv '${dir}.new' '${dir}'`]);

console.log(`\n  완료: ${cfg.siteUrl}  (암호 창이 뜨면 시험용 아이디·암호 입력)\n`);

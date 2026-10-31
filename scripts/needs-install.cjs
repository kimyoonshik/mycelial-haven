// 실행 파일(Mycerra-CMS-*.bat / .command)용: npm install 이 필요한지 판단한다.
// node_modules 가 없거나, git pull 로 package-lock.json 이 바뀌었으면 종료 코드 1 (설치 필요), 아니면 0.
const fs = require("fs");
try {
  const lock = fs.statSync("package-lock.json").mtimeMs;
  const installed = fs.statSync("node_modules/.package-lock.json").mtimeMs;
  process.exit(lock > installed ? 1 : 0);
} catch {
  process.exit(1);
}

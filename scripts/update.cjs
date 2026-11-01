// 실행 파일(Mycerra-*.bat / .command)용: GitHub에서 최신 내용을 받고, 지금 버전을 크게 보여 준다.
// - npm install 이 바꿔 놓은 잠금 파일(package-lock.json 등) 때문에 받기가 막히지 않도록 먼저 되돌린다
// - 운영 도구에서 저장만 하고 게시하지 않은 수정이 있으면 지우지 않고, 무엇이 남아 있는지 알려 준다
const { execFileSync } = require("child_process");
const git = (...a) => execFileSync("git", a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const line = "  ----------------------------------------------";

const AUTO = ["package-lock.json", "bun.lockb"]; // 설치 과정에서 바뀌는 파일 — 되돌려도 안전
let ok = true;
let reason = "";
try {
  // 상태 줄 앞의 공백이 의미를 가지므로 trim 하지 않는다 (" M 파일" → "파일")
  const status = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const dirty = status.split("\n").filter((l) => l.length > 3).map((l) => l.slice(3).replace(/"/g, ""));
  const lockOnly = dirty.filter((f) => AUTO.includes(f));
  if (lockOnly.length) git("checkout", "--", ...lockOnly);
  const others = dirty.filter((f) => !AUTO.includes(f) && !f.startsWith("dist") && !f.startsWith("node_modules"));
  try {
    git("pull", "--ff-only");
  } catch (e) {
    ok = false;
    const msg = String(e.stderr || e.message);
    if (/overwritten|local changes/i.test(msg))
      reason = `게시하지 않은 수정이 있어 최신 내용과 겹칩니다: ${others.join(", ") || "(확인 필요)"}\n  → 운영 도구 [게시] 탭에서 먼저 게시하거나, 담당자에게 문의하세요.`;
    else if (/Could not resolve host|unable to access|timed out|network/i.test(msg)) reason = "인터넷(또는 GitHub) 연결을 확인하세요.";
    else if (/Authentication|denied|403|401/i.test(msg)) reason = "GitHub 로그인이 필요합니다. 명령 프롬프트에서 git pull 을 한 번 실행해 로그인하세요.";
    else if (/dubious ownership/i.test(msg)) reason = "폴더 소유자 확인이 필요합니다. 담당자에게 이 화면을 보내 주세요.";
    else reason = msg.split("\n").slice(0, 3).join(" / ");
  }
} catch (e) {
  ok = false;
  reason = "Git 저장소가 아닙니다. GitHub에서 받은(clone) 폴더 안의 실행 파일인지 확인하세요.";
}

let ver = "";
try {
  ver = git("log", "-1", "--format=%h · %cd · %s", "--date=format:%Y-%m-%d %H:%M");
} catch {}
console.log("");
console.log(line);
if (ok) console.log("   최신 내용 받기: 완료");
else {
  console.log("   [주의] 최신 내용을 받지 못했습니다. 화면이 예전 버전일 수 있습니다.");
  console.log("   이유: " + reason);
}
console.log("   지금 버전: " + ver);
console.log(line);
console.log("");

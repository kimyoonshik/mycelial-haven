// 실행 파일(사이트 보기)용: 같은 Wi-Fi의 휴대폰에서 열 주소와 QR 코드를 보여 준다.
const os = require("os");
const port = Number(process.argv[2] || 8080);

const ips = Object.values(os.networkInterfaces())
  .flat()
  .filter((a) => a && a.family === "IPv4" && !a.internal)
  .map((a) => a.address)
  // 사내 Wi-Fi·유선 주소(사설망)를 앞으로
  .sort((a, b) => Number(/^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))/.test(b)) - Number(/^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))/.test(a)));

console.log("");
if (!ips.length) {
  console.log("  [휴대폰] 이 PC가 네트워크에 연결되어 있지 않아 휴대폰 주소를 만들 수 없습니다.");
  process.exit(0);
}
const url = `http://${ips[0]}:${port}/`;
console.log("  ----------------------------------------------");
console.log("   휴대폰에서 보기 (이 PC와 같은 Wi-Fi에 연결)");
console.log(`   주소: ${url}`);
ips.slice(1).forEach((ip) => console.log(`         http://${ip}:${port}/  (안 열리면 이 주소)`));
console.log("   휴대폰 카메라로 아래 QR 코드를 찍어도 됩니다.");
console.log("  ----------------------------------------------");
try {
  require("qrcode-terminal").generate(url, { small: true }, (qr) => console.log(qr.replace(/^/gm, "   ")));
} catch {
  // QR 모듈이 없으면 주소만 보여 준다
}

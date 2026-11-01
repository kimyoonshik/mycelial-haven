// 실행 파일용: 이 PC의 8080 포트에 이미 서버(운영 도구 또는 사이트 보기)가 떠 있는지 확인한다.
// 떠 있으면 종료 코드 0, 아니면 1.
const net = require("net");
const port = Number(process.argv[2] || 8080);
const sock = net.connect({ host: "127.0.0.1", port });
sock.setTimeout(800);
sock.on("connect", () => { sock.destroy(); process.exit(0); });
sock.on("timeout", () => { sock.destroy(); process.exit(1); });
sock.on("error", () => process.exit(1));

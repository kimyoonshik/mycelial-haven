// 송금 계좌 정보 — 내부 인보이스 작성기(관리자 빌드)에서만 import 한다.
// 공개 사이트 번들에 들어가지 않도록 공개 페이지에서는 절대 import 하지 말 것.
// 국내 원화 계좌: 확정 (2026-10-31). 해외 USD T/T 계좌·PayPal: 추후 결정
// 저장소가 비공개일 때만 이 파일에 계좌를 둔다 — 공개로 바꾸면 계좌번호가 노출되므로 먼저 옮길 것
export const bankAccounts = {
  foreign: {
    label: "USD wire transfer (T/T)",
    bank: "[Bank name]",
    swift: "[SWIFT/BIC]",
    account: "[USD account no.]",
    beneficiary: "SAVE EARTH Inc.",
    bankAddress: "[Bank address]",
  },
  domestic: {
    label: "원화 계좌이체",
    bank: "신협 (Shinhyup)",
    account: "137-015-514188",
    holder: "세이브어스(주)",
  },
};

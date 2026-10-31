// 송금 계좌 정보 — 내부 인보이스 작성기(관리자 빌드)에서만 import 한다.
// 공개 사이트 번들에 들어가지 않도록 공개 페이지에서는 절대 import 하지 말 것.
// TODO(입력 필요): T/T(전신환) 송금 계좌
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
    bank: "[은행명]",
    account: "[계좌번호]",
    holder: "세이브어스(주)",
  },
};

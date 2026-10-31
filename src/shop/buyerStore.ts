import type { Buyer } from "./paypal";

// 결제 페이지에서 입력한 구매자 정보를 발주희망서로 넘기기 위한 세션 저장소
const KEY = "mycerra.buyer";

export const emptyBuyer: Buyer = {
  name: "",
  email: "",
  phone: "",
  country: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  postalCode: "",
};

export const loadBuyer = (): Buyer => {
  try {
    return { ...emptyBuyer, ...JSON.parse(window.sessionStorage.getItem(KEY) ?? "{}") };
  } catch {
    return emptyBuyer;
  }
};

export const saveBuyer = (b: Buyer) => {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(b));
  } catch {
    // 저장 불가 환경에서는 넘기지 않는다
  }
};

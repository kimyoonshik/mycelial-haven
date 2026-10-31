// PayPal JS SDK 로더와 주문 생성 데이터.
//
// 현재 단계(1단계): 브라우저에서 Orders v2 주문을 생성·승인한다. PayPal은 이 방식을 시제품용으로 안내하므로,
// 발송 전에 PayPal 대시보드의 결제 금액이 (장수 × 장당 가격 + 배송비)와 일치하는지 반드시 대조한다 (docs/order-process.md).
// 2단계: createOrder / capture 를 서버 함수(Supabase Edge Function 등)로 옮겨 서버에서 금액을 계산하고
//        결제 완료 웹훅(PAYMENT.CAPTURE.COMPLETED)으로 주문을 기록한다. 이 파일의 buildOrder 를 서버로 옮기면 된다.

import { CURRENCY, orderTotals, sizeDims } from "@/content/commerce";
import { volumeOf, type CartRow } from "./CartProvider";

export interface Buyer {
  name: string;
  email: string;
  phone: string;
  country: string; // ISO 3166-1 alpha-2, 또는 "OTHER"
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
}

// 사용하는 SDK 기능만 최소 타입으로 선언
interface PayPalActions {
  order: {
    create: (body: unknown) => Promise<string>;
    capture: () => Promise<PayPalCapture>;
  };
}
export interface PayPalCapture {
  id: string;
  status: string;
  payer?: { email_address?: string };
  purchase_units?: { payments?: { captures?: { id: string; amount: { value: string } }[] } }[];
}
interface PayPalButtonsOptions {
  style?: Record<string, unknown>;
  createOrder: (data: unknown, actions: PayPalActions) => Promise<string>;
  onApprove: (data: unknown, actions: PayPalActions) => Promise<void>;
  onCancel?: () => void;
  onError?: (err: unknown) => void;
}
export interface PayPalNamespace {
  Buttons: (opts: PayPalButtonsOptions) => { render: (el: HTMLElement) => Promise<void>; close?: () => void };
}

declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

let sdk: Promise<PayPalNamespace> | null = null;

export const loadPayPal = (clientId: string): Promise<PayPalNamespace> => {
  if (window.paypal) return Promise.resolve(window.paypal);
  if (sdk) return sdk;
  sdk = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    const q = new URLSearchParams({ "client-id": clientId, currency: CURRENCY, intent: "capture", components: "buttons" });
    s.src = `https://www.paypal.com/sdk/js?${q}`;
    s.async = true;
    s.onload = () => (window.paypal ? resolve(window.paypal) : reject(new Error("PayPal SDK did not initialise")));
    s.onerror = () => {
      sdk = null;
      reject(new Error("PayPal SDK failed to load"));
    };
    document.head.appendChild(s);
  });
  return sdk;
};

const money = (n: number) => ({ currency_code: CURRENCY, value: n.toFixed(2) });

/** Orders v2 주문 본문. invoice_id 에 주문번호를 넣어 PayPal 거래와 내부 기록을 연결한다 */
export const buildOrder = (ref: string, rows: CartRow[], buyer: Buyer) => {
  const { regularSqft, brochureCount } = volumeOf(rows);
  const t = orderTotals(rows.reduce((n, r) => n + r.lineTotalUSD, 0));
  const hasAddress = buyer.country !== "OTHER";
  return {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: ref,
        invoice_id: ref,
        // 출고 대조용 물량 요약: 정규원단 면적 / 브로셔 세트 수
        custom_id: `${regularSqft}sqft/${brochureCount}set`,
        description: `Mycerra pure mycelium material — ${regularSqft} sqft regular, ${brochureCount} swatch brochures`.slice(0, 127),
        amount: { ...money(t.total), breakdown: { item_total: money(t.itemTotal), shipping: money(t.shipping) } },
        items: rows.map((r) => ({
          // 예: "Crocodile — Regular 1 150 × 100 cm"
          name: `${r.product.name} — ${r.sizeInfo.label.en} ${sizeDims(r.sizeInfo)}`.slice(0, 127),
          sku: `${r.sku}-${r.size}`,
          quantity: String(r.qty),
          unit_amount: money(r.unitPriceUSD),
          category: "PHYSICAL_GOODS",
        })),
        ...(hasAddress && {
          shipping: {
            name: { full_name: buyer.name.slice(0, 300) },
            address: {
              address_line_1: buyer.address1,
              address_line_2: buyer.address2 || undefined,
              admin_area_2: buyer.city,
              admin_area_1: buyer.state || undefined,
              postal_code: buyer.postalCode,
              country_code: buyer.country,
            },
          },
        }),
      },
    ],
    application_context: {
      brand_name: "Mycerra",
      // 국가 목록에 없는 구매자는 PayPal 계정의 주소를 사용
      shipping_preference: hasAddress ? "SET_PROVIDED_ADDRESS" : "GET_FROM_FILE",
      user_action: "PAY_NOW",
    },
  };
};

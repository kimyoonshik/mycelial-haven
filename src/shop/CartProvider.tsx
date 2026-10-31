import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { priceOf, productBySku, type Product } from "@/content/shop";
import { areaSqft, round2, sizeById, type OrderVolume } from "@/content/commerce";
import type { Size } from "@/content/schema";

// 주문 단위: 상품(SKU) × 원단 크기 × 장수
export interface CartLine {
  sku: string;
  size: string;
  qty: number;
}

export interface CartRow extends CartLine {
  product: Product;
  sizeInfo: Size;
  unitPriceUSD: number; // 장당
  areaSqft: number; // 이 줄의 총 면적
  lineTotalUSD: number;
}

interface CartValue extends OrderVolume {
  lines: CartLine[];
  rows: CartRow[];
  itemTotalUSD: number;
  add: (sku: string, size: string, qty: number) => void;
  setQty: (sku: string, size: string, qty: number) => void;
  remove: (sku: string, size: string) => void;
  clear: () => void;
}

// v3: 판매 단위를 sqft에서 크기별 장수로 바꾸면서 이전 저장 형식과 분리
const STORAGE_KEY = "mycerra.cart.v3";
export const MAX_LINE_QTY = 999;

const clampQty = (n: number) => Math.max(1, Math.min(MAX_LINE_QTY, Math.floor(n)));
const same = (l: CartLine, sku: string, size: string) => l.sku === sku && l.size === size;
const orderable = (sku: string, size: string) => {
  const p = productBySku(sku);
  return p?.status === "available" && p.sizes.some((s) => s.id === size);
};

const readStored = (): CartLine[] => {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    // 카탈로그에서 빠졌거나 주문 불가로 바뀐 품목·크기는 버린다
    return raw.filter(
      (l): l is CartLine =>
        typeof l?.sku === "string" &&
        typeof l?.size === "string" &&
        Number.isInteger(l.qty) &&
        l.qty > 0 &&
        orderable(l.sku, l.size),
    );
  } catch {
    return [];
  }
};

/** 장바구니·발주서 공용: 줄 목록을 가격·면적이 계산된 행으로 */
export const toRows = (lines: CartLine[]): CartRow[] =>
  lines.flatMap((l) => {
    const product = productBySku(l.sku);
    const sizeInfo = sizeById(l.size);
    if (!product || !sizeInfo) return [];
    const unitPriceUSD = priceOf(product, l.size);
    return [
      {
        ...l,
        product,
        sizeInfo,
        unitPriceUSD,
        areaSqft: round2(areaSqft(sizeInfo) * l.qty),
        lineTotalUSD: round2(unitPriceUSD * l.qty),
      },
    ];
  });

/** 정규원단 면적 합계와 샘플 장수 */
export const volumeOf = (rows: CartRow[]): OrderVolume => ({
  regularSqft: round2(rows.filter((r) => r.sizeInfo.kind === "regular").reduce((n, r) => n + r.areaSqft, 0)),
  sampleCount: rows.filter((r) => r.sizeInfo.kind === "sample").reduce((n, r) => n + r.qty, 0),
});

const CartContext = createContext<CartValue | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [lines, setLines] = useState<CartLine[]>(readStored);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // 저장소를 쓸 수 없으면 세션 동안만 유지
    }
  }, [lines]);

  const add = useCallback((sku: string, size: string, qty: number) => {
    if (!orderable(sku, size)) return;
    setLines((prev) => {
      const hit = prev.find((l) => same(l, sku, size));
      if (hit) return prev.map((l) => (l === hit ? { ...l, qty: clampQty(l.qty + qty) } : l));
      return [...prev, { sku, size, qty: clampQty(qty) }];
    });
  }, []);

  const setQty = useCallback((sku: string, size: string, qty: number) => {
    setLines((prev) => prev.map((l) => (same(l, sku, size) ? { ...l, qty: clampQty(qty) } : l)));
  }, []);

  const remove = useCallback(
    (sku: string, size: string) => setLines((prev) => prev.filter((l) => !same(l, sku, size))),
    [],
  );
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(() => {
    const rows = toRows(lines);
    return {
      lines,
      rows,
      ...volumeOf(rows),
      itemTotalUSD: round2(rows.reduce((n, r) => n + r.lineTotalUSD, 0)),
      add,
      setQty,
      remove,
      clear,
    };
  }, [lines, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
};

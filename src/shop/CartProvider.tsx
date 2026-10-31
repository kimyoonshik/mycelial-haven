import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { productBySku, type OrderFormat } from "@/content/shop";

export interface CartLine {
  sku: string;
  format: OrderFormat;
  qty: number;
}

interface CartValue {
  lines: CartLine[];
  count: number;
  add: (sku: string, format: OrderFormat, qty: number) => void;
  setQty: (sku: string, format: OrderFormat, qty: number) => void;
  remove: (sku: string, format: OrderFormat) => void;
  clear: () => void;
}

const STORAGE_KEY = "mycerra.cart";
const MAX_QTY = 999;

const readStored = (): CartLine[] => {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    // 카탈로그에서 빠졌거나 주문 불가로 바뀐 품목은 버린다
    return raw.filter(
      (l): l is CartLine =>
        typeof l?.sku === "string" &&
        (l.format === "swatch" || l.format === "sheet") &&
        Number.isInteger(l.qty) &&
        l.qty > 0 &&
        productBySku(l.sku)?.status === "available",
    );
  } catch {
    return [];
  }
};

const clampQty = (qty: number) => Math.max(1, Math.min(MAX_QTY, Math.floor(qty)));
const sameLine = (l: CartLine, sku: string, format: OrderFormat) => l.sku === sku && l.format === format;

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

  const add = useCallback((sku: string, format: OrderFormat, qty: number) => {
    if (productBySku(sku)?.status !== "available") return;
    setLines((prev) => {
      const hit = prev.find((l) => sameLine(l, sku, format));
      if (hit) return prev.map((l) => (l === hit ? { ...l, qty: clampQty(l.qty + qty) } : l));
      return [...prev, { sku, format, qty: clampQty(qty) }];
    });
  }, []);

  const setQty = useCallback((sku: string, format: OrderFormat, qty: number) => {
    setLines((prev) => prev.map((l) => (sameLine(l, sku, format) ? { ...l, qty: clampQty(qty) } : l)));
  }, []);

  const remove = useCallback((sku: string, format: OrderFormat) => {
    setLines((prev) => prev.filter((l) => !sameLine(l, sku, format)));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({ lines, count: lines.reduce((n, l) => n + l.qty, 0), add, setQty, remove, clear }),
    [lines, add, setQty, remove, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
};

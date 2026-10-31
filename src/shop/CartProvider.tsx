import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { productBySku, unitPriceOf, type Product } from "@/content/shop";
import { round2 } from "@/content/commerce";

// 주문 단위는 sqft (정수)
export interface CartLine {
  sku: string;
  sqft: number;
}

export interface CartRow extends CartLine {
  product: Product;
  unitPriceUSD: number;
  lineTotalUSD: number;
}

interface CartValue {
  lines: CartLine[];
  rows: CartRow[];
  totalSqft: number;
  itemTotalUSD: number;
  add: (sku: string, sqft: number) => void;
  setSqft: (sku: string, sqft: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
}

// v2: 단위를 형태(스와치/시트)에서 sqft로 바꾸면서 이전 저장 형식과 분리
const STORAGE_KEY = "mycerra.cart.v2";
export const MAX_LINE_SQFT = 9999;

const clampSqft = (n: number) => Math.max(1, Math.min(MAX_LINE_SQFT, Math.floor(n)));

const readStored = (): CartLine[] => {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    // 카탈로그에서 빠졌거나 주문 불가로 바뀐 품목은 버린다
    return raw.filter(
      (l): l is CartLine =>
        typeof l?.sku === "string" &&
        Number.isInteger(l.sqft) &&
        l.sqft > 0 &&
        productBySku(l.sku)?.status === "available",
    );
  } catch {
    return [];
  }
};

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

  const add = useCallback((sku: string, sqft: number) => {
    if (productBySku(sku)?.status !== "available") return;
    setLines((prev) => {
      const hit = prev.find((l) => l.sku === sku);
      if (hit) return prev.map((l) => (l === hit ? { ...l, sqft: clampSqft(l.sqft + sqft) } : l));
      return [...prev, { sku, sqft: clampSqft(sqft) }];
    });
  }, []);

  const setSqft = useCallback((sku: string, sqft: number) => {
    setLines((prev) => prev.map((l) => (l.sku === sku ? { ...l, sqft: clampSqft(sqft) } : l)));
  }, []);

  const remove = useCallback((sku: string) => setLines((prev) => prev.filter((l) => l.sku !== sku)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(() => {
    const rows = lines.flatMap((l) => {
      const product = productBySku(l.sku);
      if (!product) return [];
      const unitPriceUSD = unitPriceOf(product);
      return [{ ...l, product, unitPriceUSD, lineTotalUSD: round2(unitPriceUSD * l.sqft) }];
    });
    return {
      lines,
      rows,
      totalSqft: rows.reduce((n, r) => n + r.sqft, 0),
      itemTotalUSD: round2(rows.reduce((n, r) => n + r.lineTotalUSD, 0)),
      add,
      setSqft,
      remove,
      clear,
    };
  }, [lines, add, setSqft, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
};

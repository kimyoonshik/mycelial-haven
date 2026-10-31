import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Price } from "@/components/site/primitives";
import { comingSoonLabel, type Product } from "@/content/shop";
import { useLang } from "@/i18n/LanguageProvider";

/** 실물 사진이 없는 품목의 자리 표시 타일 */
export const ProductImage = ({ product, className }: { product: Product; className?: string }) => {
  const { t } = useLang();
  if (product.image) {
    return (
      <img
        src={product.image}
        alt={`${product.name} ${product.sku}`}
        loading="lazy"
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-2 bg-mc-cream text-mc-mute",
        "bg-[repeating-linear-gradient(135deg,transparent_0_10px,rgba(35,33,29,0.04)_10px_11px)]",
        className,
      )}
    >
      <span className="font-mc-serif text-2xl text-mc-ink/40">{product.sku}</span>
      <span className="text-[10px] uppercase tracking-[0.2em]">{t(comingSoonLabel)}</span>
    </div>
  );
};

export const ProductCard = ({ product }: { product: Product }) => {
  const { t } = useLang();
  const soon = product.status === "coming-soon";
  return (
    <Link to={`/shop/p/${product.sku}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-mc-line">
        <ProductImage product={product} className={soon ? "" : "transition-transform duration-700 group-hover:scale-105"} />
        {soon && product.image && (
          <span className="absolute left-3 top-3 rounded-full bg-mc-paper/90 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em]">
            {t(comingSoonLabel)}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className={cn("font-mc-serif text-lg", soon && "text-mc-mute")}>{product.name}</span>
        <span className="shrink-0 text-[11px] tracking-[0.16em] text-mc-mute">{product.sku}</span>
      </div>
      <p className="mt-0.5 text-xs text-mc-mute">
        {soon ? t(comingSoonLabel) : <Price value={product.price.sheet} />}
      </p>
    </Link>
  );
};

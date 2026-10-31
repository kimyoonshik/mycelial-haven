import { Link } from "react-router-dom";
import { areaSqft, conditions, formatUSD, piecePrice, sizeDims, sizes } from "@/content/commerce";
import { useCopy, useLang } from "@/i18n/LanguageProvider";

const copy = {
  en: { condition: "Condition", perPiece: "Price per piece (USD)", perSqft: "/ sqft" },
  ko: { condition: "가공 조건", perPiece: "장당 가격 (USD)", perSqft: "/ sqft" },
};

// 원단 크기 × 가공 조건 가격표 — commerce.json 의 크기·단가에서 계산
export const PriceMatrix = () => {
  const c = useCopy(copy);
  const { t } = useLang();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-t border-mc-ink text-left text-sm" data-testid="price-matrix">
        <caption className="sr-only">{c.perPiece}</caption>
        <thead>
          <tr className="border-b border-mc-line align-bottom">
            <th className="py-3 pr-4 text-[11px] font-normal uppercase tracking-[0.14em] text-mc-mute">{c.condition}</th>
            {sizes.map((s) => (
              <th key={s.id} className="py-3 pr-4 font-normal">
                <span className="block font-mc-serif text-base text-mc-ink">{t(s.label)}</span>
                <span className="block text-xs text-mc-mute">
                  {sizeDims(s)} · {areaSqft(s).toFixed(2)} sqft
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {conditions.map((cond) => (
            <tr key={cond.id} className="border-b border-mc-line">
              <th scope="row" className="py-3 pr-4 font-normal">
                <Link to={`/shop?cat=${cond.id}`} className="font-mc-serif text-base hover:underline">
                  {t(cond.title)}
                </Link>
                <span className="block text-xs text-mc-mute">
                  {formatUSD(cond.priceUSDPerSqft)} {c.perSqft}
                </span>
              </th>
              {sizes.map((s) => (
                <td key={s.id} className="py-3 pr-4 tabular-nums" data-cell={`${cond.id}:${s.id}`}>
                  {formatUSD(piecePrice(cond.id, s.id))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ProofStatus } from "@/content/mycerra";
import { useLang } from "@/i18n/LanguageProvider";
import { formatUSD } from "@/content/commerce";

export const Container = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("mx-auto w-full max-w-[1400px] px-5 md:px-10", className)}>{children}</div>
);

export const Eyebrow = ({ children, className }: { children: ReactNode; className?: string }) => {
  const { lang } = useLang();
  // 한글은 넓은 자간에서 글자가 흩어져 보이므로 좁힌다
  return (
    <p
      className={cn(
        "font-mc-sans text-[11px] uppercase text-mc-mute",
        lang === "ko" ? "tracking-[0.08em]" : "tracking-[0.22em]",
        className,
      )}
    >
      {children}
    </p>
  );
};

export const Display = ({
  children,
  className,
  as: Tag = "h2",
}: {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) => {
  const { lang } = useLang();
  // tailwind-merge는 뒤에 오는 text-* 크기 클래스가 leading을 지우므로 줄 간격을 마지막에 둔다.
  // 한글 세리프는 받침 때문에 영문보다 넓은 줄 간격이 필요하다.
  return (
    <Tag
      className={cn(
        "font-mc-serif font-light tracking-[-0.01em]",
        className,
        lang === "ko" ? "leading-[1.25]" : "leading-[1.05]",
      )}
    >
      {children}
    </Tag>
  );
};

export const TextLink = ({
  to,
  children,
  className,
  light = false,
}: {
  to: string;
  children: ReactNode;
  className?: string;
  light?: boolean;
}) => (
  <Link
    to={to}
    className={cn(
      "group inline-flex items-center gap-2 border-b pb-1 font-mc-sans text-sm transition-colors",
      light ? "border-white/40 text-white hover:border-white" : "border-mc-ink/30 text-mc-ink hover:border-mc-ink",
      className,
    )}
  >
    {children}
    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
  </Link>
);

export const PillButton = ({
  to,
  href,
  children,
  variant = "dark",
  className,
}: {
  to?: string;
  href?: string;
  children: ReactNode;
  variant?: "dark" | "light" | "outline";
  className?: string;
}) => {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-mc-sans text-sm transition-colors",
    variant === "dark" && "bg-mc-ink text-mc-paper hover:bg-mc-burgundy",
    variant === "light" && "bg-mc-paper text-mc-ink hover:bg-white",
    variant === "outline" && "border border-mc-ink/30 text-mc-ink hover:border-mc-ink",
    className,
  );
  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to ?? "/"} className={cls}>
      {children}
    </Link>
  );
};

const proofLabel = {
  published: { en: "Document available", ko: "문서 공개" },
  "in-preparation": { en: "Document in preparation", ko: "문서 준비 중" },
};

export const ProofBadge = ({ status, light = false }: { status: ProofStatus; light?: boolean }) => {
  const { t } = useLang();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mc-sans text-[10px] uppercase tracking-[0.14em]",
        status === "published"
          ? "border-emerald-700/40 text-emerald-800"
          : light
            ? "border-mc-paper/30 text-mc-paper/60"
            : "border-mc-ink/20 text-mc-mute",
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", status === "published" ? "bg-emerald-700" : "bg-current opacity-60")}
      />
      {t(proofLabel[status])}
    </span>
  );
};

/** USD 가격. 미정(null)이면 "가격 문의", perSqft 이면 "/ sqft" 단위를 붙인다 */
export const Price = ({ value, perSqft = false, className }: { value: number | null; perSqft?: boolean; className?: string }) => {
  const { t } = useLang();
  return (
    <span className={className}>
      {value === null ? t({ en: "Price on request", ko: "가격 문의" }) : `${formatUSD(value)}${perSqft ? " / sqft" : ""}`}
    </span>
  );
};

import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ProofStatus } from "@/content/mycerra";

export const Container = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("mx-auto w-full max-w-[1400px] px-5 md:px-10", className)}>{children}</div>
);

export const Eyebrow = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={cn("font-mc-sans text-[11px] uppercase tracking-[0.22em] text-mc-mute", className)}>{children}</p>
);

export const Display = ({
  children,
  className,
  as: Tag = "h2",
}: {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) => (
  // tailwind-merge는 뒤에 오는 text-* 크기 클래스가 leading을 지우므로 줄 간격을 마지막에 둔다
  <Tag className={cn("font-mc-serif font-light tracking-[-0.01em]", className, "leading-[1.05]")}>{children}</Tag>
);

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

export const ProofBadge = ({ status }: { status: ProofStatus }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mc-sans text-[10px] uppercase tracking-[0.14em]",
      status === "published" ? "border-emerald-700/40 text-emerald-800" : "border-mc-ink/20 text-mc-mute",
    )}
  >
    <span className={cn("h-1.5 w-1.5 rounded-full", status === "published" ? "bg-emerald-700" : "bg-mc-mute/60")} />
    {status === "published" ? "Document available" : "Document in preparation"}
  </span>
);

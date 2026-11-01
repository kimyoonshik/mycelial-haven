import { useState } from "react";
import { Check, Facebook, Instagram, Link2, Linkedin, Share2, Youtube } from "lucide-react";
import seoData from "@/content/data/seo.json";
import type { Seo } from "@/content/schema";
import { cn } from "@/lib/utils";
import { useLang } from "@/i18n/LanguageProvider";

// SNS 계정 주소는 src/content/data/seo.json › social (운영 도구 "SEO" 탭에서 입력). 비어 있으면 표시하지 않는다.
const social = (seoData as Seo).social;

const XLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const NETWORKS = [
  { key: "instagram", label: "Instagram", Icon: Instagram },
  { key: "facebook", label: "Facebook", Icon: Facebook },
  { key: "x", label: "X", Icon: XLogo },
  { key: "linkedin", label: "LinkedIn", Icon: Linkedin },
  { key: "youtube", label: "YouTube", Icon: Youtube },
] as const;

export const socialLinks = NETWORKS.filter((n) => social[n.key]).map((n) => ({ ...n, url: social[n.key] }));

/** 바닥글 등에 놓는 SNS 아이콘 줄 */
export const SocialLinks = ({ className }: { className?: string }) => {
  if (!socialLinks.length) return null;
  return (
    <ul className={cn("flex flex-wrap gap-2", className)} data-testid="social-links">
      {socialLinks.map(({ key, label, url, Icon }) => (
        <li key={key}>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Mycerra on ${label}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-current/20 opacity-80 transition-opacity hover:opacity-100"
          >
            <Icon className="h-4 w-4" />
          </a>
        </li>
      ))}
    </ul>
  );
};

/** 상품·소식 공유 버튼 (X · Facebook · LinkedIn · 링크 복사, 휴대폰은 기본 공유) */
export const ShareButtons = ({ url, title }: { url: string; title: string }) => {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const txt = encodeURIComponent(title);
  const links = [
    { label: "X", href: `https://twitter.com/intent/tweet?url=${u}&text=${txt}`, Icon: XLogo },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, Icon: Facebook },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, Icon: Linkedin },
  ];
  const btn = "flex h-9 w-9 items-center justify-center rounded-full border border-mc-line text-mc-ink transition-colors hover:border-mc-ink";
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="share-buttons">
      <span className="mr-1 text-[11px] uppercase tracking-[0.18em] text-mc-mute">{t({ en: "Share", ko: "공유" })}</span>
      {links.map(({ label, href, Icon }) => (
        <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={`Share on ${label}`} className={btn}>
          <Icon className="h-4 w-4" />
        </a>
      ))}
      <button
        type="button"
        aria-label={t({ en: "Copy link (for Instagram and messengers)", ko: "링크 복사 (인스타그램·메신저용)" })}
        className={btn}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            window.prompt("URL", url);
          }
        }}
      >
        {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      </button>
      {canNativeShare && (
        <button
          type="button"
          aria-label={t({ en: "Share", ko: "공유" })}
          className={btn}
          onClick={() => navigator.share({ title, url }).catch(() => {})}
        >
          <Share2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

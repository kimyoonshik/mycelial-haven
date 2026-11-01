import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { analyticsEnabled, initAnalytics, readConsent, setConsent, trackPageView } from "@/lib/analytics";
import { useLang } from "@/i18n/LanguageProvider";

/** 분석 코드 시작 + 페이지 이동 기록 + 쿠키 동의 배너 (분석 ID가 없으면 아무것도 하지 않음) */
export const Analytics = () => {
  const { pathname, search } = useLocation();
  const { lang, t } = useLang();
  const [askConsent, setAskConsent] = useState(false);

  useEffect(() => {
    if (!analyticsEnabled) return;
    initAnalytics();
    setAskConsent(readConsent() === null);
  }, []);

  useEffect(() => {
    // 제목이 바뀐 뒤 기록되도록 다음 틱에
    const id = window.setTimeout(() => trackPageView(window.location.pathname + search, lang), 0);
    return () => window.clearTimeout(id);
    // 언어 전환만으로는 새 페이지로 기록하지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  if (!askConsent) return null;
  const choose = (c: "granted" | "denied") => {
    setConsent(c);
    setAskConsent(false);
  };
  return (
    <div
      role="dialog"
      aria-label={t({ en: "Cookie preferences", ko: "쿠키 설정" })}
      data-testid="consent-banner"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-mc-line bg-mc-paper/95 px-5 py-4 text-sm text-mc-ink backdrop-blur print:hidden md:px-10"
    >
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="max-w-3xl text-mc-mute">
          {t({
            en: "We use analytics cookies to understand how visitors use this site. No advertising cookies.",
            ko: "사이트 이용 현황을 파악하기 위해 분석 쿠키를 사용합니다. 광고용 쿠키는 쓰지 않습니다.",
          })}
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => choose("denied")} className="rounded-full border border-mc-ink/30 px-5 py-2 hover:border-mc-ink">
            {t({ en: "Decline", ko: "거부" })}
          </button>
          <button type="button" onClick={() => choose("granted")} className="rounded-full bg-mc-ink px-5 py-2 text-mc-paper hover:bg-mc-burgundy">
            {t({ en: "Accept", ko: "동의" })}
          </button>
        </div>
      </div>
    </div>
  );
};

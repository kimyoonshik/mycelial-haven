/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAYPAL_CLIENT_ID?: string;
  readonly VITE_ENABLE_ADMIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// 운영 도구(CMS) API 토큰 — `npm run cms` 개발 서버에서만 값이 들어가고, 그 외 빌드에서는 빈 문자열
declare const __CMS_TOKEN__: string;

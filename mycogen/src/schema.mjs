// Content schema shared by the site builder (src/build.mjs) and the editor (editor/ui).
// One place describes every editable field, so the editor form and the rendered page never drift apart.
//
// Field types
//   i18n       one-line text, Korean + English
//   i18nArea   multi-line text, Korean + English (supports **bold**, [label](url), line breaks)
//   text       one-line text, single value (URLs, IDs, numbers as text)
//   textarea   multi-line text, single value
//   image      media path (content/media/...)
//   link       internal page id (page:<id>) or external URL
//   select     one of `options`
//   number     number
//   toggle     true/false
//   color      #rrggbb
//   list       repeatable items described by `fields`
//   pageRef    id of another page
// `when: { key, not }` hides a field while a sibling field has the given value.

export const LANGS = ['ko', 'en'];
export const LANG_LABEL = { ko: '한국어', en: 'English' };

const ctaFields = [
  { key: 'label', label: '버튼 문구', type: 'i18n' },
  { key: 'link', label: '연결', type: 'link' },
  { key: 'style', label: '모양', type: 'select', options: [['solid', '채움'], ['outline', '외곽선'], ['light', '밝은 배경용']] },
];

export const SECTION_TYPES = {
  hero: {
    label: '히어로(첫 화면)',
    hint: '큰 배경 사진 위 제목. 페이지 맨 위에 둡니다.',
    fields: [
      { key: 'eyebrow', label: '작은 머리글', type: 'i18n' },
      { key: 'title', label: '제목', type: 'i18nArea', rows: 2 },
      { key: 'text', label: '설명', type: 'i18nArea', rows: 3 },
      { key: 'image', label: '배경 사진', type: 'image' },
      { key: 'size', label: '높이', type: 'select', options: [['full', '전체 화면'], ['tall', '높게'], ['medium', '보통']] },
      { key: 'align', label: '정렬', type: 'select', options: [['left', '왼쪽'], ['center', '가운데']] },
      { key: 'overlay', label: '사진 어둡게(0~90)', type: 'number', min: 0, max: 90 },
      { key: 'network', label: '균사 네트워크 그래픽', type: 'toggle' },
      { key: 'buttons', label: '버튼', type: 'list', itemLabel: 'label', max: 3, fields: ctaFields },
    ],
    defaults: { size: 'tall', align: 'left', overlay: 45, network: true, buttons: [] },
  },
  statement: {
    label: '메시지(가운데 큰 문장)',
    hint: '가운데 정렬된 큰 제목과 짧은 설명.',
    fields: [
      { key: 'eyebrow', label: '작은 머리글', type: 'i18n' },
      { key: 'title', label: '제목', type: 'i18nArea', rows: 2 },
      { key: 'text', label: '설명', type: 'i18nArea', rows: 4 },
      { key: 'tone', label: '배경', type: 'select', options: [['paper', '밝은 종이'], ['cream', '크림'], ['white', '흰색']] },
    ],
    defaults: { tone: 'paper' },
  },
  cards: {
    label: '카드 목록',
    hint: '사진 카드 또는 글 카드를 2~4열로 배치.',
    fields: [
      { key: 'eyebrow', label: '작은 머리글', type: 'i18n' },
      { key: 'title', label: '제목', type: 'i18nArea', rows: 2 },
      { key: 'text', label: '설명', type: 'i18nArea', rows: 3 },
      { key: 'source', label: '카드 내용', type: 'select', options: [['items', '직접 입력'], ['business', '사업 페이지에서 자동']] },
      { key: 'style', label: '카드 모양', type: 'select', options: [['photo', '사진 + 알약 라벨'], ['tile', '사진 위 글'], ['text', '글 카드(번호)']] },
      { key: 'columns', label: '열 수', type: 'select', options: [['2', '2열'], ['3', '3열'], ['4', '4열']] },
      { key: 'tone', label: '배경', type: 'select', options: [['paper', '밝은 종이'], ['cream', '크림'], ['white', '흰색'], ['moss', '이끼색'], ['soil', '흙색']] },
      { key: 'items', label: '카드', type: 'list', itemLabel: 'title', when: { key: 'source', not: 'business' }, fields: [
        { key: 'image', label: '사진', type: 'image' },
        { key: 'title', label: '제목/라벨', type: 'i18n' },
        { key: 'text', label: '설명', type: 'i18nArea', rows: 3 },
        { key: 'link', label: '연결', type: 'link' },
      ] },
    ],
    defaults: { source: 'items', style: 'photo', columns: '3', tone: 'paper', items: [] },
  },
  split: {
    label: '사진 + 글(좌우)',
    hint: '한쪽에 사진, 다른 쪽에 설명과 목록.',
    fields: [
      { key: 'eyebrow', label: '작은 머리글', type: 'i18n' },
      { key: 'title', label: '제목', type: 'i18nArea', rows: 2 },
      { key: 'text', label: '본문', type: 'i18nArea', rows: 6 },
      { key: 'bullets', label: '목록', type: 'list', itemLabel: 'text', fields: [
        { key: 'text', label: '항목', type: 'i18n' },
      ] },
      { key: 'image', label: '사진', type: 'image' },
      { key: 'reverse', label: '사진을 왼쪽에', type: 'toggle' },
      { key: 'tone', label: '배경', type: 'select', options: [['paper', '밝은 종이'], ['cream', '크림'], ['white', '흰색']] },
      { key: 'buttons', label: '버튼', type: 'list', itemLabel: 'label', max: 2, fields: ctaFields },
    ],
    defaults: { reverse: false, tone: 'paper', bullets: [], buttons: [] },
  },
  steps: {
    label: '공정·단계',
    hint: '번호가 붙은 순서도. 공정이나 연혁에 사용.',
    fields: [
      { key: 'eyebrow', label: '작은 머리글', type: 'i18n' },
      { key: 'title', label: '제목', type: 'i18nArea', rows: 2 },
      { key: 'text', label: '설명', type: 'i18nArea', rows: 3 },
      { key: 'layout', label: '배치', type: 'select', options: [['row', '가로 흐름'], ['timeline', '세로 연혁']] },
      { key: 'tone', label: '배경', type: 'select', options: [['paper', '밝은 종이'], ['cream', '크림'], ['white', '흰색']] },
      { key: 'items', label: '단계', type: 'list', itemLabel: 'title', fields: [
        { key: 'tag', label: '번호/연도(비우면 자동 번호)', type: 'text' },
        { key: 'title', label: '제목', type: 'i18n' },
        { key: 'text', label: '설명', type: 'i18nArea', rows: 3 },
      ] },
    ],
    defaults: { layout: 'row', tone: 'cream', items: [] },
  },
  stats: {
    label: '숫자 하이라이트',
    hint: '큰 숫자와 짧은 설명 타일.',
    fields: [
      { key: 'eyebrow', label: '작은 머리글', type: 'i18n' },
      { key: 'title', label: '제목', type: 'i18nArea', rows: 2 },
      { key: 'tone', label: '배경', type: 'select', options: [['moss', '이끼색'], ['soil', '흙색'], ['paper', '밝은 종이']] },
      { key: 'items', label: '숫자', type: 'list', itemLabel: 'value', fields: [
        { key: 'value', label: '숫자', type: 'text' },
        { key: 'unit', label: '단위', type: 'i18n' },
        { key: 'label', label: '설명', type: 'i18n' },
      ] },
    ],
    defaults: { tone: 'moss', items: [] },
  },
  specs: {
    label: '정보 표',
    hint: '항목-내용 2열 표. 회사 개요·제품 사양에 사용.',
    fields: [
      { key: 'eyebrow', label: '작은 머리글', type: 'i18n' },
      { key: 'title', label: '제목', type: 'i18nArea', rows: 2 },
      { key: 'text', label: '설명', type: 'i18nArea', rows: 2 },
      { key: 'note', label: '표 아래 주석', type: 'i18nArea', rows: 2 },
      { key: 'tone', label: '배경', type: 'select', options: [['paper', '밝은 종이'], ['cream', '크림'], ['white', '흰색']] },
      { key: 'rows', label: '행', type: 'list', itemLabel: 'label', fields: [
        { key: 'label', label: '항목', type: 'i18n' },
        { key: 'value', label: '내용', type: 'i18nArea', rows: 2 },
      ] },
    ],
    defaults: { tone: 'white', rows: [] },
  },
  band: {
    label: '컬러 띠(강조)',
    hint: '색 배경 위 강조 메시지. 위아래가 균사 가장자리처럼 마감됩니다.',
    fields: [
      { key: 'eyebrow', label: '작은 머리글', type: 'i18n' },
      { key: 'title', label: '제목', type: 'i18nArea', rows: 2 },
      { key: 'text', label: '설명', type: 'i18nArea', rows: 3 },
      { key: 'tone', label: '색', type: 'select', options: [['moss', '이끼색'], ['soil', '흙색'], ['ink', '먹색']] },
      { key: 'items', label: '사진 타일(선택)', type: 'list', itemLabel: 'title', max: 4, fields: [
        { key: 'image', label: '사진', type: 'image' },
        { key: 'title', label: '라벨', type: 'i18n' },
        { key: 'link', label: '연결', type: 'link' },
      ] },
      { key: 'buttons', label: '버튼', type: 'list', itemLabel: 'label', max: 2, fields: ctaFields },
    ],
    defaults: { tone: 'moss', items: [], buttons: [] },
  },
  news: {
    label: '소식 목록',
    hint: '‘소식’ 메뉴에 입력한 글을 최신순으로 보여줍니다.',
    fields: [
      { key: 'eyebrow', label: '작은 머리글', type: 'i18n' },
      { key: 'title', label: '제목', type: 'i18nArea', rows: 2 },
      { key: 'text', label: '설명', type: 'i18nArea', rows: 2 },
      { key: 'limit', label: '최대 개수(0=전체)', type: 'number', min: 0, max: 50 },
      { key: 'more', label: '전체 보기 버튼', type: 'toggle' },
      { key: 'tone', label: '배경', type: 'select', options: [['paper', '밝은 종이'], ['cream', '크림'], ['white', '흰색']] },
    ],
    defaults: { limit: 3, more: true, tone: 'paper' },
  },
  cta: {
    label: '문의 유도',
    hint: '페이지 끝의 행동 유도 영역.',
    fields: [
      { key: 'title', label: '제목', type: 'i18nArea', rows: 2 },
      { key: 'text', label: '설명', type: 'i18nArea', rows: 3 },
      { key: 'buttons', label: '버튼', type: 'list', itemLabel: 'label', max: 2, fields: ctaFields },
    ],
    defaults: { buttons: [] },
  },
  contact: {
    label: '문의 양식',
    hint: '문의 양식과 회사 연락처. 사이트 정보의 이메일로 전송됩니다.',
    fields: [
      { key: 'eyebrow', label: '작은 머리글', type: 'i18n' },
      { key: 'title', label: '제목', type: 'i18nArea', rows: 2 },
      { key: 'text', label: '설명', type: 'i18nArea', rows: 3 },
      { key: 'topics', label: '문의 유형', type: 'list', itemLabel: 'label', fields: [
        { key: 'label', label: '유형', type: 'i18n' },
      ] },
      { key: 'consent', label: '개인정보 동의 문구', type: 'i18nArea', rows: 4 },
    ],
    defaults: { topics: [] },
  },
  richText: {
    label: '자유 글',
    hint: '약관·방침 등 긴 글. 빈 줄로 문단을 나누고, ## 로 소제목을 만듭니다.',
    fields: [
      { key: 'title', label: '제목', type: 'i18nArea', rows: 2 },
      { key: 'body', label: '본문', type: 'i18nArea', rows: 16 },
      { key: 'tone', label: '배경', type: 'select', options: [['paper', '밝은 종이'], ['white', '흰색']] },
    ],
    defaults: { tone: 'white' },
  },
};

export const PAGE_FIELDS = [
  { key: 'navLabel', label: '메뉴 이름', type: 'i18n' },
  { key: 'title', label: '페이지 제목(브라우저 탭·검색결과)', type: 'i18n' },
  { key: 'description', label: '검색결과 설명(120자 내외)', type: 'i18nArea', rows: 3 },
  { key: 'slug', label: '주소(영문 소문자·숫자·-) 예: company', type: 'text' },
  { key: 'parent', label: '상위 페이지(하위 메뉴로 묶기)', type: 'pageRef' },
  { key: 'cardImage', label: '목록 카드 사진', type: 'image' },
  { key: 'cardText', label: '목록 카드 설명', type: 'i18nArea', rows: 3 },
  { key: 'ogImage', label: '공유 미리보기 이미지(선택)', type: 'image' },
  { key: 'hidden', label: '숨기기(사이트에 만들지 않음)', type: 'toggle' },
];

export const SITE_FIELDS = [
  { group: '회사 정보', fields: [
    { key: 'company.name', label: '회사명', type: 'i18n' },
    { key: 'company.ceo', label: '대표자', type: 'i18n' },
    { key: 'company.bizNo', label: '사업자등록번호', type: 'text' },
    { key: 'company.founded', label: '설립', type: 'i18n' },
    { key: 'company.address', label: '주소', type: 'i18nArea', rows: 2 },
    { key: 'company.tel', label: '대표 전화', type: 'text' },
    { key: 'company.email', label: '대표 이메일(문의 수신)', type: 'text' },
    { key: 'company.formEndpoint', label: '문의 전송 주소(선택, Formspree 등). 비우면 이메일 앱으로 전송', type: 'text' },
  ] },
  { group: '브랜드', fields: [
    { key: 'brand.wordmark', label: '로고 글자', type: 'text' },
    { key: 'brand.tagline', label: '한 줄 소개(푸터)', type: 'i18nArea', rows: 2 },
    { key: 'brand.logoImage', label: '로고 이미지(선택, 넣으면 글자 대신 사용)', type: 'image' },
    { key: 'brand.colors.moss', label: '주색(버튼·강조)', type: 'color' },
    { key: 'brand.colors.soil', label: '보조색(흙색)', type: 'color' },
    { key: 'brand.colors.spore', label: '포인트색', type: 'color' },
    { key: 'brand.colors.ink', label: '글자색', type: 'color' },
    { key: 'brand.colors.paper', label: '바탕색', type: 'color' },
  ] },
  { group: 'SNS·채널', fields: [
    { key: 'social.x', label: 'X(트위터) 주소  예: https://x.com/mycogen', type: 'text' },
    { key: 'social.facebook', label: '페이스북 주소  예: https://www.facebook.com/mycogen', type: 'text' },
    { key: 'social.instagram', label: '인스타그램 주소  예: https://www.instagram.com/mycogen', type: 'text' },
    { key: 'social.linkedin', label: '링크드인 주소  예: https://www.linkedin.com/company/mycogen', type: 'text' },
    { key: 'social.youtube', label: '유튜브 주소  예: https://www.youtube.com/@mycogen', type: 'text' },
    { key: 'social.naverBlog', label: '네이버 블로그 주소  예: https://blog.naver.com/mycogen', type: 'text' },
    { key: 'social.kakao', label: '카카오톡 채널 주소  예: https://pf.kakao.com/_xxxxx', type: 'text' },
    { key: 'social.hideEmpty', label: '주소가 없는 SNS 아이콘 숨기기 (끄면 주소가 없어도 아이콘은 ‘준비 중’으로 표시)', type: 'toggle' },
  ] },
  { group: '검색·공유', fields: [
    { key: 'meta.siteUrl', label: '사이트 주소', type: 'text' },
    { key: 'meta.siteName', label: '사이트 이름', type: 'i18n' },
    { key: 'meta.description', label: '기본 설명', type: 'i18nArea', rows: 3 },
    { key: 'meta.keywords', label: '키워드(쉼표로 구분)', type: 'i18n' },
    { key: 'meta.ogImage', label: '기본 공유 이미지(1200×630)', type: 'image' },
    { key: 'meta.naverVerification', label: '네이버 서치어드바이저 인증 코드', type: 'text' },
    { key: 'meta.googleVerification', label: '구글 서치콘솔 인증 코드', type: 'text' },
    { key: 'meta.bingVerification', label: 'Bing 웹마스터 인증 코드(msvalidate.01) — ChatGPT·Copilot 검색이 Bing 색인을 씁니다', type: 'text' },
    { key: 'meta.daumVerification', label: 'Daum 웹마스터도구 인증 문구(#DaumWebMasterTool:… 전체)', type: 'text' },
    { key: 'meta.gaId', label: 'GA4 측정 ID (G-XXXX)', type: 'text' },
  ] },
  { group: '푸터', fields: [
    { key: 'footer.note', label: '하단 안내 문구', type: 'i18nArea', rows: 2 },
    { key: 'footer.links', label: '하단 링크', type: 'list', itemLabel: 'label', fields: [
      { key: 'label', label: '이름', type: 'i18n' },
      { key: 'link', label: '연결', type: 'link' },
    ] },
  ] },
];

export const NEWS_FIELDS = [
  { key: 'date', label: '날짜(YYYY-MM-DD)', type: 'text' },
  { key: 'category', label: '분류', type: 'i18n' },
  { key: 'title', label: '제목', type: 'i18n' },
  { key: 'summary', label: '요약', type: 'i18nArea', rows: 4 },
  { key: 'image', label: '사진(선택)', type: 'image' },
  { key: 'link', label: '원문 링크(선택)', type: 'link' },
];

export const NAV_FIELDS = [
  { key: 'page', label: '페이지', type: 'pageRef' },
  { key: 'children', label: '하위 메뉴 자동 표시(상위 페이지로 묶인 페이지)', type: 'toggle' },
  { key: 'button', label: '버튼 모양으로 표시', type: 'toggle' },
];

export function newSection(type) {
  const def = SECTION_TYPES[type];
  return JSON.parse(JSON.stringify({ type, ...(def ? def.defaults : {}) }));
}

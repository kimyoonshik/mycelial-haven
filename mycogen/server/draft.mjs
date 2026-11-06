// 주제 → 블로그 초안 (Claude API). 결과는 비공개 초안으로 저장되고, 관리자가 검토한 뒤 게시합니다.
// 필요: server.env 의 ANTHROPIC_API_KEY
import Anthropic from '@anthropic-ai/sdk';
import { loadContent } from '../src/build.mjs';

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: '글 제목. 40자 안팎.' },
    category: { type: 'string', description: '짧은 분류. 예: 이야기, 기술, 연구개발, 소재, 식품' },
    summary: { type: 'string', description: '목록과 검색 결과에 보일 한두 문장 요약. 120자 이내.' },
    body: { type: 'string', description: '본문. 서식 규칙을 따른 일반 텍스트.' },
  },
  required: ['title', 'category', 'summary', 'body'],
  additionalProperties: false,
};

// 회사 사실 정보: 사이트 내용에서 가져와 글이 사이트와 어긋나지 않게 함
function companyFacts() {
  const s = loadContent();
  const ko = (v) => (v && typeof v === 'object' ? v.ko : v) || '';
  const biz = s.pages.filter((p) => p.parent === 'business' && !p.hidden).map((p) => `- ${ko(p.navLabel)}: ${ko(p.description)}`);
  return [`회사: ${ko(s.company?.name)} (${s.meta?.siteUrl || ''})`, `소개: ${ko(s.meta?.description)}`, '사업 분야:', ...biz,
    `유의: ${ko(s.footer?.note)}`].join('\n');
}

const SYSTEM = `당신은 버섯 균사체 배양 기업 마이코젠의 홈페이지 블로그 글을 쓰는 작가입니다.
독자는 소재·식품·건축 분야의 협력사 담당자와 균사체에 관심 있는 일반인입니다.

글쓰기 원칙:
- 한국어로, 전문 용어는 쉽게 풀어서 씁니다. 과장된 홍보 문구는 쓰지 않습니다.
- 아래 회사 정보에 없는 수치, 인증, 수상, 고객사, 계약, 출시 일정은 지어내지 않습니다. 마이코젠 제품은 연구·개발 단계라는 점을 지킵니다.
- 일반적인 과학 사실은 써도 되지만, 확실하지 않으면 단정하지 않습니다.
- 본문은 1,500~2,500자. 도입 문단, 소제목 3~5개, 마무리 문단으로 구성합니다.

본문 서식 (이 규칙 외의 마크다운은 쓰지 않습니다):
- 문단은 빈 줄로 나눕니다.
- 소제목은 줄 맨 앞에 "## "를 붙입니다.
- 목록은 각 줄 맨 앞에 "- "를 붙이고, 목록 앞뒤는 빈 줄로 나눕니다.
- 강조는 **굵게**만 씁니다. 제목(#), 표, 이미지, 코드는 쓰지 않습니다.`;

export async function draftPost({ topic, notes }) {
  const client = new Anthropic(); // ANTHROPIC_API_KEY 를 환경변수에서 읽음
  const response = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default', // 안전 분류기가 거절하면 다른 모델로 자동 재시도
    system: `${SYSTEM}\n\n회사 정보:\n${companyFacts()}`,
    messages: [{ role: 'user', content: `블로그 주제: ${topic}${notes ? `\n\n참고 메모(반영해 주세요):\n${notes}` : ''}` }],
  });
  if (response.stop_reason === 'refusal') throw new Error('이 주제로는 글을 쓸 수 없다는 응답을 받았습니다. 주제를 바꿔 보세요.');
  if (response.stop_reason === 'max_tokens') throw new Error('글이 너무 길어 중간에 끊겼습니다. 다시 시도해 주세요.');
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const d = JSON.parse(text);
  return { title: String(d.title).slice(0, 200), category: String(d.category).slice(0, 40), summary: String(d.summary).slice(0, 300), body: String(d.body).slice(0, 50000) };
}

export function draftError(e) {
  if (e instanceof Anthropic.AuthenticationError) return 'Claude API 키가 올바르지 않습니다(server.env 의 ANTHROPIC_API_KEY).';
  if (e instanceof Anthropic.RateLimitError) return '요청이 많아 잠시 막혔습니다. 1분 뒤 다시 시도해 주세요.';
  if (e instanceof Anthropic.APIConnectionError) return 'Claude API에 연결하지 못했습니다. 서버 인터넷 연결을 확인해 주세요.';
  if (e instanceof Anthropic.APIError) return `Claude API 오류(${e.status}). 잠시 뒤 다시 시도해 주세요.`;
  if (e instanceof SyntaxError) return '응답을 읽지 못했습니다. 다시 시도해 주세요.';
  return e.message;
}

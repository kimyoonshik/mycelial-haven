import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { ModeId } from '../types'

const PANE = 'mycerra-modes'
const PANE_TITLE = 'MYCERRA 모드'
const COMMAND = 'mode'

const mode = atom({ plugin: 'mycerra-modes', key: 'mode' } as const, null)

type Mode = {
  id: ModeId
  label: string
  hotkey: string
  summary: string
  instructions: string
}

const MODES: readonly Mode[] = [
  {
    id: 'mycelium',
    label: '균사체 기술',
    hotkey: '1',
    summary: '균사체 매트 개발·후가공·피니싱 전문가 관점',
    instructions: [
      '현재 모드: 균사체 기술 모드.',
      '마이세라님(세이브어스(주) CTO, 균사매트 Mycerra 개발)과 대화 중이다.',
      '버섯균사체 매트 개발 15년차, 후가공·피니싱 15년차 전문가로서 답한다.',
      '균주 선정, 기질 배합, 배양 조건, 가소화·함침·코팅·라미네이팅 등 공정 변수와 물성(인장, 인열, 굴곡, 내수성, 내마모) 간 인과를 수치와 함께 설명한다.',
      '기술 답변은 MECE로 구조화하고, 실험 설계 제안 시 변수·수준·측정 항목·판정 기준을 명시한다.',
      '존댓말을 사용하고, 마이세라님으로 호칭한다.',
    ].join(' '),
  },
  {
    id: 'finance',
    label: 'M&A·ESG 금융',
    hotkey: '2',
    summary: 'VC·사모펀드·M&A·ESG 분석가 관점',
    instructions: [
      '현재 모드: M&A·ESG 금융 모드.',
      '마이세라님(세이브어스(주) CTO, 균사매트 Mycerra 개발)과 대화 중이다.',
      'M&A·ESG 분야 VC 및 사모펀드 15년차 최고 전문가이자 분석가로서 답한다.',
      '밸류에이션, 딜 구조, 투자 조건(term sheet), 실사 포인트, ESG 공시·인증, 투자자 관점의 리스크·리턴을 다룬다.',
      '금융 답변은 MECE로 구조화하고, 가정과 수치 근거를 분리해 표로 제시한다.',
      '존댓말을 사용하고, 마이세라님으로 호칭한다.',
    ].join(' '),
  },
  {
    id: 'ppt',
    label: 'PPT 디자인',
    hotkey: '3',
    summary: 'IR·제안서 슬라이드 설계·제작 전문가 관점',
    instructions: [
      '현재 모드: PPT 디자인 모드.',
      '마이세라님(세이브어스(주) CTO, 균사매트 Mycerra 개발)과 대화 중이다.',
      'PPT 슬라이드 디자인 및 제작 15년차 최고 전문가로서 답한다.',
      '스토리라인(문제→해법→증거→요청), 슬라이드별 헤드라인 메시지, 레이아웃·타이포·색·도식 가이드를 제시하고, 요청 시 슬라이드 단위로 구체적인 구성안을 만든다.',
      '존댓말을 사용하고, 마이세라님으로 호칭한다.',
    ].join(' '),
  },
]

const byId = (id: string | null | undefined): Mode | undefined =>
  MODES.find(m => m.id === id)

const parseArg = (raw: string): ModeId | 'off' | null => {
  const s = raw.trim().toLowerCase()
  if (s === '' ) return null
  if (['off', 'none', 'clear', '해제', '끄기'].includes(s)) return 'off'
  if (s === '1' || s.startsWith('myc') || s.includes('균사')) return 'mycelium'
  if (s === '2' || s.startsWith('fin') || s.includes('금융') || s.includes('m&a')) return 'finance'
  if (s === '3' || s.startsWith('ppt') || s.includes('디자인')) return 'ppt'
  return null
}

async function setMode($: EngineInterface, next: ModeId | null): Promise<void> {
  await update($, mode, () => next)
  const m = byId(next)
  $.ui.toast(m ? `${m.label} 모드 켜짐` : '모드 해제됨')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: 'MYCERRA 전문가 모드 전환 (mycelium | finance | ppt | off)',
      argumentHint: 'mycelium | finance | ppt | off',
    })
    void $.ui.open({ id: PANE, title: PANE_TITLE })

    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const arg = parseArg(e.args)
    if (arg === null) {
      const current = byId(await read($, mode))
      await $.ui.open({ id: PANE, title: PANE_TITLE })
      return {
        text: [
          `현재 모드: ${current ? current.label : '없음'}`,
          '사용법: /mode mycelium | finance | ppt | off',
        ].join('\n'),
      }
    }
    const next = arg === 'off' ? null : arg
    await setMode($, next)
    const m = byId(next)
    return { text: m ? `${m.label} 모드로 전환했습니다.` : '모드를 해제했습니다.' }
  })

  on('prompt.compose', async ($, e, next) => {
    const result = await next(e)
    const m = byId(await read($, mode))
    if (!m) return result

    return {
      sections: [
        ...result.sections,
        { id: 'mycerra-modes:mode', text: m.instructions, scope: 'session' as const },
      ],
    }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const current = await read($, mode)
    const active = byId(current)

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" flexWrap="wrap" gap={1}>
          {MODES.map(m => (
            <Button
              key={m.id}
              label={m.label}
              hotkey={m.hotkey}
              variant={m.id === current ? 'primary' : 'secondary'}
              onPress={() => void setMode($, m.id === current ? null : m.id)}
            />
          ))}
          {active && (
            <Button
              key="off"
              label="해제"
              hotkey="0"
              dimColor
              onPress={() => void setMode($, null)}
            />
          )}
        </Box>
        <Text dimColor>
          {active ? `${active.label} 모드 · ${active.summary}` : '모드 없음 · 버튼을 눌러 전문가 모드를 선택하세요'}
        </Text>
      </Box>
    )
  })
}

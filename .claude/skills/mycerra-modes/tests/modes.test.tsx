import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'mycerra-modes',
  component: 'Pane',
  requestId: 'mycerra-modes',
  props: {
    title: 'MYCERRA 모드',
    isFocused: false,
    bodyColumns: 60,
    placement: 'inline',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

const BASE = { id: 'intro', text: 'base prompt', scope: 'shared' } as const

const COMPOSE = {
  model: 'claude-fable-5-1',
  promptModel: 'claude-fable-5-1',
  surfaces: ['desktop'],
  tools: ['Bash'],
  outputStyle: null,
  traits: [],
} as const

const RUN = {
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 80 },
} as const

type TestOn = Parameters<Extract<Parameters<typeof test>[1], (...args: never[]) => unknown>>[1]

const stubEngine = (on: TestOn) => {
  on('command.register', () => ({ value: { command: 'mode' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.toast', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.compose', () => ({ sections: [BASE] }))
}

test('pressing a mode button adds that mode to the system prompt, on every surface', async ($, on) => {
  stubEngine(on)

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  // No mode yet: the engine's prompt passes through untouched.
  expect((await $.prompt.compose(COMPOSE)).sections.map(s => s.id)).toEqual(['intro'])

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ key: 'mycelium' })).toBeDefined()
    expect(await ui.find({ key: 'finance' })).toBeDefined()
    expect(await ui.find({ key: 'ppt' })).toBeDefined()

    await ui.press({ key: 'finance' })
    const hint = await ui.find({ type: 'Text', text: /금융/ })
    expect(hint?.text).toContain('M&A·ESG 금융 모드')

    const composed = await $.prompt.compose(COMPOSE)
    expect(composed.sections.map(s => s.id)).toEqual(['intro', 'mycerra-modes:mode'])
    expect(composed.sections[1]?.text).toContain('M&A·ESG 금융 모드')
    expect(composed.sections[1]?.scope).toBe('session')

    // Pressing the active mode again clears it.
    await ui.press({ key: 'finance' })
    expect((await $.prompt.compose(COMPOSE)).sections.map(s => s.id)).toEqual(['intro'])
    await ui.unmount()
  }
})

test('the /mode command switches and clears the mode', async ($, on) => {
  stubEngine(on)

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const on1 = await $.command.run({ ...RUN, command: 'mode', args: 'ppt' })
  expect(on1.text).toContain('PPT 디자인 모드로 전환')
  expect((await $.prompt.compose(COMPOSE)).sections[1]?.text).toContain('PPT 디자인 모드')

  const status = await $.command.run({ ...RUN, command: 'mode', args: '' })
  expect(status.text).toContain('현재 모드: PPT 디자인')

  const off = await $.command.run({ ...RUN, command: 'mode', args: 'off' })
  expect(off.text).toContain('해제')
  expect((await $.prompt.compose(COMPOSE)).sections.map(s => s.id)).toEqual(['intro'])
})

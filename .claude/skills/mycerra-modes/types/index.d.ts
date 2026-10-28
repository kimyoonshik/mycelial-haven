export type ModeId = 'mycelium' | 'finance' | 'ppt'

declare module 'claude-code' {
  interface PluginState {
    'mycerra-modes': { mode: ModeId | null }
  }
}

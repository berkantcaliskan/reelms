export const logger = {
  info: (...args: unknown[]) => console.log('[api]', ...args),
  warn: (...args: unknown[]) => console.warn('[api]', ...args),
  error: (...args: unknown[]) => console.error('[api]', ...args)
}

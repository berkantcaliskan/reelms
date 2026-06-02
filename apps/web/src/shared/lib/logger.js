const enabled = import.meta.env.DEV || import.meta.env.VITE_REELMS_DEBUG === 'true'

export const logger = {
  info(scope, ...args) {
    if (enabled) console.info(`[${scope}]`, ...args)
  },
  warn(scope, ...args) {
    console.warn(`[${scope}]`, ...args)
  },
  error(scope, ...args) {
    console.error(`[${scope}]`, ...args)
  }
}

import { env } from '../config/env.js'

type Level = 'debug' | 'info' | 'warn' | 'error'
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }

function normalize(value: unknown) {
  if (value instanceof Error) return { name: value.name, message: value.message, stack: env.NODE_ENV === 'production' ? undefined : value.stack }
  return value
}

function write(level: Level, args: unknown[]) {
  const configuredLevel = env.LOG_LEVEL as Level
  if (order[level] < order[configuredLevel]) return
  if (env.LOG_FORMAT === 'json') {
    const [message, ...rest] = args
    console[level === 'debug' ? 'log' : level](JSON.stringify({ level, time: new Date().toISOString(), message: String(message), data: rest.map(normalize) }))
    return
  }
  console[level === 'debug' ? 'log' : level]('[api]', ...args.map(normalize))
}

export const logger = {
  debug: (...args: unknown[]) => write('debug', args),
  info: (...args: unknown[]) => write('info', args),
  warn: (...args: unknown[]) => write('warn', args),
  error: (...args: unknown[]) => write('error', args)
}

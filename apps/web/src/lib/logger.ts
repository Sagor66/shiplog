import type { AuthLogger } from '@shiplog/auth'

/**
 * Minimal structured logger used by Better Auth in the web app.
 *
 * For now this is `console.*` wrapped to match the {@link AuthLogger}
 * shape. Swap with `pino` once a shared logger package lands. Keeping
 * this thin means the auth config stays portable.
 */
export const webLogger: AuthLogger = {
  info(obj, msg) {
    console.log(JSON.stringify({ level: 'info', msg, ...obj }))
  },
  warn(obj, msg) {
    console.warn(JSON.stringify({ level: 'warn', msg, ...obj }))
  },
  error(obj, msg) {
    console.error(JSON.stringify({ level: 'error', msg, ...obj }))
  },
}

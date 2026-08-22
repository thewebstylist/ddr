/**
 * Runtime configuration, read from `public/config.js` at load time.
 *
 * Deliberately fail-closed: a build that cannot find real credentials shows a
 * setup screen rather than the app. A misplaced config file should look
 * obviously broken, never like an unlocked door.
 */

export type AppMode = 'supabase' | 'demo' | 'setup'

interface RawConfig {
  mode?: string
  supabaseUrl?: string
  supabaseAnonKey?: string
  siteUrl?: string
  allowSignUp?: boolean
}

export interface LoftConfig {
  mode: AppMode
  supabaseUrl: string
  supabaseAnonKey: string
  siteUrl: string
  allowSignUp: boolean
  /** Why the app is in setup mode, shown verbatim on the setup screen. */
  setupReason?: string
}

/** Only builds made explicitly for a sandbox may run without a backend. */
const BUILD_ALLOWS_DEMO = import.meta.env.VITE_LOFT_DEMO === '1'

const PLACEHOLDER = /YOUR-PROJECT|YOUR-PUBLISHABLE-KEY|YOUR-ANON-KEY|^\s*$/i

function looksReal(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0 && !PLACEHOLDER.test(value)
}

function resolve(): LoftConfig {
  const raw = (globalThis as unknown as { LOFT_CONFIG?: RawConfig }).LOFT_CONFIG
  const base = {
    supabaseUrl: raw?.supabaseUrl?.trim() ?? '',
    supabaseAnonKey: raw?.supabaseAnonKey?.trim() ?? '',
    siteUrl: raw?.siteUrl?.trim() || (typeof location === 'undefined' ? '' : location.origin + location.pathname),
    allowSignUp: raw?.allowSignUp === true,
  }

  if (raw?.mode === 'demo') return { ...base, mode: 'demo' }

  if (looksReal(base.supabaseUrl) && looksReal(base.supabaseAnonKey)) {
    return { ...base, mode: 'supabase' }
  }

  if (BUILD_ALLOWS_DEMO) return { ...base, mode: 'demo' }

  return {
    ...base,
    mode: 'setup',
    setupReason: raw
      ? 'config.js loaded, but supabaseUrl and supabaseAnonKey are still placeholders.'
      : 'config.js did not load. It must sit next to index.html on your host.',
  }
}

export const config: LoftConfig = resolve()

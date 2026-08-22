import { config } from '../config'
import { DemoBackend } from './demo'
import { SupabaseBackend } from './supabase'
import type { Backend } from './types'

/**
 * One backend per session, chosen by config. `setup` mode gets the demo
 * implementation only so nothing crashes while the setup screen is showing —
 * the app itself never renders in that state.
 */
export const backend: Backend = config.mode === 'supabase' ? new SupabaseBackend() : new DemoBackend()

export * from './types'

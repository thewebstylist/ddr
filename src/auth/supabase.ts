import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { Doc, Id, Member } from '../types'
import { colorForSeed } from '../lib/palette'
import { config } from '../config'
import { ConflictError, authError, type AuthUser, type Backend, type PendingAction, type ProjectSummary } from './types'

/**
 * Read the URL *before* the Supabase client boots, because it consumes and
 * clears the token it finds there. Invitation and reset links carry a `loft`
 * marker we add ourselves, which survives either of Supabase's link flows.
 */
function capturePendingAction(): PendingAction {
  if (typeof location === 'undefined') return null
  const search = new URLSearchParams(location.search)
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''))
  const marker = search.get('loft') ?? hash.get('type')
  if (marker === 'invite' || marker === 'signup') return 'invite'
  if (marker === 'recovery') return 'recovery'
  return null
}

let pending: PendingAction = capturePendingAction()

function scrubUrl() {
  if (typeof history === 'undefined') return
  const clean = location.origin + location.pathname
  history.replaceState({}, '', clean)
}

function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null
  const email = user.email ?? ''
  const metaName = (user.user_metadata?.display_name as string | undefined)?.trim()
  return {
    id: user.id,
    email,
    name: metaName || email.split('@')[0] || 'You',
    color: (user.user_metadata?.color as string | undefined) || colorForSeed(email || user.id),
  }
}

function translate(message: string): ReturnType<typeof authError> {
  const text = message.toLowerCase()
  if (text.includes('invalid login')) {
    return authError('credentials', 'That email and password do not match an account.')
  }
  if (text.includes('email not confirmed')) {
    return authError('not-allowed', 'Check your inbox and confirm your email address first.')
  }
  if (text.includes('password should be') || text.includes('weak')) {
    return authError('weak-password', 'Pick a longer password — at least 8 characters.')
  }
  if (text.includes('rate') || text.includes('too many')) {
    return authError('not-allowed', 'Too many attempts. Wait a minute and try again.')
  }
  if (text.includes('failed to fetch') || text.includes('network')) {
    return authError('network', 'Could not reach the server. Check your connection.')
  }
  return authError('unknown', message)
}

const ASSET_BUCKET = 'project-assets'
/** Long enough that a working session never sees a link go stale. */
const SIGNED_URL_TTL = 60 * 60 * 8

interface RosterRow {
  user_id: string
  role: Member['role']
  accepted_at: string | null
  display_name: string
  email: string
  color: string
}

export class SupabaseBackend implements Backend {
  readonly kind = 'supabase' as const
  private client: SupabaseClient
  private user: AuthUser | null = null
  private listeners = new Set<(user: AuthUser | null) => void>()

  constructor() {
    this.client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }

  async init(): Promise<void> {
    const { data } = await this.client.auth.getSession()
    this.user = toAuthUser(data.session?.user ?? null)

    this.client.auth.onAuthStateChange((event, session) => {
      this.user = toAuthUser(session?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') pending = 'recovery'
      for (const listener of this.listeners) listener(this.user)
    })

    // The token in the link has been spent by now; keep the address bar clean
    // so a refresh does not look like a second invitation.
    if (pending) scrubUrl()
  }

  currentUser() {
    return this.user
  }

  onAuthChange(listener: (user: AuthUser | null) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener) as unknown as void
  }

  pendingAction() {
    return pending
  }

  private clearPending() {
    pending = null
  }

  async signIn(email: string, password: string) {
    const { error } = await this.client.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw translate(error.message)
  }

  async signUp(email: string, password: string, name: string) {
    if (!config.allowSignUp) {
      throw authError('not-allowed', 'This project is invite-only. Ask an owner to send you an invitation.')
    }
    const { data, error } = await this.client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: name.trim(), color: colorForSeed(email) },
        emailRedirectTo: `${config.siteUrl}?loft=invite`,
      },
    })
    if (error) throw translate(error.message)
    return { needsConfirmation: !data.session }
  }

  async signOut() {
    await this.client.auth.signOut()
    this.user = null
  }

  async requestPasswordReset(email: string) {
    const { error } = await this.client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${config.siteUrl}?loft=recovery`,
    })
    if (error) throw translate(error.message)
  }

  async setPassword(password: string, name?: string) {
    const attributes: { password: string; data?: Record<string, unknown> } = { password }
    if (name?.trim()) attributes.data = { display_name: name.trim() }
    const { data, error } = await this.client.auth.updateUser(attributes)
    if (error) throw translate(error.message)
    this.user = toAuthUser(data.user)
    if (name?.trim() && this.user) {
      await this.client.from('profiles').update({ display_name: name.trim() }).eq('id', this.user.id)
    }
    this.clearPending()
    for (const listener of this.listeners) listener(this.user)
  }

  // -- projects ------------------------------------------------------------

  async listProjects(): Promise<ProjectSummary[]> {
    const { data, error } = await this.client
      .from('projects')
      .select('id, name, updated_at, project_members!inner(role)')
      .order('updated_at', { ascending: false })
    if (error) throw translate(error.message)

    return (data ?? []).map((row) => {
      const membership = row.project_members as unknown as Array<{ role: Member['role'] }> | { role: Member['role'] }
      const role = Array.isArray(membership) ? membership[0]?.role : membership?.role
      return {
        id: row.id as Id,
        name: (row.name as string) || 'Untitled project',
        updatedAt: row.updated_at as string,
        role: role ?? 'viewer',
      }
    })
  }

  async createProject(name: string, doc: Doc): Promise<Id> {
    if (!this.user) throw authError('not-allowed', 'Sign in first.')
    const { data, error } = await this.client
      .from('projects')
      .insert({ name, doc, created_by: this.user.id })
      .select('id')
      .single()
    if (error) throw translate(error.message)
    return data.id as Id
  }

  async loadProject(id: Id) {
    const { data, error } = await this.client.from('projects').select('doc, version').eq('id', id).single()
    if (error) throw translate(error.message)
    return { doc: data.doc as Doc, version: Number(data.version) }
  }

  async saveProject(id: Id, doc: Doc, version: number): Promise<number> {
    const { data, error } = await this.client
      .from('projects')
      .update({ doc, name: doc.name })
      .eq('id', id)
      .eq('version', version)
      .select('version')
      .maybeSingle()

    if (error) throw translate(error.message)

    // No row came back: someone else saved between our read and our write.
    if (!data) throw new ConflictError(await this.loadProject(id))
    return Number(data.version)
  }

  async deleteProject(id: Id) {
    const { error } = await this.client.from('projects').delete().eq('id', id)
    if (error) throw translate(error.message)
  }

  // -- images --------------------------------------------------------------

  async uploadAsset(projectId: Id, assetId: Id, blob: Blob, contentType: string) {
    const { error } = await this.client.storage
      .from(ASSET_BUCKET)
      .upload(`${projectId}/${assetId}`, blob, { contentType, upsert: true })
    if (error) throw translate(error.message)
  }

  async assetUrl(projectId: Id, assetId: Id): Promise<string | null> {
    const { data, error } = await this.client.storage
      .from(ASSET_BUCKET)
      .createSignedUrl(`${projectId}/${assetId}`, SIGNED_URL_TTL)
    if (error || !data?.signedUrl) return null
    return data.signedUrl
  }

  // -- membership ----------------------------------------------------------

  async listMembers(projectId: Id): Promise<Member[]> {
    const { data, error } = await this.client
      .from('project_roster')
      .select('user_id, role, accepted_at, display_name, email, color')
      .eq('project_id', projectId)
    if (error) throw translate(error.message)

    return (data as RosterRow[]).map((row) => ({
      id: row.user_id,
      name: row.display_name || row.email.split('@')[0],
      email: row.email,
      color: row.color || colorForSeed(row.email),
      role: row.role,
      pending: row.accepted_at === null,
    }))
  }

  async inviteMember(projectId: Id, email: string, role: Member['role']): Promise<Member> {
    const { data, error } = await this.client.functions.invoke('invite', {
      body: { projectId, email, role, redirectTo: `${config.siteUrl}?loft=invite` },
    })

    if (error) {
      // Edge functions return the useful part in the response body, not the
      // generic "non-2xx status code" message.
      const detail = await readFunctionError(error)
      throw authError('not-allowed', detail ?? 'That invitation could not be sent.')
    }

    const payload = data as { userId: string; email: string; role: Member['role']; emailed: boolean }
    return {
      id: payload.userId,
      name: payload.email.split('@')[0],
      email: payload.email,
      color: colorForSeed(payload.email),
      role: payload.role,
      pending: true,
    }
  }

  async setMemberRole(projectId: Id, memberId: Id, role: Member['role']) {
    const { error } = await this.client
      .from('project_members')
      .update({ role })
      .eq('project_id', projectId)
      .eq('user_id', memberId)
    if (error) throw translate(error.message)
  }

  async removeMember(projectId: Id, memberId: Id) {
    const { error } = await this.client
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', memberId)
    if (error) throw translate(error.message)
  }
}

async function readFunctionError(error: unknown): Promise<string | null> {
  const response = (error as { context?: Response })?.context
  if (!response || typeof response.json !== 'function') return null
  try {
    const body = await response.json()
    return typeof body?.error === 'string' ? body.error : null
  } catch {
    return null
  }
}

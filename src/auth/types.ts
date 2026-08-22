import type { Doc, Id, Member } from '../types'

export interface AuthUser {
  id: Id
  email: string
  name: string
  color: string
}

export interface ProjectSummary {
  id: Id
  name: string
  updatedAt: string
  role: Member['role']
}

/** A token in the URL that must be spent before the app can be used. */
export type PendingAction = 'invite' | 'recovery' | null

export interface AuthError extends Error {
  /** Stable enough to branch on; the message is what the user reads. */
  kind: 'credentials' | 'network' | 'weak-password' | 'not-allowed' | 'unknown'
}

export function authError(kind: AuthError['kind'], message: string): AuthError {
  const err = new Error(message) as AuthError
  err.kind = kind
  return err
}

/**
 * Everything the app needs from a backend. Implemented twice — against
 * Supabase for real deployments, and against this browser for the sandbox —
 * so swapping providers touches one file rather than the whole app.
 */
export interface Backend {
  readonly kind: 'supabase' | 'demo'

  // -- identity ----------------------------------------------------------
  currentUser(): AuthUser | null
  /** Resolves once any token in the URL has been consumed. */
  init(): Promise<void>
  onAuthChange(listener: (user: AuthUser | null) => void): () => void
  pendingAction(): PendingAction
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string, name: string): Promise<{ needsConfirmation: boolean }>
  signOut(): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  setPassword(password: string, name?: string): Promise<void>

  // -- projects ----------------------------------------------------------
  listProjects(): Promise<ProjectSummary[]>
  createProject(name: string, doc: Doc): Promise<Id>
  loadProject(id: Id): Promise<{ doc: Doc; version: number }>
  /** Returns the new version. Rejects with a `conflict` error if stale. */
  saveProject(id: Id, doc: Doc, version: number): Promise<number>
  deleteProject(id: Id): Promise<void>

  // -- images ------------------------------------------------------------
  /** Store an image so everyone on the project can see it. */
  uploadAsset(projectId: Id, assetId: Id, blob: Blob, contentType: string): Promise<void>
  /** A URL this viewer can load the image from, or null if there isn't one. */
  assetUrl(projectId: Id, assetId: Id): Promise<string | null>

  // -- membership --------------------------------------------------------
  listMembers(projectId: Id): Promise<Member[]>
  inviteMember(projectId: Id, email: string, role: Member['role']): Promise<Member>
  setMemberRole(projectId: Id, memberId: Id, role: Member['role']): Promise<void>
  removeMember(projectId: Id, memberId: Id): Promise<void>
}

export class ConflictError extends Error {
  constructor(public remote: { doc: Doc; version: number }) {
    super('This project was changed somewhere else.')
    this.name = 'ConflictError'
  }
}

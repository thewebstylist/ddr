import type { Doc, Id, Member } from '../types'
import { colorForSeed } from '../lib/palette'
import { loadDoc, saveDoc } from '../store/persistence'
import { createSampleDoc } from '../store/sampleDoc'
import { uid } from '../lib/id'
import { authError, type AuthUser, type Backend, type ProjectSummary } from './types'

const LOCAL_USER: AuthUser = {
  id: 'm_you',
  email: 'you@example.com',
  name: 'You',
  color: '#2dd4bf',
}

/**
 * The sandbox backend: no accounts, no server, everything in this browser.
 * It exists so the app can be opened and understood without standing anything
 * up — never as a way to run real, shared work.
 */
export class DemoBackend implements Backend {
  readonly kind = 'demo' as const

  async init() {}

  currentUser() {
    return LOCAL_USER
  }

  onAuthChange() {
    return () => {}
  }

  pendingAction() {
    return null
  }

  async signIn() {
    throw authError('not-allowed', 'This sandbox has no accounts.')
  }

  async signUp(): Promise<{ needsConfirmation: boolean }> {
    throw authError('not-allowed', 'This sandbox has no accounts.')
  }

  async signOut() {}

  async requestPasswordReset() {
    throw authError('not-allowed', 'This sandbox has no accounts.')
  }

  async setPassword() {
    throw authError('not-allowed', 'This sandbox has no accounts.')
  }

  async listProjects(): Promise<ProjectSummary[]> {
    const doc = loadDoc()
    return [
      {
        id: 'local',
        name: doc?.name ?? 'Sample project',
        updatedAt: new Date().toISOString(),
        role: 'owner',
      },
    ]
  }

  async createProject(_name: string, doc: Doc): Promise<Id> {
    saveDoc(doc)
    return 'local'
  }

  async loadProject() {
    return { doc: loadDoc() ?? createSampleDoc(), version: 1 }
  }

  async saveProject(_id: Id, doc: Doc): Promise<number> {
    saveDoc(doc)
    return 1
  }

  async deleteProject() {}

  async uploadAsset() {}

  async assetUrl() {
    return null
  }

  async listMembers(): Promise<Member[]> {
    return []
  }

  async inviteMember(_projectId: Id, email: string, role: Member['role']): Promise<Member> {
    const name = email
      .split('@')[0]
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
    return { id: uid('m'), name, email, color: colorForSeed(email), role, pending: true }
  }

  async setMemberRole() {}

  async removeMember() {}
}

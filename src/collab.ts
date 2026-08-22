import { backend } from './auth'
import { config } from './config'
import { actions, store } from './store/store'
import type { Id, Member } from './types'

/**
 * Membership changes, routed to wherever this deployment keeps them.
 *
 * With a backend, the roster is server state — the document only mirrors it so
 * assignee chips can render. In the sandbox there is no server, so the document
 * is the only copy.
 */
class Collab {
  projectId: Id | null = null

  get remote() {
    return config.mode === 'supabase' && this.projectId !== null
  }

  async refresh(): Promise<void> {
    if (!this.remote) return
    const members = await backend.listMembers(this.projectId!)
    actions.setMembers(members)
  }

  async invite(email: string, role: Member['role']): Promise<void> {
    if (!this.remote) {
      actions.inviteMember(email, role)
      return
    }
    const member = await backend.inviteMember(this.projectId!, email, role)
    // Show them immediately, then reconcile with what the server actually stored.
    const existing = store.getState().doc.members
    if (!existing.some((m) => m.id === member.id)) actions.setMembers([...existing, member])
    await this.refresh()
  }

  async setRole(memberId: Id, role: Member['role']): Promise<void> {
    actions.setMemberRole(memberId, role)
    if (this.remote) await backend.setMemberRole(this.projectId!, memberId, role)
  }

  async remove(memberId: Id): Promise<void> {
    actions.removeMember(memberId)
    if (this.remote) await backend.removeMember(this.projectId!, memberId)
  }

  /** Wraps a membership call so a failure surfaces instead of vanishing. */
  run(promise: Promise<void>, failure: string): void {
    promise.catch((err) => {
      actions.toast(err instanceof Error ? err.message : failure)
      void this.refresh()
    })
  }
}

export const collab = new Collab()

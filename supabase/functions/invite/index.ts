/**
 * Loft — invitation endpoint.
 *
 * This exists because sending an invitation email needs the service_role key,
 * and that key must never reach a browser. Everything else the app does runs
 * straight against the database under row-level security; only this one step
 * needs a privileged actor, so only this one step lives on a server.
 *
 * Deploy:  supabase functions deploy invite
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

const ROLES = new Set(['editor', 'commenter', 'viewer'])

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authorization = req.headers.get('Authorization') ?? ''
  if (!authorization) return json({ error: 'Sign in first.' }, 401)

  // The caller's own client: every query it makes is still subject to RLS.
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })

  const { data: auth, error: authErr } = await caller.auth.getUser()
  if (authErr || !auth.user) return json({ error: 'Sign in first.' }, 401)

  let payload: { projectId?: string; email?: string; role?: string; redirectTo?: string }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Expected a JSON body.' }, 400)
  }

  const projectId = payload.projectId?.trim()
  const email = payload.email?.trim().toLowerCase()
  const role = payload.role ?? 'editor'

  if (!projectId) return json({ error: 'Which project?' }, 400)
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'That email address looks wrong.' }, 400)
  if (!ROLES.has(role)) return json({ error: 'Unknown role.' }, 400)

  // Only an owner may hand out access. Checked against the database, not the UI.
  const { data: membership } = await caller
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (membership?.role !== 'owner') {
    return json({ error: 'Only an owner of this project can invite people.' }, 403)
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Someone already on Loft just gets added; a new address gets an email that
  // walks them through choosing their own password.
  const { data: existing } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()

  let userId = existing?.id as string | undefined
  let emailed = false

  if (!userId) {
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: payload.redirectTo,
    })
    if (inviteErr || !invited?.user) {
      return json({ error: inviteErr?.message ?? 'That invitation could not be sent.' }, 400)
    }
    userId = invited.user.id
    emailed = true
  }

  const { error: memberErr } = await admin
    .from('project_members')
    .upsert(
      { project_id: projectId, user_id: userId, role, invited_email: email },
      { onConflict: 'project_id,user_id' },
    )

  if (memberErr) return json({ error: memberErr.message }, 400)

  return json({ userId, email, role, emailed })
})

import { useEffect, useState } from 'react'
import { backend } from '../../auth'
import type { PendingAction } from '../../auth'
import { config } from '../../config'
import { Mark } from '../Mark'
import { MIN_PASSWORD, PasswordField, assess } from './PasswordField'

type Mode = 'signin' | 'signup' | 'forgot' | 'sent' | 'password' | 'expired'

function initialMode(pending: PendingAction, signedIn: boolean): Mode {
  if (pending && signedIn) return 'password'
  if (pending && !signedIn) return 'expired'
  return 'signin'
}

export function AuthScreen({ pending, signedIn }: { pending: PendingAction; signedIn: boolean }) {
  const [mode, setMode] = useState<Mode>(() => initialMode(pending, signedIn))
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  // The session can arrive a moment after mount, once the link's token is spent.
  useEffect(() => {
    if (pending && signedIn && mode === 'expired') setMode('password')
  }, [pending, signedIn, mode])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return

    if (mode === 'signin') return void run(() => backend.signIn(email, password))

    if (mode === 'signup') {
      return void run(async () => {
        const { needsConfirmation } = await backend.signUp(email, password, name)
        if (needsConfirmation) {
          setOk(`Check ${email} for a link to confirm your address.`)
          setMode('sent')
        }
      })
    }

    if (mode === 'forgot') {
      return void run(async () => {
        await backend.requestPasswordReset(email)
        setOk(`If an account exists for ${email}, a reset link is on its way.`)
        setMode('sent')
      })
    }

    if (mode === 'password') {
      if (password.length < MIN_PASSWORD) {
        setError(`Use at least ${MIN_PASSWORD} characters.`)
        return
      }
      return void run(() => backend.setPassword(password, pending === 'invite' ? name : undefined))
    }
  }

  const copy = {
    signin: { title: 'Sign in to Loft', sub: 'Your projects are private to the people invited to them.' },
    signup: { title: 'Create your account', sub: 'Pick a password you do not use anywhere else.' },
    forgot: { title: 'Reset your password', sub: "Tell us your address and we'll send a link to set a new one." },
    sent: { title: 'Check your email', sub: '' },
    password: {
      title: pending === 'invite' ? "You've been invited" : 'Choose a new password',
      sub:
        pending === 'invite'
          ? 'Set a password and the project is yours to open. Nobody else sees what you choose.'
          : 'Pick a new password to finish signing back in.',
    },
    expired: { title: 'That link has expired', sub: 'Invitation and reset links are single-use and short-lived.' },
  }[mode]

  const weak = mode !== 'signin' && password.length > 0 && assess(password).score < 3

  return (
    <div className="gate">
      <div className="gate-inner">
        <div className="gate-mark">
          <Mark />
          Loft
        </div>

        <form className="gate-card" onSubmit={submit}>
          <h1>{copy.title}</h1>
          {copy.sub && <p className="sub">{copy.sub}</p>}

          {error && (
            <div className="notice" data-tone="error" role="alert">
              {error}
            </div>
          )}
          {ok && mode === 'sent' && (
            <div className="notice" data-tone="ok">
              {ok}
            </div>
          )}

          {mode === 'expired' && (
            <div className="notice" data-tone="warn">
              {pending === 'invite'
                ? 'Ask whoever invited you to send a new one.'
                : 'Request another reset link from the sign-in screen.'}
            </div>
          )}

          {(mode === 'signin' || mode === 'signup' || mode === 'forgot') && (
            <label className="gate-field">
              <span>Email</span>
              <input
                className="input"
                type="email"
                autoFocus
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}

          {(mode === 'signup' || (mode === 'password' && pending === 'invite')) && (
            <label className="gate-field">
              <span>Your name</span>
              <input
                className="input"
                required
                placeholder="How teammates will see you"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          )}

          {mode === 'signin' && (
            <PasswordField label="Password" value={password} onChange={setPassword} />
          )}

          {(mode === 'signup' || mode === 'password') && (
            <PasswordField
              label={mode === 'password' ? 'New password' : 'Password'}
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              showStrength
            />
          )}

          {mode !== 'sent' && mode !== 'expired' && (
            <div className="gate-actions">
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy
                  ? 'Working…'
                  : mode === 'signin'
                    ? 'Sign in'
                    : mode === 'signup'
                      ? 'Create account'
                      : mode === 'forgot'
                        ? 'Send reset link'
                        : 'Set password and continue'}
              </button>
            </div>
          )}

          {weak && (
            <span className="strength-label">A longer passphrase beats a short complicated one.</span>
          )}

          <div className="gate-alt">
            {mode === 'signin' && (
              <>
                <button type="button" onClick={() => { setMode('forgot'); setError(null) }}>
                  Forgot your password?
                </button>
                {config.allowSignUp ? (
                  <button type="button" onClick={() => { setMode('signup'); setError(null) }}>
                    Create an account
                  </button>
                ) : (
                  <span>Loft is invite-only — ask a project owner to send you one.</span>
                )}
              </>
            )}

            {(mode === 'forgot' || mode === 'signup' || mode === 'sent' || mode === 'expired') && (
              <button
                type="button"
                onClick={() => {
                  setMode('signin')
                  setError(null)
                  setOk(null)
                }}
              >
                Back to sign in
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

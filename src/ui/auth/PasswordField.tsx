import { useMemo, useState } from 'react'

const RULES: Array<[RegExp, string]> = [
  [/.{12,}/, 'twelve characters or more'],
  [/[a-z]/, 'a lowercase letter'],
  [/[A-Z]/, 'an uppercase letter'],
  [/\d/, 'a number'],
  [/[^\w\s]/, 'a symbol'],
]

export const MIN_PASSWORD = 8

/** Plain-language strength feedback: what's missing, not a bare score. */
export function assess(password: string): { score: number; missing: string[] } {
  const missing = RULES.filter(([re]) => !re.test(password)).map(([, label]) => label)
  return { score: RULES.length - missing.length, missing }
}

export function PasswordField({
  label,
  value,
  onChange,
  autoFocus,
  showStrength,
  autoComplete = 'current-password',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
  showStrength?: boolean
  autoComplete?: string
}) {
  const [visible, setVisible] = useState(false)
  const { score, missing } = useMemo(() => assess(value), [value])
  const tone = score >= 4 ? 'var(--success)' : score >= 3 ? 'var(--warning)' : 'var(--danger)'

  return (
    <label className="gate-field">
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        {label}
        <button
          type="button"
          style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'none', letterSpacing: 0 }}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </span>
      <input
        className="input"
        type={visible ? 'text' : 'password'}
        value={value}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
      {showStrength && value.length > 0 && (
        <>
          <div className="strength" aria-hidden="true">
            {RULES.map((_, i) => (
              <span key={i} style={{ background: i < score ? tone : undefined }} />
            ))}
          </div>
          <span className="strength-label">
            {missing.length === 0 ? 'Strong password.' : `Add ${missing.slice(0, 2).join(' and ')}.`}
          </span>
        </>
      )}
    </label>
  )
}

const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'

/** Short, collision-resistant enough for a single document. */
export function uid(prefix = ''): string {
  let out = ''
  const bytes = new Uint8Array(10)
  crypto.getRandomValues(bytes)
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return prefix ? `${prefix}_${out}` : out
}

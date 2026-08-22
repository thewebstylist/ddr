export function Mark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <rect x="1" y="1" width="7.2" height="16" rx="2" fill="#4dabf7" />
      <rect x="9.8" y="1" width="7.2" height="9" rx="2" fill="#2dd4bf" />
      <rect x="9.8" y="11.6" width="7.2" height="5.4" rx="2" fill="#a78bfa" />
    </svg>
  )
}

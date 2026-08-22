/**
 * A small hand-rolled icon set. Every glyph is drawn on the same 16px grid with
 * the same 1.5px stroke so the chrome reads as one family.
 */
interface Props {
  size?: number
  className?: string
  style?: React.CSSProperties
}

function Svg({ size = 16, children, className, style }: Props & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const Icon = {
  cursor: (p: Props) => (
    <Svg {...p}>
      <path d="M3 2l4.2 11 1.7-4.4L13.3 7z" fill="currentColor" stroke="none" />
    </Svg>
  ),
  hand: (p: Props) => (
    <Svg {...p}>
      <path d="M5 8V3.6a1.1 1.1 0 012.2 0V7m0-.6V3a1.1 1.1 0 112.2 0v4m0-.4a1.1 1.1 0 112.2 0V8m0-.6a1.1 1.1 0 012.1 0v3.2c0 2.2-1.7 3.9-3.9 3.9H8.6c-1.4 0-2.3-.6-3-1.6L3.4 10a1.1 1.1 0 011.7-1.4L6.4 10" />
    </Svg>
  ),
  sticky: (p: Props) => (
    <Svg {...p}>
      <path d="M2.5 3.1c0-.3.3-.6.6-.6h9.8c.3 0 .6.3.6.6v6.3L9.4 13.5H3.1a.6.6 0 01-.6-.6z" />
      <path d="M13.5 9.4H10a.6.6 0 00-.6.6v3.5" />
    </Svg>
  ),
  text: (p: Props) => (
    <Svg {...p}>
      <path d="M3 3.5h10M8 3.5v9M5.8 12.5h4.4" />
    </Svg>
  ),
  board: (p: Props) => (
    <Svg {...p}>
      <rect x="2.2" y="2.5" width="4.6" height="11" rx="1" />
      <rect x="9.2" y="2.5" width="4.6" height="7" rx="1" />
    </Svg>
  ),
  frame: (p: Props) => (
    <Svg {...p}>
      <path d="M4.5 1.5v13M11.5 1.5v13M1.5 4.5h13M1.5 11.5h13" />
    </Svg>
  ),
  square: (p: Props) => (
    <Svg {...p}>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.8" />
    </Svg>
  ),
  circle: (p: Props) => (
    <Svg {...p}>
      <circle cx="8" cy="8" r="5.5" />
    </Svg>
  ),
  diamond: (p: Props) => (
    <Svg {...p}>
      <path d="M8 2l6 6-6 6-6-6z" />
    </Svg>
  ),
  triangle: (p: Props) => (
    <Svg {...p}>
      <path d="M8 2.5l5.5 10.5h-11z" />
    </Svg>
  ),
  pen: (p: Props) => (
    <Svg {...p}>
      <path d="M2.5 13.5l1-3L10.6 3.4a1.4 1.4 0 012 2L5.5 12.5z" />
      <path d="M9.5 4.5l2 2" />
    </Svg>
  ),
  arrow: (p: Props) => (
    <Svg {...p}>
      <path d="M2.5 13.5L13 3" />
      <path d="M8.4 3h4.6v4.6" />
    </Svg>
  ),
  image: (p: Props) => (
    <Svg {...p}>
      <rect x="2" y="3" width="12" height="10" rx="1.6" />
      <circle cx="5.8" cy="6.4" r="1.1" />
      <path d="M2.4 11.4l3.3-3 2.6 2.4 2-1.8 3.3 3" />
    </Svg>
  ),
  plus: (p: Props) => (
    <Svg {...p}>
      <path d="M8 3.5v9M3.5 8h9" />
    </Svg>
  ),
  check: (p: Props) => (
    <Svg {...p} size={p.size ?? 12}>
      <path d="M3 8.4l3.2 3L13 4.5" strokeWidth={2.2} />
    </Svg>
  ),
  close: (p: Props) => (
    <Svg {...p}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </Svg>
  ),
  chevronDown: (p: Props) => (
    <Svg {...p}>
      <path d="M4 6l4 4 4-4" />
    </Svg>
  ),
  chevronRight: (p: Props) => (
    <Svg {...p}>
      <path d="M6 4l4 4-4 4" />
    </Svg>
  ),
  undo: (p: Props) => (
    <Svg {...p}>
      <path d="M3 7h6.5a3.5 3.5 0 010 7H6" />
      <path d="M5.5 4.2L2.7 7l2.8 2.8" />
    </Svg>
  ),
  redo: (p: Props) => (
    <Svg {...p}>
      <path d="M13 7H6.5a3.5 3.5 0 000 7H10" />
      <path d="M10.5 4.2L13.3 7l-2.8 2.8" />
    </Svg>
  ),
  layers: (p: Props) => (
    <Svg {...p}>
      <path d="M8 1.8l6 3.2-6 3.2-6-3.2z" />
      <path d="M2 8.6l6 3.2 6-3.2" />
      <path d="M2 11.6l6 3.2 6-3.2" />
    </Svg>
  ),
  people: (p: Props) => (
    <Svg {...p}>
      <circle cx="6" cy="5.5" r="2.4" />
      <path d="M1.8 13.6c0-2.3 1.9-4.1 4.2-4.1s4.2 1.8 4.2 4.1" />
      <path d="M10.8 3.4a2.4 2.4 0 010 4.4M11.6 9.8c1.6.4 2.7 1.9 2.7 3.8" />
    </Svg>
  ),
  search: (p: Props) => (
    <Svg {...p}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.4 10.4L14 14" />
    </Svg>
  ),
  trash: (p: Props) => (
    <Svg {...p}>
      <path d="M2.8 4.2h10.4M6 4.2V2.9h4v1.3M4.2 4.2l.6 8.5c0 .5.4.9.9.9h4.6c.5 0 .9-.4.9-.9l.6-8.5" />
    </Svg>
  ),
  copy: (p: Props) => (
    <Svg {...p}>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.4" />
      <path d="M10.5 5.5v-2a1.4 1.4 0 00-1.4-1.4H3.9A1.4 1.4 0 002.5 3.5v5.2c0 .8.6 1.4 1.4 1.4h1.6" />
    </Svg>
  ),
  lock: (p: Props) => (
    <Svg {...p}>
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
    </Svg>
  ),
  unlock: (p: Props) => (
    <Svg {...p}>
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 014.8-1" />
    </Svg>
  ),
  eye: (p: Props) => (
    <Svg {...p}>
      <path d="M1.5 8S3.8 3.8 8 3.8 14.5 8 14.5 8 12.2 12.2 8 12.2 1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="1.8" />
    </Svg>
  ),
  eyeOff: (p: Props) => (
    <Svg {...p}>
      <path d="M6.3 4.1A6 6 0 018 3.8C12.2 3.8 14.5 8 14.5 8a11 11 0 01-2 2.5M4 4.9A11 11 0 001.5 8S3.8 12.2 8 12.2c.8 0 1.5-.1 2.1-.4" />
      <path d="M2.5 2.5l11 11" />
    </Svg>
  ),
  grid: (p: Props) => (
    <Svg {...p}>
      <path d="M2 6h12M2 10h12M6 2v12M10 2v12" opacity={0.9} />
    </Svg>
  ),
  magnet: (p: Props) => (
    <Svg {...p}>
      <path d="M4 2.5v5.2a4 4 0 108 0V2.5" />
      <path d="M4 6.8h3.4M8.6 6.8H12" />
    </Svg>
  ),
  clock: (p: Props) => (
    <Svg {...p} size={p.size ?? 12}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.6V8l2.4 1.6" />
    </Svg>
  ),
  list: (p: Props) => (
    <Svg {...p} size={p.size ?? 12}>
      <path d="M3 4.5h10M3 8h10M3 11.5h6" />
    </Svg>
  ),
  note: (p: Props) => (
    <Svg {...p} size={p.size ?? 12}>
      <path d="M3.5 2.5h6.5l2.5 2.5v8.5h-9z" />
      <path d="M5.8 7.5h4.4M5.8 10.2h3" />
    </Svg>
  ),
  align: {
    left: (p: Props) => (
      <Svg {...p}>
        <path d="M2.5 2v12" />
        <rect x="4.5" y="4" width="8" height="3" rx="0.8" fill="currentColor" stroke="none" />
        <rect x="4.5" y="9" width="5" height="3" rx="0.8" fill="currentColor" stroke="none" />
      </Svg>
    ),
    hcenter: (p: Props) => (
      <Svg {...p}>
        <path d="M8 2v12" />
        <rect x="3" y="4" width="10" height="3" rx="0.8" fill="currentColor" stroke="none" />
        <rect x="5" y="9" width="6" height="3" rx="0.8" fill="currentColor" stroke="none" />
      </Svg>
    ),
    right: (p: Props) => (
      <Svg {...p}>
        <path d="M13.5 2v12" />
        <rect x="3.5" y="4" width="8" height="3" rx="0.8" fill="currentColor" stroke="none" />
        <rect x="6.5" y="9" width="5" height="3" rx="0.8" fill="currentColor" stroke="none" />
      </Svg>
    ),
    top: (p: Props) => (
      <Svg {...p}>
        <path d="M2 2.5h12" />
        <rect x="4" y="4.5" width="3" height="8" rx="0.8" fill="currentColor" stroke="none" />
        <rect x="9" y="4.5" width="3" height="5" rx="0.8" fill="currentColor" stroke="none" />
      </Svg>
    ),
    vcenter: (p: Props) => (
      <Svg {...p}>
        <path d="M2 8h12" />
        <rect x="4" y="3" width="3" height="10" rx="0.8" fill="currentColor" stroke="none" />
        <rect x="9" y="5" width="3" height="6" rx="0.8" fill="currentColor" stroke="none" />
      </Svg>
    ),
    bottom: (p: Props) => (
      <Svg {...p}>
        <path d="M2 13.5h12" />
        <rect x="4" y="3.5" width="3" height="8" rx="0.8" fill="currentColor" stroke="none" />
        <rect x="9" y="6.5" width="3" height="5" rx="0.8" fill="currentColor" stroke="none" />
      </Svg>
    ),
  },
}

export type IconName = keyof typeof Icon

/* ============================================================================
   PRESET — MERIDIAN
   The same engine, inverted: a light scheme, a value that climbs instead of
   falling, the rail on the left, centred panels, automatic panel timing, and
   no film at all — the colour grade paints the backdrop on its own.

   Copy this file to start a new site. Point `media.tiers` at your own footage
   and the film takes over the background.
   ========================================================================== */
window.SCROLL_VIDEO_CONFIG = {

  seo: {
    title: 'MERIDIAN — 412 metres of it',
    description: 'A vertical neighbourhood on the harbour. Forty-two floors, eleven of them public.',
    siteName: 'MERIDIAN'
  },

  fonts: {
    href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400&family=Inter:wght@200;300;400&family=JetBrains+Mono:wght@300;400&display=swap'
  },

  theme: {
    bg: '#f3ede5',
    ink: '#16130f',
    muted: '#6d6259',
    accent: '#b4552b',
    ctaInk: '#fffaf4',
    panelBg: 'rgba(255,252,247,.80)',
    vignette: 'rgba(22,19,15,.12)',
    fontDisplay: "'Fraunces',serif",
    fontBody: "'Inter',sans-serif",
    fontMono: "'JetBrains Mono',monospace",
    weightHeading: 200,
    weightBody: 300,
    weightLede: 300,
    h1: 'clamp(40px,6.4vw,92px)',
    h2: 'clamp(28px,4vw,56px)',
    brandTrack: '.28em'
  },

  scroll: { length: '600vh', smoothing: 0.12 },

  brand: { word: 'MERIDIAN', tagline: 'Harbour district' },
  mission: ['Tower 01 · *Completing 2028*', 'North quay · Plot 3'],

  status: {
    rows: [
      [{ k: 'PLOT', v: '3 · North quay' }, { k: 'FLOORS', v: '42' }],
      [{ k: 'STAGE', v: (p) => (p < 0.5 ? 'PODIUM' : 'TOWER') },
       { k: 'FLOOR', v: (p, m) => String(Math.max(1, Math.round(m / 9.8))) }]
    ]
  },

  readout: { from: 0, to: 412, unit: 'M', pad: 3 },
  rail: { side: 'left', max: 412, step: 50, majorEvery: 100 },

  zones: [
    { at: [0.00, 0.25], value: [0, 24],    label: 'THE PODIUM' },
    { at: [0.25, 0.55], value: [24, 168],  label: 'MID-RISE' },
    { at: [0.55, 0.82], value: [168, 340], label: 'SKY LOBBY' },
    { at: [0.82, 1.00], value: [340, 412], label: 'THE CROWN' }
  ],

  cue: { text: 'SCROLL TO RISE' },

  stage: {
    /* With no film behind it, the grade is the background: paint it directly
       rather than multiplying it into footage. */
    gradeBlend: 'normal',
    gradeOpacity: 1,
    vignette: true,
    grade: [
      [0.00, '#efe6d9'], [0.30, '#e6dccd'],
      [0.65, '#dfd8cf'], [1.00, '#cfd8dc']
    ]
  },

  loader: { message: 'Setting out', ready: 'Ready' },

  /* No footage yet. Drop an MP4 beside this page and uncomment:
     media: { tiers: ['ascent.mp4'], keyframes: ['still-0.jpg', 'still-1.jpg'] },  */
  media: { tiers: [] },

  /* No `at` on any panel: the engine spreads them evenly down the track. */
  panels: [
    {
      id: 'hero',
      align: 'center',
      width: 820,
      eyebrow: 'Plot 3 · North quay',
      heading: 'Four hundred and twelve metres of neighbourhood.',
      body: 'Forty-two floors on the harbour, **eleven of them public** — a market, two gardens and a swimming hall you reach by lift instead of by street.'
    },
    {
      id: 'podium',
      align: 'center',
      eyebrow: 'Level 00–06 · The podium',
      heading: 'The first six floors belong to the city.',
      body: 'No lobby, no barrier, no card reader. `1,900 m²` of ground-level room that stays open when the offices above it close.'
    },
    {
      id: 'sky',
      align: 'center',
      eyebrow: 'Level 34 · Sky lobby',
      heading: 'Halfway up, the building opens again.',
      body: 'A second ground floor at `168 metres` — daylight on four sides, and the only place in the district you can see both bridges at once.'
    },
    {
      id: 'invite',
      align: 'center',
      persist: true,
      width: 820,
      eyebrow: 'Level 42 · The crown',
      lines: [['*42* floors.', '11 public.'], ['Completing *2028*.']],
      body: 'Registration opens to the district first. Everyone else in the spring.',
      cta: { label: 'Register interest', href: '#register', arrow: '↑' },
      fine: 'No obligation · One email, then nothing until there is news'
    }
  ]
}

/* ============================================================================
   PRESET — ABYSSAL
   A vertical descent to the floor of the Pacific. Dark, cyan, instrument-led.
   Every key here is documented in ../README.md.
   ========================================================================== */
window.SCROLL_VIDEO_CONFIG = {

  seo: {
    lang: 'en',
    title: 'ABYSSAL — How deep will you go?',
    description: 'ABYSSAL takes eight civilians per year to the ocean floor aboard the submersible EREBUS. 3,800 meters. March 2027.',
    siteName: 'ABYSSAL',
    ogDescription: 'Eight civilians a year. One submersible. A vertical voyage to 3,800 meters — the floor of the Pacific. Departing March 2027.',
    ogImage: 'https://sterlingcdn.b-cdn.net/abyssal/abyssalwelcomeimage.jpg',
    ogImageAlt: 'The EREBUS submersible descending into the deep — ABYSSAL expeditions'
  },

  fonts: {
    href: 'https://fonts.googleapis.com/css2?family=Michroma&family=Saira:wght@100;200;300&family=IBM+Plex+Mono:wght@300;400&display=swap'
  },

  theme: {
    bg: '#000000',
    ink: '#e9f3f6',
    muted: '#7ea6b5',
    accent: '#3ce6ff',
    ctaInk: '#00131a',
    panelBg: 'rgba(1,5,10,.72)',
    vignette: 'rgba(0,0,0,.55)',
    fontDisplay: "'Michroma',sans-serif",
    fontBody: "'Saira',sans-serif",
    fontMono: "'IBM Plex Mono',monospace"
  },

  scroll: { length: '900vh', smoothing: 0.14 },

  brand: { word: 'ABYSSAL', tagline: 'Deep-sea expeditions' },

  mission: ['Expedition 07 · DSV *EREBUS*', 'Pacific trench · Sector 9'],

  status: {
    rows: [
      [{ k: 'LAT', v: '11.3733 N' }, { k: 'LON', v: '142.5917 E' }],
      [
        { k: 'BALLAST', v: (p) => (p < 0.03 ? 'DRY' : 'FLOODED') },
        { k: 'O₂', v: '99.4%' },
        { k: 'HULL', v: (p, depth) => (1 + depth / 10).toFixed(1) + ' ATM' }
      ]
    ]
  },

  readout: { from: 0, to: 3800, unit: 'M', pad: 4 },

  rail: { max: 3800, ticks: [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 3800], majorEvery: 1000 },

  /* Progress does not map to depth evenly — the first fifth of the scroll is
     spent barely leaving the surface, the fourth crosses 2,700 metres. */
  zones: [
    { at: [0.00, 0.20], value: [0, 5],       label: 'SURFACE' },
    { at: [0.20, 0.40], value: [5, 200],     label: 'SUNLIT ZONE' },
    { at: [0.40, 0.60], value: [200, 1000],  label: 'TWILIGHT ZONE' },
    { at: [0.60, 0.80], value: [1000, 3700], label: 'MIDNIGHT ZONE' },
    { at: [0.80, 1.00], value: [3700, 3800], label: 'THE FLOOR' }
  ],

  cue: { text: 'SCROLL TO DIVE' },

  stage: {
    gradeBlend: 'multiply',
    gradeOpacity: 0.55,
    grade: [
      [0.00, '#07131f'], [0.20, '#04283b'], [0.40, '#020d18'],
      [0.60, '#01050a'], [0.80, '#000000'], [1.00, '#000000']
    ]
  },

  loader: { message: 'Flooding ballast tanks', ready: 'Descent ready' },

  media: {
    /* Best source first. A one-URL tier is a single stitched film and gets
       baked to frames; a multi-URL tier is clips whose end and start frames
       match, so the hand-off is continuous by construction. */
    tiers: [
      'descent-final.mp4',                                    // dropped next to this page
      'https://sterlingcdn.b-cdn.net/abyssal/descent-final.mp4',
      'https://d8j0ntlcm91z4.cloudfront.net/user_2vQdbkYJJTfppgV7PaStt9K0SSy/hf_20260703_065559_98fa7d94-ff7d-4119-bdf5-65e8e693928c.mp4',
      'https://d8j0ntlcm91z4.cloudfront.net/user_2vQdbkYJJTfppgV7PaStt9K0SSy/hf_20260703_064435_44efdbc5-113a-459a-91a3-d4ff6caf7c58.mp4',
      [
        'https://d8j0ntlcm91z4.cloudfront.net/user_2vQdbkYJJTfppgV7PaStt9K0SSy/hf_20260703_055829_2a8b442e-ff52-4677-adc0-63d0423ac974.mp4',
        'https://d8j0ntlcm91z4.cloudfront.net/user_2vQdbkYJJTfppgV7PaStt9K0SSy/hf_20260703_055850_52ef1f4c-fc43-476d-a730-10e44f77b7f9.mp4',
        'https://d8j0ntlcm91z4.cloudfront.net/user_2vQdbkYJJTfppgV7PaStt9K0SSy/hf_20260703_055903_5287e9c4-41aa-4c8f-8dda-54581f0df46e.mp4',
        'https://d8j0ntlcm91z4.cloudfront.net/user_2vQdbkYJJTfppgV7PaStt9K0SSy/hf_20260703_055925_63f9e85a-137f-4426-a3fa-de7d382b1cd1.mp4',
        'https://d8j0ntlcm91z4.cloudfront.net/user_2vQdbkYJJTfppgV7PaStt9K0SSy/hf_20260703_055940_9c953b9f-5043-4a43-8c7a-277975811474.mp4'
      ]
    ],
    /* The six shared boundary frames: shown while the film downloads, and
       crossfaded on their own if no tier decodes at all. */
    keyframes: [
      'https://d8j0ntlcm91z4.cloudfront.net/user_2vQdbkYJJTfppgV7PaStt9K0SSy/hf_20260703_055645_08c68ce7-1756-43d8-9209-ea41624a2468.png',
      'https://d8j0ntlcm91z4.cloudfront.net/user_2vQdbkYJJTfppgV7PaStt9K0SSy/hf_20260703_055655_9bd6d299-78a5-4b18-877f-d918ffe00ea7.png',
      'https://d8j0ntlcm91z4.cloudfront.net/user_2vQdbkYJJTfppgV7PaStt9K0SSy/hf_20260703_055704_34f4b58f-c2f1-4878-a49e-1c52235f01fd.png',
      'https://d8j0ntlcm91z4.cloudfront.net/user_2vQdbkYJJTfppgV7PaStt9K0SSy/hf_20260703_055711_e6a420f2-39b6-4df7-8eb4-5b3359b0cea6.png',
      'https://d8j0ntlcm91z4.cloudfront.net/user_2vQdbkYJJTfppgV7PaStt9K0SSy/hf_20260703_055719_2340906d-7d52-419b-a411-a9ebca49c936.png',
      'https://d8j0ntlcm91z4.cloudfront.net/user_2vQdbkYJJTfppgV7PaStt9K0SSy/hf_20260703_055728_55b3feb1-fe6e-4c48-b039-21a72f147c41.png'
    ],
    poster: 'https://d8j0ntlcm91z4.cloudfront.net/user_2vQdbkYJJTfppgV7PaStt9K0SSy/hf_20260703_055645_08c68ce7-1756-43d8-9209-ea41624a2468.png'
  },

  panels: [
    {
      id: 'hero',
      at: [-0.01, 0.00, 0.10, 0.17],
      eyebrow: 'Expedition 07 · Boarding 2027',
      heading: 'How deep<br>will you go?',
      body: 'Eight civilians a year. One submersible. A vertical voyage to **3,800 meters** — the floor of the Pacific. Scrolling down is diving down.'
    },
    {
      id: 'sunlit',
      at: [0.21, 0.25, 0.33, 0.38],
      eyebrow: 'Zone 01 · Sunlit · 0–200 m',
      heading: 'Ninety percent of all marine life lives in this thin, bright sliver.',
      body: "The epipelagic zone is every ocean you have ever pictured — and it is `less than 5%` of the ocean's volume. EREBUS clears it in four minutes."
    },
    {
      id: 'twilight',
      at: [0.41, 0.45, 0.53, 0.58],
      eyebrow: 'Zone 02 · Twilight · 200–1,000 m',
      heading: 'Past 200 meters, sunlight fails.',
      body: 'Every night the twilight zone stages the largest migration of animals on Earth — `billions of tonnes` of life rising and sinking in darkness. Your floodlights come on here. They stay on.'
    },
    {
      id: 'midnight',
      at: [0.60, 0.64, 0.69, 0.73],
      eyebrow: 'Zone 03 · Midnight · 1,000–3,800 m',
      heading: 'No sunlight has ever touched this water.',
      body: 'In the bathypelagic, `~90%` of creatures make their own light. More people have stood on the Moon than have watched this starfield with their own eyes.'
    },
    {
      id: 'specs',
      at: [0.74, 0.78, 0.84, 0.88],
      width: 760,
      eyebrow: 'DSV EREBUS · Vessel file',
      heading: 'Built for one direction. Down.',
      specColumns: 2,
      specs: [
        { k: 'Pressure hull', v: '90 mm titanium sphere · *2,300 dives certified*' },
        { k: 'Depth rating',  v: '*4,000 m* operational · 6,000 m tested' },
        { k: 'Viewport',      v: '180° borosilicate ring · *cyan nav halo*' },
        { k: 'Crew',          v: '2 pilots · *2 passengers* per descent' },
        { k: 'Life support',  v: '*96 h* autonomous · dual scrubber loop' },
        { k: 'Descent time',  v: 'Surface to floor in *2 h 10 m*' }
      ]
    },
    {
      id: 'offer',
      at: [0.90, 0.94, 1.00, 1.01],
      persist: true,
      eyebrow: 'Zone 04 · The floor · 3,800 m',
      lines: [
        ['*8* seats.', '$250,000.'],
        ['Departing *March 2027*.']
      ],
      body: 'Hydrothermal vents at 3,800 meters run hotter than `370 °C` against water a breath above freezing — and whole ecosystems live on the chemistry, not the sun. Hold there. Then come back changed.',
      cta: {
        label: 'Join the Manifest',
        href: '#manifest',
        onClick: function () {
          alert('Manifest request logged. ABYSSAL crew will contact you. — EXP·07')
          return false
        }
      },
      fine: 'Medical clearance required · No prior dive experience necessary'
    }
  ]
}

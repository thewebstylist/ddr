/**
 * Sterling Mobile Mirror — design tokens + the overlay stylesheet.
 *
 * Everything here is injected into a Shadow DOM, so none of it leaks into the
 * host page and none of the host page's CSS can reach in. The visual language
 * is Sterling Creations AI: black glass, white type, hairline edges, and two
 * accents used sparingly — neon pink for state, electric blue for focus.
 */

(() => {
  const SMM = (globalThis.__SMM__ = globalThis.__SMM__ || {});

  /** Logical size of the iPhone 15 Pro Max viewport, in CSS pixels. */
  SMM.SCREEN = { width: 430, height: 932 };

  /** Bezel + band thickness around the screen, at scale 1. */
  SMM.FRAME = { bezel: 13, band: 4 };

  SMM.SCALE = { min: 0.3, max: 1, step: 0.05, default: 0.55 };

  SMM.CSS = `
:host {
  /* Palette */
  --smm-ink: #06070B;
  --smm-ink-2: #0D0F15;
  --smm-paper: #FFFFFF;
  --smm-edge: rgba(255, 255, 255, 0.13);
  --smm-edge-strong: rgba(255, 255, 255, 0.28);
  --smm-muted: rgba(255, 255, 255, 0.55);
  --smm-pink: #FF2E88;
  --smm-blue: #2ED4FF;

  /* Type */
  --smm-font: "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI",
              Inter, Roboto, system-ui, sans-serif;
  --smm-micro: 9px;

  /* Titanium — dark (Black Titanium) is the default */
  --smm-band: linear-gradient(158deg, #7c7d84 0%, #3a3b41 18%, #26272b 42%,
                              #4a4b52 62%, #1d1e22 82%, #6a6b72 100%);
  --smm-band-edge: rgba(255, 255, 255, 0.42);
  --smm-bezel: #050506;
  --smm-button: linear-gradient(180deg, #6e6f76, #303137);

  contain: layout style;
  font-family: var(--smm-font);
  color: var(--smm-paper);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* Natural Titanium — the "light" frame */
:host(.smm-light) {
  --smm-band: linear-gradient(158deg, #ffffff 0%, #ccccd2 16%, #a9aab2 40%,
                              #e9eaee 60%, #9d9ea6 82%, #f2f3f6 100%);
  --smm-band-edge: rgba(255, 255, 255, 0.85);
  --smm-bezel: #0b0b0d;
  --smm-button: linear-gradient(180deg, #f0f1f4, #b6b7bf);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

button {
  font: inherit;
  color: inherit;
  background: none;
  border: 0;
  cursor: pointer;
}

/* ------------------------------------------------------------------ *
 * Stage — sized by JS to the scaled phone, so drag maths stay honest
 * ------------------------------------------------------------------ */

.stage {
  position: relative;
  width: 100%;
  height: 100%;
  animation: smm-rise 320ms cubic-bezier(0.2, 0.9, 0.25, 1) both;
}

.stage.is-leaving { animation: smm-fall 180ms ease-in both; }

@keyframes smm-rise {
  from { opacity: 0; transform: translate3d(0, 18px, 0) scale(0.985); }
  to   { opacity: 1; transform: none; }
}
@keyframes smm-fall {
  to { opacity: 0; transform: translate3d(0, 10px, 0) scale(0.99); }
}

@media (prefers-reduced-motion: reduce) {
  .stage, .stage.is-leaving { animation: none; }
}

/* ------------------------------------------------------------------ *
 * Plate — brand mark, live host name, scale readout. Doubles as a
 * drag handle so the whole header is grabbable.
 * ------------------------------------------------------------------ */

.plate {
  position: absolute;
  right: 0;
  bottom: calc(100% + 10px);
  display: flex;
  align-items: center;
  gap: 10px;
  height: 30px;
  max-width: 92vw;
  padding: 0 12px 0 11px;
  border: 1px solid var(--smm-edge);
  border-radius: 999px;
  background: rgba(6, 7, 11, 0.82);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.07);
  cursor: grab;
  user-select: none;
  white-space: nowrap;
}

.plate:active { cursor: grabbing; }

.plate__mark {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 2px;
  background: var(--smm-pink);
  box-shadow: 0 0 10px rgba(255, 46, 136, 0.75);
}

.plate__name {
  font-size: var(--smm-micro);
  letter-spacing: 0.17em;
  text-transform: uppercase;
  color: var(--smm-paper);
}

.plate__rule {
  width: 1px;
  height: 12px;
  background: var(--smm-edge);
}

.plate__host {
  overflow: hidden;
  max-width: 190px;
  font-size: 10px;
  letter-spacing: 0.02em;
  color: var(--smm-muted);
  text-overflow: ellipsis;
}

.plate__scale {
  font-size: var(--smm-micro);
  letter-spacing: 0.14em;
  color: var(--smm-blue);
  font-variant-numeric: tabular-nums;
}

/* ------------------------------------------------------------------ *
 * Rail — the compact control column, left of the phone
 * ------------------------------------------------------------------ */

.rail {
  position: absolute;
  top: 0;
  right: calc(100% + 8px);
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 7px 6px;
  border: 1px solid var(--smm-edge);
  border-radius: 16px;
  background: rgba(6, 7, 11, 0.82);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.07);
}

.rail__sep {
  height: 1px;
  margin: 1px 4px;
  background: var(--smm-edge);
}

.btn {
  position: relative;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.78);
  transition: color 140ms ease, background-color 140ms ease,
              border-color 140ms ease, transform 140ms ease;
}

.btn svg { width: 16px; height: 16px; display: block; }

.btn:hover {
  color: var(--smm-paper);
  background: rgba(255, 255, 255, 0.07);
  border-color: var(--smm-edge-strong);
}

.btn:active { transform: scale(0.94); }

.btn:focus-visible {
  outline: none;
  border-color: var(--smm-blue);
  box-shadow: 0 0 0 3px rgba(46, 212, 255, 0.22);
}

.btn.is-grip { cursor: grab; color: rgba(255, 255, 255, 0.4); }
.btn.is-grip:active { cursor: grabbing; }

.btn.is-on {
  color: var(--smm-pink);
  border-color: rgba(255, 46, 136, 0.5);
  background: rgba(255, 46, 136, 0.1);
}

.btn.is-danger:hover {
  color: var(--smm-pink);
  border-color: rgba(255, 46, 136, 0.45);
  background: rgba(255, 46, 136, 0.1);
}

.btn.is-busy { color: var(--smm-blue); }
.btn.is-busy svg { animation: smm-spin 900ms linear infinite; }

@keyframes smm-spin { to { transform: rotate(360deg); } }

/* Tooltip — drawn to the left of the rail, never clipped by the page */
.btn::after {
  content: attr(data-tip);
  position: absolute;
  right: calc(100% + 9px);
  top: 50%;
  transform: translateY(-50%) translateX(4px);
  padding: 4px 8px;
  border: 1px solid var(--smm-edge);
  border-radius: 7px;
  background: rgba(6, 7, 11, 0.95);
  color: var(--smm-paper);
  font-size: var(--smm-micro);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 130ms ease, transform 130ms ease;
}

.btn:hover::after,
.btn:focus-visible::after { opacity: 1; transform: translateY(-50%) translateX(0); }

/* ------------------------------------------------------------------ *
 * Device — iPhone 15 Pro Max
 * ------------------------------------------------------------------ */

.device {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: top left;
  will-change: transform;
}

.device__band {
  position: relative;
  border-radius: 68px;
  background: var(--smm-band);
  padding: var(--smm-band-w, 3px);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.4),
    0 18px 34px -14px rgba(0, 0, 0, 0.5),
    0 40px 70px -22px rgba(0, 0, 0, 0.55),
    0 80px 140px -40px rgba(0, 0, 0, 0.45),
    inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}

/* Hairline highlight riding the outer edge of the titanium band */
.device__band::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(148deg,
    var(--smm-band-edge) 0%,
    rgba(255, 255, 255, 0.08) 14%,
    rgba(255, 255, 255, 0) 30%,
    rgba(255, 255, 255, 0) 58%,
    rgba(255, 255, 255, 0.1) 74%,
    var(--smm-band-edge) 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
}

.device__bezel {
  position: relative;
  border-radius: 65px;
  background: var(--smm-bezel);
  padding: var(--smm-bezel-w, 13px);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}

/* Side buttons, machined out of the same titanium as the band */
.btnstack {
  position: absolute;
  width: 3px;
  border-radius: 2px;
  background: var(--smm-button);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  pointer-events: none;
}

.btnstack--action { left: -3px; top: 118px; height: 32px; }
.btnstack--up     { left: -3px; top: 178px; height: 62px; }
.btnstack--down   { left: -3px; top: 254px; height: 62px; }
.btnstack--power  { right: -3px; top: 208px; height: 100px; }

/* ------------------------------------------------------------------ *
 * Screen
 * ------------------------------------------------------------------ */

.screen {
  position: relative;
  overflow: hidden;
  width: var(--smm-screen-w, 430px);
  height: var(--smm-screen-h, 932px);
  border-radius: 52px;
  background: #ffffff;
  isolation: isolate;
}

.screen__frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: #ffffff;
}

/* Glass sheen — kept faint so the preview stays readable */
.screen__glare {
  position: absolute;
  inset: 0;
  z-index: 3;
  border-radius: inherit;
  background: linear-gradient(118deg,
    rgba(255, 255, 255, 0.13) 0%,
    rgba(255, 255, 255, 0.04) 22%,
    rgba(255, 255, 255, 0) 44%);
  pointer-events: none;
}

/* Dynamic Island */
.island {
  position: absolute;
  z-index: 4;
  top: 11px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 125px;
  height: 35px;
  padding-right: 9px;
  border-radius: 20px;
  background: #000;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05),
              0 1px 3px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}

.island__lens {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 30%, rgba(70, 110, 160, 0.55) 0%, rgba(10, 14, 22, 0.9) 46%, #05070b 100%);
  box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.14);
}

/* Home indicator — the difference blend keeps it visible on light and dark sites */
.home {
  position: absolute;
  z-index: 4;
  bottom: 9px;
  left: 50%;
  transform: translateX(-50%);
  width: 140px;
  height: 5px;
  border-radius: 3px;
  background: #fff;
  mix-blend-mode: difference;
  opacity: 0.72;
  pointer-events: none;
}

/* ------------------------------------------------------------------ *
 * Fallback card — shown when a site refuses to be framed
 * ------------------------------------------------------------------ */

.fallback {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 14px;
  padding: 40px 30px;
  border-radius: inherit;
  background:
    radial-gradient(120% 80% at 50% 0%, rgba(255, 46, 136, 0.14) 0%, rgba(6, 7, 11, 0) 55%),
    var(--smm-ink);
  text-align: left;
}

.fallback.is-shown { display: flex; }

.fallback__tag {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: var(--smm-micro);
  letter-spacing: 0.17em;
  text-transform: uppercase;
  color: var(--smm-pink);
}

.fallback__tag::before {
  content: "";
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}

.fallback__title { font-size: 21px; font-weight: 600; line-height: 1.25; letter-spacing: -0.01em; }
.fallback__body  { font-size: 13px; line-height: 1.55; color: var(--smm-muted); }
.fallback__body strong { color: var(--smm-paper); font-weight: 500; }

.fallback__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }

.pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 14px;
  border: 1px solid var(--smm-edge-strong);
  border-radius: 999px;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
}

.pill svg { width: 15px; height: 15px; display: block; flex: 0 0 auto; }

.pill:hover { background: rgba(255, 255, 255, 0.08); }

.pill--primary {
  border-color: transparent;
  background: var(--smm-paper);
  color: #06070B;
}

.pill--primary:hover { background: var(--smm-blue); color: #04121A; }

.fallback__note {
  font-size: 10px;
  line-height: 1.5;
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.34);
}

/* ------------------------------------------------------------------ *
 * Toast — capture + sync feedback, anchored under the plate
 * ------------------------------------------------------------------ */

.toast {
  position: absolute;
  right: 0;
  bottom: calc(100% + 48px);
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 320px;
  padding: 8px 13px;
  border: 1px solid var(--smm-edge);
  border-radius: 999px;
  background: rgba(6, 7, 11, 0.92);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
  font-size: 11px;
  letter-spacing: 0.03em;
  white-space: nowrap;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 180ms ease, transform 180ms ease;
  pointer-events: none;
}

.toast.is-shown { opacity: 1; transform: none; }
.toast::before {
  content: "";
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--smm-blue);
  box-shadow: 0 0 8px var(--smm-blue);
}
.toast.is-error::before { background: var(--smm-pink); box-shadow: 0 0 8px var(--smm-pink); }

/* ------------------------------------------------------------------ *
 * Capture mode — hide our own chrome so exports show only the artwork
 * ------------------------------------------------------------------ */

:host(.smm-capturing) .rail,
:host(.smm-capturing) .plate,
:host(.smm-capturing) .toast { opacity: 0 !important; transition: none !important; }
`;
})();

#!/usr/bin/env node
/* ============================================================================
   Flattens a preset into one self-contained HTML file in dist/.
   CSS, engine and config go inline; the <head> gets the preset's real title
   and social tags baked in, so crawlers see them without running JavaScript.

       node build.mjs                # every preset in ./presets
       node build.mjs abyssal        # just one
   ========================================================================== */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createContext, runInContext } from 'node:vm'

const here = dirname(fileURLToPath(import.meta.url))
const read = (p) => readFileSync(join(here, p), 'utf8')

const css = read('template.css')
const engine = read('template.js')

const wanted = process.argv.slice(2)
const presets = (wanted.length ? wanted.map((n) => n.replace(/\.js$/, '') + '.js')
  : readdirSync(join(here, 'presets')).filter((f) => f.endsWith('.js'))).sort()

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const safeScript = (s) => s.replace(/<\/script/gi, '<\\/script')

mkdirSync(join(here, 'dist'), { recursive: true })

for (const file of presets) {
  const source = read(join('presets', file))
  const name = file.replace(/\.js$/, '')

  /* Run the preset in a sandbox purely to read its metadata. */
  const sandbox = { window: {}, console }
  runInContext(source, createContext(sandbox))
  const cfg = sandbox.window.SCROLL_VIDEO_CONFIG
  if (!cfg) {
    console.error(`  ✕ ${file} — sets no window.SCROLL_VIDEO_CONFIG`)
    continue
  }
  const seo = cfg.seo || {}
  const theme = cfg.theme || {}
  const title = seo.title || cfg.brand?.word || name

  const meta = []
  const tag = (attr, key, val) => { if (val) meta.push(`<meta ${attr}="${key}" content="${esc(val)}">`) }
  tag('name', 'description', seo.description)
  tag('name', 'theme-color', seo.themeColor || theme.bg)
  tag('property', 'og:type', 'website')
  tag('property', 'og:site_name', seo.siteName)
  tag('property', 'og:title', seo.ogTitle || seo.title)
  tag('property', 'og:description', seo.ogDescription || seo.description)
  tag('property', 'og:image', seo.ogImage)
  if (seo.ogImage) {
    tag('property', 'og:image:width', seo.ogImageWidth || 1200)
    tag('property', 'og:image:height', seo.ogImageHeight || 630)
    tag('property', 'og:image:alt', seo.ogImageAlt)
  }
  tag('name', 'twitter:card', seo.twitterCard || 'summary_large_image')
  tag('name', 'twitter:title', seo.ogTitle || seo.title)
  tag('name', 'twitter:description', seo.ogDescription || seo.description)
  tag('name', 'twitter:image', seo.ogImage)

  const fontLinks = cfg.fonts?.href
    ? [
        '<link rel="preconnect" href="https://fonts.googleapis.com">',
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
        `<link href="${esc(cfg.fonts.href)}" rel="stylesheet">`
      ].join('\n')
    : ''

  const html = `<!doctype html>
<html lang="${esc(seo.lang || 'en')}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
${meta.join('\n')}
${fontLinks}
<style>
${css}
</style>
</head>
<body>
<noscript><div style="padding:14vh 8vw;font:300 18px/1.7 system-ui,sans-serif;color:${esc(theme.ink || '#fff')};background:${esc(theme.bg || '#000')}">This page is a scroll-driven film. It needs JavaScript to run.</div></noscript>
<script>
${safeScript(source)}
</script>
<script>
${safeScript(engine)}
</script>
</body>
</html>
`
  const out = join(here, 'dist', name + '.html')
  writeFileSync(out, html)
  console.log(`  ✓ dist/${name}.html  ${(Buffer.byteLength(html) / 1024).toFixed(1)} kB`)
}

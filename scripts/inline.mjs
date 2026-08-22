import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Flattens the Vite build into one self-contained HTML fragment.
 *
 * The output deliberately omits <!doctype>, <html>, <head> and <body>: the
 * Artifact host supplies those. Everything else — CSS, JS, fonts — is inline,
 * so the page has no dependency it cannot satisfy on its own.
 */
const dist = 'dist'
const assets = join(dist, 'assets')
const files = readdirSync(assets)

const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n')
const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n')

// The Google Fonts @import has to lead the stylesheet, so hoist it back out.
const imports = []
const body = css.replace(/@import\s+url\([^)]*\);/g, (m) => {
  imports.push(m)
  return ''
})

const html = `<title>Loft</title>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
${imports.join('\n')}
${body}
</style>
<div id="root"></div>
<script type="module">
${js}
</script>
`

mkdirSync('bundle', { recursive: true })
writeFileSync(join('bundle', 'loft.html'), html)

const kb = (n) => `${(n / 1024).toFixed(1)} kB`
console.log(`bundle/loft.html  ${kb(Buffer.byteLength(html))}  (css ${kb(css.length)}, js ${kb(js.length)})`)

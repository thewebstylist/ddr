/* Flatten the seven-page static site into one self-contained HTML document:
 * all CSS inlined, all fonts base64'd, all seven page bodies embedded, and a
 * tiny hash router so the nav still works with no network at all. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = dirname(fileURLToPath(import.meta.url));
const read = (...p) => readFileSync(join(SITE, ...p), 'utf8');

const PAGES = ['index','mentorship','about','speaking','book','journal','contact'];

// fonts -> data URIs
let fontCss = read('assets','fonts','fonts.css');
fontCss = fontCss.replace(/url\('([^']+\.woff2)'\)/g, (_, f) => {
  const b64 = readFileSync(join(SITE, 'assets', 'fonts', f)).toString('base64');
  return `url(data:font/woff2;base64,${b64})`;
});

const css = ['tokens','base','components','motion','pages']
  .map((n) => read('assets','css',`${n}.css`)).join('\n');

const js = read('assets','js','site.js');

// pull <main> and the nav/footer out of the built pages
const grab = (html, tag) => {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? m[1] : '';
};
const first = read('index.html');
const navHtml = first.match(/<header class="nav"[\s\S]*?<\/header>/)[0];
const footHtml = first.match(/<footer class="foot"[\s\S]*?<\/footer>/)[0];

const bodies = PAGES.map((p) => {
  const html = read(`${p}.html`);
  return `<div class="pg" data-pg="${p}" ${p === 'index' ? '' : 'hidden'}>${grab(html, 'main')}</div>`;
}).join('\n');

// rewrite in-site links to hashes
const rewrite = (s) => s
  .replace(/href="index\.html"/g, 'href="#index"')
  .replace(/href="(mentorship|about|speaking|book|journal|contact)\.html(#[\w-]+)?"/g,
           (_, p, frag) => `href="#${p}"`)
  .replace(/href="index\.html(#[\w-]+)?"/g, 'href="#index"');

const router = `
<script>
(function(){
  var PAGES=${JSON.stringify(PAGES)};
  function show(name){
    if(PAGES.indexOf(name)<0) name='index';
    document.querySelectorAll('.pg').forEach(function(el){
      el.hidden = el.dataset.pg !== name;
    });
    document.querySelectorAll('.nav__link').forEach(function(a){
      a.toggleAttribute('aria-current', a.getAttribute('href') === '#'+name);
      if(a.getAttribute('href')==='#'+name) a.setAttribute('aria-current','page');
      else a.removeAttribute('aria-current');
    });
    window.scrollTo(0,0);
    // re-run reveals for the newly shown page
    document.querySelectorAll('.pg:not([hidden]) [data-reveal]').forEach(function(el){
      el.setAttribute('data-revealed','');
    });
    document.querySelectorAll('.pg:not([hidden]) .draw').forEach(function(el){
      el.classList.add('draw--on');
    });
  }
  window.addEventListener('hashchange',function(){ show(location.hash.slice(1)); });
  document.addEventListener('DOMContentLoaded',function(){
    if(location.hash) show(location.hash.slice(1));
  });
})();
</script>`;

const out = `<title>Trish Steele</title>
<style>
${fontCss}
${css}
.pg[hidden]{display:none}
</style>
${rewrite(navHtml)}
<main id="main">
${rewrite(bodies)}
</main>
${rewrite(footHtml)}
<script>${js}</script>
${router}
`;

writeFileSync(join(SITE, 'preview.html'), out);
console.log('preview.html', (Buffer.byteLength(out)/1048576).toFixed(2), 'MB');

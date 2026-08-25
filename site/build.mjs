/* Zero-dependency page assembler.
 *
 * Pages live as body fragments in src/pages/. The shared chrome lives in
 * src/layout.html + src/partials/. Running this writes the finished static
 * HTML to the site root, which is what actually deploys.
 *
 *   node build.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (...p) => readFileSync(join(here, ...p), 'utf8');

const layout = read('src', 'layout.html');

const nav    = read('src', 'partials', 'nav.html');
const footer = read('src', 'partials', 'footer.html');

const PAGES = [
  {
    file: 'index.html',
    title: 'Trish Steele — Mentor to Ageless, Fearless, Divinely Connected Women',
    description:
      'Private mentorship, keynotes, and mindset renewal with Trish Steele — philanthropist, author, advocate, and founder of Safe Passage Heals.',
  },
  {
    file: 'mentorship.html',
    title: 'Mentorship — Trish Steele',
    description:
      'The Mind of Steele Mentorship: private and small-group mentorship for accomplished women rebuilding purpose, presence, and legacy.',
  },
  {
    file: 'about.html',
    title: 'Her Story — Trish Steele',
    description:
      'From Hollywood beauty consultant to international advocate. Founder and CEO of Women Crowned In Glory, Inc. / Safe Passage Heals.',
  },
  {
    file: 'speaking.html',
    title: 'Speaking & Keynotes — Trish Steele',
    description:
      'Book Trish Steele for your conference, company, or church. Every message is customised to your audience and your outcome.',
  },
  {
    file: 'book.html',
    title: 'Discover the Mind of Steele — Trish Steele',
    description:
      'Discover the Mind of Steele: The Invincible Journey of 7 Decades to Becoming Ageless, Fearless, and Divinely Connected.',
  },
  {
    file: 'journal.html',
    title: 'Journal — Trish Steele',
    description: 'Writing, news, and dispatches on mindset renewal, resilience, and the Women of Steele movement.',
  },
  {
    file: 'contact.html',
    title: 'Contact — Trish Steele',
    description: 'Start a conversation with Trish Steele. Mentorship enquiries, speaking bookings, and press.',
  },
];

const known = new Set(PAGES.map((p) => p.file));
for (const f of readdirSync(join(here, 'src', 'pages'))) {
  if (!known.has(f)) throw new Error(`src/pages/${f} is not registered in PAGES`);
}

let count = 0;
for (const page of PAGES) {
  const body = read('src', 'pages', page.file);

  const html = layout
    .replaceAll('{{title}}', page.title)
    .replaceAll('{{description}}', page.description)
    .replaceAll('{{canonical}}', page.file === 'index.html' ? '' : page.file)
    .replace('{{nav}}', nav.trimEnd())
    .replace('{{footer}}', footer.trimEnd())
    .replace('{{body}}', body.trimEnd());

  const leftover = html.match(/\{\{\w+\}\}/g);
  if (leftover) throw new Error(`${page.file}: unfilled slots ${leftover.join(', ')}`);

  writeFileSync(join(here, page.file), html);
  count++;
}

console.log(`built ${count} pages`);

import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

/**
 * Builds the deployment archive.
 *
 * Layout matters: everything under `site/` is meant to be public, and nothing
 * else is. Keeping the schema and the edge function in a sibling folder means
 * a hurried upload of the wrong directory cannot publish them.
 */
const OUT = 'package'
const ZIP = 'loft-deploy.zip'

if (!existsSync('dist/index.html')) {
  console.error('Run `npm run build` first — dist/ is empty.')
  process.exit(1)
}

rmSync(OUT, { recursive: true, force: true })
rmSync(ZIP, { force: true })
mkdirSync(join(OUT, 'site'), { recursive: true })
mkdirSync(join(OUT, 'backend'), { recursive: true })

cpSync('dist', join(OUT, 'site'), { recursive: true })
cpSync('supabase/schema.sql', join(OUT, 'backend/schema.sql'))
cpSync('supabase/functions', join(OUT, 'backend/functions'), { recursive: true })
cpSync('supabase/tests', join(OUT, 'backend/tests'), { recursive: true })
cpSync('DEPLOY.md', join(OUT, 'DEPLOY.md'))
cpSync('DESIGN.md', join(OUT, 'DESIGN.md'))

writeFileSync(
  join(OUT, 'START-HERE.txt'),
  `Loft — deployment package
=========================

WHAT'S IN HERE

  site/      Upload the CONTENTS of this folder to your Bunny.net storage zone.
             index.html must end up at the root of the zone, not inside a
             subfolder.

  backend/   Do NOT upload this to the CDN.
             schema.sql    paste into the Supabase SQL editor
             functions/    the invite endpoint, deployed with the Supabase CLI
             tests/        proves the access rules do what they claim

  DEPLOY.md  The full walkthrough. Start there.


THE ONE THING TO UNDERSTAND

  A CDN cannot log anyone in. Bunny serves files; it has no idea who is asking.
  The app shell is public, like every web app's shell. What is protected is the
  DATA: project rows sit behind row-level security in Postgres, and the database
  itself refuses to hand a project to anyone who is not on its member list.

  So the login page is the front door. Row-level security is the lock.


BEFORE IT WILL RUN

  site/config.js ships with placeholder keys. Until you replace them the app
  shows a setup screen instead of starting — an unconfigured deployment should
  look broken, not unlocked.

  Fill in supabaseUrl, supabaseAnonKey and siteUrl, then purge the Bunny cache.
`,
)

execFileSync('zip', ['-r', '-q', '-X', `../${ZIP}`, '.'], { cwd: OUT, stdio: 'inherit' })

const size = execFileSync('du', ['-h', ZIP]).toString().split('\t')[0]
console.log(`\n${ZIP}  (${size})`)
console.log(execFileSync('unzip', ['-l', ZIP]).toString().split('\n').slice(-4).join('\n'))

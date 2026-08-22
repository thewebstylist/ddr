# Taking Loft live

Two pieces, and it matters which one does what:

| | Runs where | Holds |
|---|---|---|
| **The app** | Bunny.net CDN | HTML, CSS, JavaScript — public, and that's fine |
| **The backend** | Supabase | Accounts, passwords, projects — private, and enforced |

## Read this first

**A CDN cannot log anyone in.** Bunny serves files. It has no idea who is asking, and any check
written in JavaScript is running on the visitor's own machine, where they can read it, skip it, or
edit it. A "login page" that only hides a `<div>` protects nothing.

So the app shell is public — every real web app's shell is. What's protected is the **data**. The
project rows live in Postgres behind row-level security: the database itself refuses to return a
project to anyone who isn't on its member list. Someone can download the whole JavaScript bundle
and read every line of it, and still get nothing back but an empty list.

That's the model. The login page is the front door; row-level security is the lock.

**Verify it yourself:** `./scripts/test-schema.sh` runs the schema against a throwaway PostgreSQL
and asserts sixteen access rules — a stranger sees no projects, a viewer cannot write, an editor
cannot hand out access, a removed member loses access immediately. It should print sixteen `PASS`
lines.

---

## 1. Supabase (about 10 minutes)

### Create the project

1. [supabase.com](https://supabase.com) → **New project**. Pick the region closest to your team.
2. Save the database password somewhere safe. You will not need it for this setup, but you will
   want it later.

### Create the tables and the rules

3. **SQL Editor** → **New query** → paste all of `backend/schema.sql` → **Run**.
   It is safe to run more than once.

   This creates the tables, the access rules, and a private `project-assets` bucket for uploaded
   images — files in it are readable by exactly the people who can read the project they belong to.

### Turn on email

4. **Authentication → Sign In / Providers → Email**: **Enable email provider** on, and
   **Confirm email** on.
5. **Authentication → URL Configuration**:
   - **Site URL** — your live address, e.g. `https://boards.yourdomain.com`
   - **Redirect URLs** — add `https://boards.yourdomain.com/**` (the `/**` matters; invite links
     come back with a query string)
6. Supabase's built-in mail service is rate-limited to a handful of messages an hour — fine for
   testing, not for a real team. Before you invite anyone properly, go to
   **Project Settings → Authentication → SMTP Settings** and connect your own sender (Resend,
   Postmark, SendGrid, Amazon SES — any of them). Invitations that silently never arrive are almost
   always this.

### Deploy the invite function

Sending an invitation email needs the `service_role` key, and that key must never be in a browser.
So that one step — and only that step — runs on a server:

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase functions deploy invite
```

`supabase functions deploy` supplies the keys the function needs automatically; there is nothing to
configure. If you skip this step everything else still works — you just can't invite anyone from
inside the app.

### Collect two values

**Project Settings → Data API**: copy the **Project URL** and the **publishable / anon key**.

The anon key is meant to be public. It identifies your project; it does not grant access.
**The `service_role` key is the opposite — it bypasses every rule in the database. It belongs only
in the edge function. Never put it in `config.js`.**

---

## 2. Bunny.net (about 5 minutes)

### Storage Zone

1. **Storage → Add Storage Zone**. Name it, pick your main region, add replicas if your team is
   spread out.
2. Upload **the contents of the `site/` folder** — `index.html`, `config.js` and the `assets`
   folder — to the root of the zone. Not the folder itself, its contents: `index.html` must sit at
   the top.

### Pull Zone

3. **CDN → Add Pull Zone** → **Origin Type: Storage Zone** → choose the zone you just made.
4. Add your hostname and let Bunny issue the free certificate. **Force SSL** on.

### One setting that matters

5. In the **Storage Zone**, set the custom **404 path** to `/index.html` and enable rewriting 404
   responses to 200.

   Loft keeps everything on one page, so you will rarely hit this — but password-reset links land
   with a query string, and this makes a stray refresh land on the app instead of an error page.

### Caching

6. Add an Edge Rule so the shell is never cached stale:
   - **Override Cache Time → 0 seconds**, condition **Request URL** matches
     `*/index.html` and `*/config.js`
   - Leave `/assets/*` cached hard — those filenames contain a content hash and change on every
     build.
7. **Purge Cache** after every upload.

---

## 3. Connect the two

Edit `config.js` in your storage zone — it is plain JavaScript, so this needs no rebuild:

```js
window.LOFT_CONFIG = {
  mode: 'supabase',
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR-PUBLISHABLE-KEY',
  siteUrl: 'https://boards.yourdomain.com',
  allowSignUp: false,
}
```

Purge the cache, load the site. You should get a sign-in screen.

**If you see "This copy isn't connected yet"** the app could not find real credentials and refused
to start. That is deliberate: an unconfigured deployment should look broken rather than unlocked.
Check that `config.js` is at the root of the zone and that the placeholder text is gone.

---

## 4. Your first account

Nobody can sign up — `allowSignUp: false` means the only way in is an invitation, and there is
nobody to send the first one. So create yourself:

**Authentication → Users → Add user**, with **Auto Confirm User** ticked. Sign in, create a
project, and from then on the **Invite** button inside the app handles everyone else.

---

## How an invitation actually goes

1. An **owner** types an email address and picks a role.
2. The app calls the `invite` function, which checks — against the database, not the interface —
   that the caller really is an owner of that project.
3. Supabase emails the address a single-use link.
4. They click it, choose their own password, and land in the project. **You never see or set
   anyone's password**, and no password is ever sent by email.
5. If they already have a Loft account they skip straight to the project.

Reset works the same way: **Forgot your password** sends a single-use link.

### What each role can do

| | Read | Tick off cards, add notes | Change the canvas | Invite | Delete the project |
|---|---|---|---|---|---|
| **Owner** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Editor** | ✓ | ✓ | ✓ | | |
| **Commenter** | ✓ | ✓ | | | |
| **Viewer** | ✓ | | | | |

One honest caveat. Owner, editor and viewer are enforced by the database. **Commenter is enforced
by the interface only** — a project's document is stored as one JSON value, so Postgres can allow or
refuse a write but cannot tell "ticked a box" from "deleted the canvas". A determined commenter with
developer tools could write more than the UI lets them. Making that a real boundary means promoting
cards to their own table, which is on the roadmap in `DESIGN.md`. If someone genuinely must not be
able to change anything, give them **Viewer**, which the database does enforce.

---

## Updating later

```bash
npm run package
```

Re-upload the contents of `site/`, purge the cache. **Keep your existing `config.js`** — or
re-enter your keys, since the packaged copy ships with placeholders.

---

## When something is wrong

| What you see | What it usually is |
|---|---|
| "This copy isn't connected yet" | `config.js` missing from the zone root, or still holding placeholders |
| Invitation email never arrives | Supabase's built-in mail limit — connect your own SMTP sender |
| "That link has expired" | Invite and reset links are single-use; send another |
| Signing in bounces back to the login page | `siteUrl` doesn't match Supabase → URL Configuration |
| "Only an owner of this project can invite people" | Correct — the database checked, and it meant it |
| Invite button does nothing | The `invite` function was never deployed |
| Changes don't save, "View only" chip | You have viewer access to that project |
| Old version after uploading | Purge the Bunny cache |

---

## What this does not do yet

- **No live multiplayer.** Two people editing the same project at once will collide; the second
  save is refused and you are asked which copy to keep. Nothing is silently overwritten, but it is
  not Figma-style shared cursors. That is roadmap item one.
- **Images added before you connected a backend stay local.** Anything uploaded while the app was
  in sandbox mode lives only in that browser; teammates see "Image unavailable". Re-drop the file
  once the project is on Supabase and it uploads properly.
- **No audit log.** You can see who has access, not who changed what.

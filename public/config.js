/* ---------------------------------------------------------------------------
 * Loft runtime configuration
 *
 * Edit this file on your host AFTER deploying. It is plain JavaScript, loaded
 * before the app, so changing keys never requires a rebuild.
 *
 * The anon key below is meant to be public — it identifies your project, it
 * does not grant access. Access is decided by row-level security in the
 * database. Never put the service_role key in this file.
 * ------------------------------------------------------------------------ */
window.LOFT_CONFIG = {
  /**
   * "supabase" — real accounts, invitations, and shared projects (production).
   * "demo"     — no login at all; everything stays in this browser. Only ever
   *              use this for a throwaway sandbox, never for real work.
   */
  mode: 'supabase',

  /** Project URL from Supabase → Project Settings → Data API. */
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co',

  /** Publishable / anon key from the same page. Safe to expose. */
  supabaseAnonKey: 'YOUR-PUBLISHABLE-KEY',

  /**
   * Where invite and password-reset emails should send people back to.
   * Must exactly match a URL in Supabase → Authentication → URL Configuration.
   * Leave blank to use whatever origin the app is served from.
   */
  siteUrl: '',

  /**
   * Invite-only by default: people can only get in if you invite them.
   * Set true to let anyone with the link create their own account.
   */
  allowSignUp: false,
}

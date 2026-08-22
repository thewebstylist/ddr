import { config } from '../../config'
import { Mark } from '../Mark'

/**
 * Shown when the app cannot find a backend. The alternative — quietly falling
 * back to a browser-only sandbox — would look identical to a working
 * deployment while protecting nothing, so this build refuses to start instead.
 */
export function SetupScreen() {
  return (
    <div className="gate">
      <div className="gate-inner">
        <div className="gate-mark">
          <Mark />
          Loft
        </div>

        <div className="gate-card">
          <h1>This copy isn't connected yet</h1>
          <p className="sub">
            No sign-in backend was found, so the app has not started. It will not fall back to an open,
            browser-only mode — an unconfigured deployment should look broken, not unlocked.
          </p>

          {config.setupReason && (
            <div className="notice" data-tone="warn">
              {config.setupReason}
            </div>
          )}

          <ol className="setup-steps">
            <li>
              Open <code>config.js</code> — it sits next to <code>index.html</code> in the files you uploaded.
            </li>
            <li>
              Paste your project URL into <code>supabaseUrl</code> and the publishable key into{' '}
              <code>supabaseAnonKey</code>. Both are in Supabase under Project Settings → Data API.
            </li>
            <li>
              Set <code>siteUrl</code> to this site's address, and add that same address to Supabase →
              Authentication → URL Configuration.
            </li>
            <li>Save the file, purge the cache on your CDN, and reload this page.</li>
          </ol>

          <div className="gate-alt">
            <span>
              Full walkthrough, including the database schema, is in <code>DEPLOY.md</code>.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

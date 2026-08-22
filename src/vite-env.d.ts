/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to "1" only for sandbox builds, which may run without a backend. */
  readonly VITE_LOFT_DEMO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

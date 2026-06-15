/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string;
  readonly VITE_TITLE?: string;
  readonly VITE_API_URL?: string;
  /** Public base URLs of the payment providers — used to load their hosted brand icons. */
  readonly VITE_PAYBRO_URL?: string;
  readonly VITE_DASHED_URL?: string;
  readonly VITE_UNLEASH_URL?: string;
  readonly VITE_UNLEASH_CLIENT_KEY?: string;
  readonly VITE_NODE_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

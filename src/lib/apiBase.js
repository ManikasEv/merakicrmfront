const PROD_DEFAULT = 'https://merakibackend.vercel.app/api'

/**
 * Base URL for API calls (no trailing path beyond …/api).
 * - Vite dev: default `/api` is proxied to the local server (see vite.config.js) — no CORS.
 * - Netlify / production: set VITE_API_BASE, or the default Vercel URL is used.
 */
export const API_BASE = import.meta.env.VITE_API_BASE
  || (import.meta.env.DEV ? '/api' : PROD_DEFAULT)

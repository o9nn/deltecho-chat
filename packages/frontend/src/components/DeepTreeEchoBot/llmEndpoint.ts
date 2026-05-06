/**
 * Resolves the default LLM endpoint and model.
 *
 * In CogHood / Aphroditecho-home mode, the chat UI talks to a local
 * OpenAI-compatible inference server (e.g. llama-server on :8420 or
 * the aphroditecho-api FastAPI surface on :8431). The build can be
 * pointed at either by setting:
 *   VITE_APHRODITECHO_LLM_URL  — endpoint URL; absolute (`http://...`)
 *                                or same-origin relative (`/aphro.../v1/...`)
 *   VITE_APHRODITECHO_MODEL    — model name
 *
 * Same-origin relative URLs are preferred for production deployments
 * behind a reverse proxy: they satisfy the existing `connect-src 'self'`
 * CSP without exposing the upstream port to the browser, and
 * `fetch()` accepts relative URLs natively.
 *
 * Precedence:
 *   1. Caller-supplied config.apiEndpoint / config.model
 *   2. Build-time injected env (esbuild `define` substitutes
 *      process.env.VITE_APHRODITECHO_LLM_URL with a string literal
 *      when .env.local in packages/frontend defines it)
 *   3. Public OpenAI fallback so external users keep working
 *
 * The frontend build script bin/build-frontend-ts.mjs reads
 * packages/frontend/.env.local at build time and feeds every
 * VITE_-prefixed value to esbuild's `define` option, so references
 * like `process.env.VITE_APHRODITECHO_LLM_URL` here become literal
 * strings in the bundle. In Jest (CommonJS) the same references
 * resolve at runtime against process.env, so unit tests work
 * unchanged.
 */

export const PUBLIC_OPENAI_ENDPOINT =
  "https://api.openai.com/v1/chat/completions";

function readEnv(value: string | undefined): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
}

export function getDefaultLLMEndpoint(): string {
  return (
    readEnv(process.env.VITE_APHRODITECHO_LLM_URL) ?? PUBLIC_OPENAI_ENDPOINT
  );
}

export function getDefaultLLMModel(): string {
  return readEnv(process.env.VITE_APHRODITECHO_MODEL) ?? "gpt-4";
}

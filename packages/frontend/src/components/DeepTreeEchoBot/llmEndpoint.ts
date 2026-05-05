/**
 * Resolves the default LLM endpoint and model.
 *
 * In CogHood / Aphroditecho-home mode, the chat UI talks to a local
 * OpenAI-compatible inference server (e.g. llama-server on :8420 or
 * the aphroditecho-api FastAPI surface on :8430). The build can be
 * pointed at either by setting:
 *   VITE_APHRODITECHO_LLM_URL  — endpoint URL
 *   VITE_APHRODITECHO_MODEL    — model name
 *
 * Precedence:
 *   1. Caller-supplied config.apiEndpoint / config.model
 *   2. Build-time injected env (Vite `import.meta.env` or process.env in tests)
 *   3. Public OpenAI fallback so external users keep working
 *
 * The implementation goes through a small accessor that works in both
 * the Vite-built browser bundle (which inlines `import.meta.env.*`) and
 * the Jest CommonJS test environment (which only sees `process.env`).
 */

export const PUBLIC_OPENAI_ENDPOINT =
  "https://api.openai.com/v1/chat/completions";

const ENV_KEY_URL = "VITE_APHRODITECHO_LLM_URL";
const ENV_KEY_MODEL = "VITE_APHRODITECHO_MODEL";

/**
 * Read a build-time env var. Vite replaces `import.meta.env.X` literally at
 * build time so the lookup must reference exact identifiers. We avoid
 * touching `import.meta` directly (Jest CJS chokes on it) by using the
 * `Function` constructor to evaluate the expression only when the
 * runtime supports it. Falls back to `process.env` for Node/Jest, then
 * returns undefined.
 */
function readEnv(key: string): string | undefined {
  // Try Vite's injected env via a defensive eval. The Function constructor
  // creates a new lexical scope so the inner `import.meta` reference is
  // only evaluated when the engine supports the syntax.
  try {
    // eslint-disable-next-line no-new-func
    const getter = new Function(
      "k",
      "try { return import.meta.env ? import.meta.env[k] : undefined; } catch { return undefined; }",
    ) as (k: string) => string | undefined;
    const v = getter(key);
    if (typeof v === "string" && v.length > 0) return v;
  } catch {
    /* engine doesn't support import.meta — fall through */
  }

  // Fallback: Node/Jest reads from process.env.
  if (
    typeof process !== "undefined" &&
    process.env &&
    typeof process.env[key] === "string" &&
    process.env[key]!.length > 0
  ) {
    return process.env[key];
  }

  return undefined;
}

export function getDefaultLLMEndpoint(): string {
  return readEnv(ENV_KEY_URL) ?? PUBLIC_OPENAI_ENDPOINT;
}

export function getDefaultLLMModel(): string {
  return readEnv(ENV_KEY_MODEL) ?? "gpt-4";
}

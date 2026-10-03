import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const previewFile = fileURLToPath(
  new URL(
    "../packages/target-browser/static-pages/index.html",
    import.meta.url,
  ),
);

/**
 * A static host has no access to Entelechy, ESN/DAO evidence, or Cubism.
 * Reject claims that would make an illustrative page look like live telemetry.
 */
export function validateStaticPreview(html) {
  const errors = [];
  const evidenceSection = html.match(
    /<section class="telemetry" aria-label="Evidence availability">([\s\S]*?)<\/section>/,
  )?.[1];

  if (!evidenceSection) {
    errors.push("missing clearly labelled evidence-availability section");
  } else {
    const meters = [
      ...evidenceSection.matchAll(/<div class="meter"[^>]*>/g),
    ].map(([tag]) => tag);
    if (
      meters.length !== 4 ||
      meters.some((tag) => !tag.includes('data-evidence-state="unavailable"'))
    ) {
      errors.push("all four metrics must be explicitly marked unavailable");
    }
    if (
      /<div class="value">\s*\d+(?:\.\d+)?\s*(?:fps|%)?\s*<\/div>/i.test(
        evidenceSection,
      )
    ) {
      errors.push("static evidence cards cannot contain numeric telemetry");
    }
    const values = [
      ...evidenceSection.matchAll(/<div class="value">([^<]+)<\/div>/g),
    ].map(([, value]) => value.trim());
    if (
      values.length !== 4 ||
      values.some((value) => !["not connected", "not loaded"].includes(value))
    ) {
      errors.push("static evidence values must remain unavailable");
    }
  }

  if (
    !/<div class="value" id="runtimeStatus">static page<\/div>/.test(html) ||
    !/<div class="label">Autonomy mode<\/div>\s*<div class="value">not connected<\/div>/.test(
      html,
    ) ||
    !/<div class="label">Live2D renderer<\/div>\s*<div class="value">not loaded<\/div>/.test(
      html,
    )
  ) {
    errors.push(
      "public runtime, autonomy, and Cubism status cards must abstain",
    );
  }

  if (
    !/status:\s*"static-preview"/.test(html) ||
    !/telemetry:\s*"unavailable"/.test(html) ||
    !/live2d:\s*false/.test(html) ||
    !/illustration:\s*"css-only"/.test(html)
  ) {
    errors.push(
      "the public status object must disclose static, non-Cubism operation",
    );
  }
  if (
    /\b(?:daoConsensus|esnAutognosis|entelicDrift|live2dStability)\s*:\s*(?:\d|"[^"]+")/i.test(
      html,
    ) ||
    /\bmode:\s*"scientific-genius"/i.test(html) ||
    /\brequestAnimationFrame\s*\(/.test(html) ||
    /--level\s*:\s*\d/.test(html)
  ) {
    errors.push(
      "the static preview must not fabricate autonomy, model, or frame data",
    );
  }
  if (
    !/CSS illustration only/i.test(html) ||
    !/no Live2D model is running on this page/i.test(html)
  ) {
    errors.push("the decorative CSS avatar must be distinguished from Live2D");
  }

  return errors;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const failures = validateStaticPreview(readFileSync(previewFile, "utf8"));
  if (failures.length > 0) {
    for (const failure of failures)
      console.error(`[static-preview] ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(
      "[static-preview] 4 unavailable evidence cards, no invented telemetry, CSS-only avatar",
    );
  }
}

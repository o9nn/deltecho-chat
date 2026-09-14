#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const readJson = async (relativePath) =>
  JSON.parse(await readFile(resolve(root, relativePath), "utf8"));
const invariant = (condition, message) => {
  if (!condition) throw new Error(message);
};
const unique = (values) => new Set(values).size === values.length;

const [mapping, definitions, evidence, cycle, registry] = await Promise.all([
  readJson("data/core-self/cog253-map.json"),
  readJson("data/core-self/core-self-61.json"),
  readJson("data/core-self/implementation-evidence.json"),
  readJson("data/core-self/ksm-cycle.json"),
  readJson("docs/core-self/ecco9-binding-registry.json"),
]);

invariant(Array.isArray(mapping.patterns), "Cog253 map must expose patterns[]");
invariant(
  mapping.patterns.length === 253,
  "Cog253 map must contain 253 patterns",
);
invariant(
  unique(mapping.patterns.map((pattern) => pattern.id)),
  "Cog253 pattern IDs must be unique",
);
invariant(
  mapping.patterns.every(
    (pattern, index) =>
      pattern.id === `cog${String(index + 1).padStart(3, "0")}`,
  ),
  "Cog253 IDs must form the complete cog001..cog253 sequence",
);
invariant(
  mapping.patterns.every((pattern) =>
    ["control", "process", "structure"].includes(pattern.ksm_anchor),
  ),
  "Every Cog253 pattern must have a valid KSM anchor",
);

invariant(
  Array.isArray(definitions.definitions) &&
    definitions.definitions.length === 61,
  "Core-self model must contain exactly 61 definitions",
);
invariant(
  unique(definitions.definitions.map((definition) => definition.id)),
  "61-definition IDs must be unique",
);
invariant(
  definitions.definitions.every(
    (definition, index) => definition.id === index + 1,
  ),
  "Definition IDs must form the complete 1..61 sequence",
);

const evidenceIds = Object.keys(evidence).sort();
const patternIds = mapping.patterns.map((pattern) => pattern.id).sort();
invariant(
  evidenceIds.length === 253,
  "Evidence registry must contain 253 records",
);
invariant(
  JSON.stringify(evidenceIds) === JSON.stringify(patternIds),
  "Evidence registry keys must exactly match the Cog253 map",
);
for (const [id, record] of Object.entries(evidence)) {
  invariant(
    ["planned", "implemented", "verified", "failed"].includes(record.status),
    `${id} has an unknown evidence status`,
  );
  invariant(Array.isArray(record.evidence), `${id} evidence must be an array`);
  invariant(
    record.status === "planned" || record.evidence.length > 0,
    `${id} is implemented/verified without inspectable evidence`,
  );
  invariant(
    typeof record.acceptance_result?.criterion === "string" &&
      record.acceptance_result.criterion.length > 0,
    `${id} is missing an acceptance criterion`,
  );
}

invariant(cycle.advisory === true, "KSM cycle must remain advisory-only");
invariant(cycle.steps?.length === 12, "KSM cycle must contain 12 steps");
invariant(
  cycle.steps.at(-1)?.output?.direct_mutation === false,
  "KSM cycle must explicitly forbid direct mutation",
);
invariant(
  /^[a-f0-9]{64}$/.test(cycle.cycle_hash),
  "KSM cycle must carry a lowercase SHA-256 cycle hash",
);

invariant(
  registry.source?.execution_permitted === false,
  "Ecco9 archive execution must remain denied",
);
invariant(
  registry.source?.canonical_authority === "none",
  "Ecco9 archive must not become canonical authority",
);
invariant(
  registry.bindings?.every(
    (binding) =>
      binding.execution_permitted === false &&
      [
        "inspired",
        "adapted",
        "manifest",
        "vendored",
        "runtime",
        "deferred",
        "excluded",
      ].includes(binding.mode),
  ),
  "Every Ecco9 binding must have an explicit mode and deny archive execution",
);

const requiredModules = [
  "packages/core/src/core-self/kernel/contracts.ts",
  "packages/core/src/core-self/kernel/canonical.ts",
  "packages/core/src/core-self/kernel/policy.ts",
  "packages/core/src/core-self/kernel/ledger.ts",
  "packages/core/src/core-self/kernel/projector.ts",
  "packages/core/src/core-self/kernel/hypergraph.ts",
  "packages/core/src/core-self/kernel/capsule.ts",
  "packages/core/src/core-self/kernel/ecco9-manifest-adapter.ts",
  "packages/core/src/core-self/kernel/authority.ts",
  "packages/core/src/core-self/kernel/ksm.ts",
  "packages/core/src/core-self/kernel/index.ts",
];
await Promise.all(
  requiredModules.map((relativePath) => access(resolve(root, relativePath))),
);

const verified = Object.values(evidence).filter(
  (record) => record.status === "verified",
).length;
console.log(
  `[core-self] 253/253 patterns, 61/61 definitions, 253/253 evidence records, ${verified} verified core patterns`,
);
console.log("[core-self] Ecco9 execution denied; KSM cycle is advisory-only");

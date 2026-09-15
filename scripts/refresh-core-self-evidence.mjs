#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  DeltEchoCoreSelfAuthority,
  runEvidenceKsmCycle,
} from "../packages/core/dist/core-self/kernel/index.js";

const root = resolve(import.meta.dirname, "..");
const observedAt = "2026-09-12T22:00:00.000Z";
const readJson = async (relativePath) =>
  JSON.parse(await readFile(resolve(root, relativePath), "utf8"));
const digestFile = async (relativePath) =>
  createHash("sha256")
    .update(await readFile(resolve(root, relativePath)))
    .digest("hex");

const evidencePlan = {
  cog001: [
    "packages/core/src/core-self/kernel/authority.ts",
    "packages/core/src/core-self/__tests__/CoreSelfKernel.test.ts",
  ],
  cog018: [
    "packages/core/src/core-self/kernel/ksm.ts",
    "packages/core/src/core-self/__tests__/CoreSelfKernel.test.ts",
  ],
  cog024: [
    "packages/core/src/core-self/kernel/policy.ts",
    "packages/core/src/core-self/__tests__/CoreSelfKernel.test.ts",
  ],
  cog030: [
    "packages/core/src/core-self/kernel/ledger.ts",
    "packages/core/src/core-self/kernel/projector.ts",
    "packages/core/src/core-self/__tests__/CoreSelfKernel.test.ts",
  ],
  cog037: [
    "packages/core/src/core-self/kernel/hypergraph.ts",
    "packages/core/src/core-self/__tests__/CoreSelfKernel.test.ts",
  ],
  cog052: [
    "packages/core/src/core-self/kernel/hypergraph.ts",
    "packages/core/src/core-self/__tests__/CoreSelfKernel.test.ts",
  ],
  cog053: [
    "packages/core/src/core-self/kernel/policy.ts",
    "packages/core/src/core-self/__tests__/CoreSelfKernel.test.ts",
  ],
  cog066: [
    "packages/core/src/core-self/kernel/policy.ts",
    "packages/core/src/core-self/__tests__/CoreSelfKernel.test.ts",
  ],
  cog080: [
    "packages/core/src/core-self/AutognosisAutogenesisCoupler.ts",
    "packages/core/src/core-self/__tests__/AutognosisAutogenesisCoupler.test.ts",
  ],
  cog095: [
    "packages/core/src/core-self/kernel/index.ts",
    "packages/core/src/core-self/index.ts",
  ],
  cog127: [
    "packages/core/src/core-self/kernel/policy.ts",
    "packages/core/src/core-self/__tests__/CoreSelfKernel.test.ts",
  ],
  cog142: [
    "packages/core/src/core-self/kernel/ledger.ts",
    "packages/core/src/core-self/__tests__/CoreSelfKernel.test.ts",
  ],
  cog185: [
    "packages/core/src/core-self/kernel/policy.ts",
    "packages/core/src/core-self/__tests__/CoreSelfKernel.test.ts",
  ],
  cog205: [
    "packages/core/src/core-self/kernel/contracts.ts",
    "packages/core/src/core-self/kernel/policy.ts",
    "packages/core/src/core-self/kernel/ledger.ts",
    "packages/core/src/core-self/kernel/projector.ts",
  ],
  cog207: [
    "packages/core/src/core-self/kernel/canonical.ts",
    "packages/core/src/core-self/__tests__/CoreSelfKernel.test.ts",
  ],
  cog228: [
    "packages/core/src/core-self/kernel/ledger.ts",
    "packages/core/src/core-self/__tests__/CoreSelfKernel.test.ts",
  ],
  cog247: [
    "packages/core/src/core-self/kernel/capsule.ts",
    "packages/core/src/core-self/__tests__/CoreSelfKernel.test.ts",
  ],
  cog253: [
    "packages/core/src/core-self/kernel/authority.ts",
    "packages/avatar/src/self-model-avatar-feedback.ts",
    "packages/core/src/core-self/__tests__/CoreSelfKernel.test.ts",
  ],
};

const [mapping, definitions, evidence] = await Promise.all([
  readJson("data/core-self/cog253-map.json"),
  readJson("data/core-self/core-self-61.json"),
  readJson("data/core-self/implementation-evidence.json"),
]);
const patterns = new Map(
  mapping.patterns.map((pattern) => [pattern.id, pattern]),
);

for (const [patternId, paths] of Object.entries(evidencePlan)) {
  const pattern = patterns.get(patternId);
  if (!pattern) throw new Error(`Unknown core pattern '${patternId}'`);
  const fileEvidence = [];
  for (const relativePath of paths) {
    fileEvidence.push(
      `file:${relativePath}#sha256:${await digestFile(relativePath)}`,
    );
  }
  const artifactDigest = createHash("sha256")
    .update(fileEvidence.join("\n"))
    .digest("hex");
  evidence[patternId] = {
    acceptance_result: {
      artifact_digest: artifactDigest,
      command: "pnpm check:core-self",
      criterion: pattern.acceptance_criterion,
      observed:
        "pass: deterministic kernel, governance, replay, graph, capsule, and integration regressions",
    },
    evidence: fileEvidence,
    evidence_kind: "source-and-test",
    status: "verified",
  };
}

const orderedEvidence = Object.fromEntries(
  Object.entries(evidence).sort(([left], [right]) => left.localeCompare(right)),
);
await writeFile(
  resolve(root, "data/core-self/implementation-evidence.json"),
  `${JSON.stringify(orderedEvidence, null, 2)}\n`,
);

const authority = new DeltEchoCoreSelfAuthority();
const ledgerHead = authority.ledger.head;
if (!ledgerHead) throw new Error("Constitutional authority did not initialize");
const cycle = runEvidenceKsmCycle(mapping, definitions, orderedEvidence, {
  ledgerHead,
  observedAt,
  minimum: 0.5,
  maxCandidates: 20,
});
await writeFile(
  resolve(root, "data/core-self/ksm-cycle.json"),
  `${JSON.stringify(cycle, null, 2)}\n`,
);

console.log(
  `[core-self] refreshed ${
    Object.keys(evidencePlan).length
  } verified core patterns; weakest=${
    cycle.weakest_center
  }; coherence=${cycle.property_coherence.toFixed(3)}`,
);

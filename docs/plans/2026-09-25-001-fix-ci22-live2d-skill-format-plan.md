---
title: Fix CI22 Prettier failure on Live2D skill
type: fix
date: 2026-09-25
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# Fix CI22 Prettier failure on Live2D skill

## Goal Capsule

- **Objective:** Make CI22 `pnpm check` pass on Node 22 by formatting `.claude/skills/live2d-avatar-debug.md` to the repo Prettier contract.
- **Authority:** This plan is the source of truth. Product behavior lives on R-IDs. Mechanism lives on KTDs. Units cite those IDs and do not restate them.
- **Execution profile:** One-file format apply. No product behavior change. No ESLint warning cleanup.
- **Stop conditions:** Stop if the CI22 failure is no longer `check:format` on this file. Stop if the fix would ignore `.claude/` or change Prettier rules. Do not rewrite skill content or Live2D runtime code.
- **Tail ownership:** `ce-work` implements U1. Format check is the merge gate.

---

## Product Contract

### Summary

CI22 on `6ff75de5` (merge of PR 62) failed at Check (Lint, Types, Format). Types and lint completed. `prettier --check "**/*.md"` failed on `.claude/skills/live2d-avatar-debug.md`, the Live2D avatar debugging skill added in `16f178f5`. The product is a green CI22 format gate with skill meaning unchanged per R3.

### Problem Frame

The new skill markdown was committed without a Prettier pass. Root `check:format` includes every markdown file. A single unformatted file fails the whole Check step and skips unit and e2e jobs.

### Requirements

- R1. After the change, `pnpm check:format` exits 0 on the same Prettier globs CI22 uses.
- R2. `.claude/skills/live2d-avatar-debug.md` is the only product source file that changes.
- R3. Skill meaning stays the same: diagnostic checklist, path guidance, motion-group fallbacks, timeout notes, and retry examples remain present.
- R4. Prettier ignore files and Prettier config stay unchanged.
- R5. Existing ESLint warnings (console statements and unused disable directives) stay out of scope. Lint already reported 0 errors.

### Actors

- A1. CI22 `check-and-test` job on Node 22 running `pnpm check`.
- A2. Agents reading `.claude/skills/live2d-avatar-debug.md`.

### Key Flows

- F1. Format gate
  - **Trigger:** Push or pull request to main.
  - **Actors:** A1
  - **Steps:** Install. Build workspace deps. Run `pnpm check`. `check:format` includes the skill file.
  - **Outcome:** Format check passes. Later CI22 steps are no longer skipped for this reason.
  - **Covered by:** R1, R4

### Acceptance Examples

- AE1. Covers R1, R2. Given the current skill file, when Prettier write runs on that path only, then `pnpm check:format` exits 0 and `git diff --name-only` lists only `.claude/skills/live2d-avatar-debug.md` plus this plan if it is also committed.
- AE2. Covers R3. Given the formatted file, when a reader scans headings `When to use`, `Key Files`, `Diagnostic Checklist`, `Common Fixes`, and `Testing Changes`, then those sections still exist and still name the same files and symptoms.

### Scope Boundaries

- In: format the one failing markdown file so CI22 Check can proceed.
- Out: ESLint warning cleanup, Live2D runtime changes, Prettier config or ignore changes, CHANGELOG (not user-visible), Cloudflare or Pages deploys.

### Sources

- Failed run: https://github.com/o9nn/deltecho-chat/actions/runs/36106907340
- Check command: `package.json` `check:format` → `prettier --check "**/*.scss" "packages/**/*.{js,ts,tsx,json}" "**/*.md"`
- Offending file introduced in `16f178f5` and merged in `6ff75de5`

---

## Planning Contract

### Key Technical Decisions

- KTD1. Format the skill file in place with repo Prettier. Do not add `.claude/` to `.prettierignore`. (Chosen over ignore: the CI glob already covers `**/*.md`; hiding the tree would let later skill docs fail the same way.) Governs R1, R4.
- KTD2. Apply Prettier once on the failing path, then confirm with `pnpm check:format`. Do not hand-edit whitespace. (Chosen over manual edits: the failing tool is the contract.) Governs R1, R3.
- KTD3. Leave the 54 ESLint warnings untouched. (Chosen over drive-by lint cleanup: CI22 lint already passed with 0 errors; mixing warning cleanup would expand the PR past the format gate.) Governs R5.

### Assumptions

- The only CI22 Check failure on `6ff75de5` is this Prettier file. Types completed. Lint completed with warnings only.
- Repo Prettier 3.1.0 defaults apply (no root `.prettierrc.yml`).
- `orchestration.initiative=true` means take the smallest shippable CI-green fix, not a new orchestration feature.
- If this plan is committed with U1, `docs/plans/2026-09-25-001-fix-ci22-live2d-skill-format-plan.md` must already pass `prettier --check`. Stop if any other path in the CI format glob fails; do not expand R2.

### Implementation Constraints

- Do not change Live2D avatar source under `packages/frontend` or `packages/avatar`.
- Do not weaken `pnpm check` or CI22 steps.

### Sequencing

1. U1 formats the skill file and proves `pnpm check:format`.

---

## Implementation Units

### U1. Format the Live2D debugging skill

- **Goal:** Make `.claude/skills/live2d-avatar-debug.md` Prettier-clean so CI22 Check is no longer blocked by format.
- **Requirements:** R1, R2, R3, R4, R5
- **Files:**
  - `.claude/skills/live2d-avatar-debug.md` (write)
  - `.prettierignore` (read only; must stay unchanged)
  - `package.json` (read only; `check:format` / `fix:format` globs)
- **Approach:** Run Prettier write on the failing path (KTD2). Keep ignore and config unchanged (KTD1). Do not edit ESLint-warning files (KTD3). Expected mechanical edits from the local preview: blank lines after list intros, aligned Key Files table, semicolons in fenced TS/TSX samples, double quotes, and trailing-space removal on the `// CORRECT` comment.
- **Dependencies:** none
- **Test scenarios:**
  - T1. `npx prettier --check .claude/skills/live2d-avatar-debug.md` exits 0.
  - T2. `pnpm check:format` exits 0.
  - T3. `git diff --name-only` after the format apply lists only the skill file among product sources.
  - T4. The formatted file still contains the strings `Live2DAvatar.tsx`, `/models/miara/miara_pro_t03.model3.json`, and `MAX_RETRIES`.
- **Verification:** T1–T4. Full `pnpm check` is preferred if time allows; format is the required gate. No new Jest file: this unit has no runtime behavior.

---

## Verification Contract

- Local gate: `pnpm check:format`
- Path gate: `npx prettier --check .claude/skills/live2d-avatar-debug.md`
- CI gate: CI22 job `check-and-test (22)` step Check (Lint, Types, Format)
- No new unit or e2e tests
- Do not require `pnpm test` or Playwright for this format-only change
- Do not require `release:validate`

---

## Definition of Done

- U1 T1–T4 pass
- Product source diff is only `.claude/skills/live2d-avatar-debug.md`
- No Prettier ignore or config change
- No abandoned format experiments left in the tree
- Plan path remains `docs/plans/2026-09-25-001-fix-ci22-live2d-skill-format-plan.md`

# Programmable Purism templates

This is a bounded, data-driven authoring compiler—not another avatar renderer, a relabelled sample model, or a canned-response engine. Original geometric templates are lowered into a restricted MOC3 keyform layout that the pinned PurismCore evaluator can load. The normal DeltEcho avatar renderer remains the presentation path.

The editable source is `source.template.json`. It can be regenerated without Cubism Editor. No `.cmo3` project is claimed, and Purism itself remains an evaluator: this repository supplies the authoring/compiler layer.

## Generate and configure

From repository root:

```bash
pnpm --silent avatar:template example > /tmp/echo.template.json
pnpm avatar:template build --config /tmp/echo.template.json --out /tmp/echo-model
pnpm check:purism
```

Output directories must be new; existing paths are not intentionally overwritten. The default example is an original abstract **EchoSeed**, not a replacement claim for the supplied DTE portrait, Lucy or Miara. It has nine independently authored meshes and six controls: head rotation, left/right blink, mouth opening, breathing and ribbon sway.

For programmatic construction:

```js
import {
  createEchoSeed,
  compileTemplate,
} from "./tools/purism-template/templates.mjs";
import { encodeMoc3 } from "./tools/purism-template/moc3-writer.mjs";
import {
  createMotionClip,
  sampleClip,
  createSpring,
} from "./tools/purism-template/dynamics.mjs";

const source = createEchoSeed({
  eyeSpacing: 0.24,
  headWidth: 0.64,
  headHeight: 0.68,
  ribbonLength: 0.65,
  accent: "#eeaeff",
});
const compiled = compileTemplate(source);
const mocBytes = encodeMoc3(compiled);
const spring = createSpring({ frequency: 2, damping: 0.7 });
// A caller owns the clock; no hidden timers, services or autonomous mutation.
const sway = spring.step(0.5, 1 / 30).position;
```

## Generalized geometry and keyforms

`ellipse`, `grid` and `ribbon` create actual vertex, UV and triangle-index arrays. Each mesh receives a cell in an original procedural PNG atlas. Geometry proportions, segmentation and colors are configurable.

A mesh defines a shape and an ordered list of drivers. Supported operations are `translateX`, `translateY`, `scaleX`, `scaleY`, `rotate` (degrees) and `bend`. Each driver declares `parameter`, `pivot`, `base` and `amount`; its effective value is `base + amount * parameter`. Drivers compose in listed order. An example closed-eye deformation is a `scaleY` around the eye center with base 0.04 and amount 0.96, driven by a 0–1 openness parameter.

The compiler bakes combinations of parameter keys into direct ArtMesh keyforms. The first binding changes fastest in the tensor product. Runtime interpolation is therefore piecewise multilinear, not an exact continuously recomputed rotation. Add intermediate keys when greater fidelity is needed. This first version intentionally does not serialize native nested warp/rotation deformer trees, masks, animated draw-order changes or a Cubism Editor project.

Upper bounds prevent combinatorial blowup: 64 meshes, 4,096 vertices per mesh, 16 keys per parameter and 4,096 total keyforms. Unsupported operators, duplicate/unknown identifiers, unordered keys, non-finite values and invalid topology fail rather than silently producing placeholder files.

## Motion and physics

`createMotionClip` emits actual standard `.motion3.json` linear curves. `sampleClip` performs deterministic seeking, clamping and looping. `createPhysics3` emits a standard two-particle pendulum setting consumed by the existing Cubism host SDK. Frequency/damping map to SDK delay/mobility controls; they are not claimed to be a calibrated physical simulation. The separate `createSpring` is an analytic caller-driven damped oscillator with a 250 ms step cap.

Purism evaluates the resulting parameter/geometry state. The host, not Purism, evaluates Motion3 and Physics3. The default clip demonstrates blink, breath, tilt and mouth opening; it is not evidence of speech synthesis or audio-driven lip sync. Existing DeltEcho audio can later drive the actual `ParamMouthOpenY` control.

The distribution contains MOC3, Model3 settings, PNG atlas, editable source JSON, optional motion/physics companions and an exact-byte construction inventory. Low-level `encodeMoc3` also accepts explicitly supplied vertices, UVs, indices, bindings and keyforms, so a future high-level grammar need not depend on these three primitives.

## Verification and boundaries

Every-commit Purism CI compiles entirely new geometry, initializes it using the product-packaged real WASM, verifies all six parameter controls move native vertices, checks endpoint and midpoint interpolation and rejects malformed inputs. It also preserves the earlier vendored-model tests. The generated-model report is a separate artifact; no inherited QA model bytes are used as its source.

The target is pinned PurismCore v1.1.0 v5, using the restricted MOC3 3.0 subset defined by its MIT parser. Official Cubism Core/Editor interoperability is not inferred from the file extension. The normal app backend remains unchanged unless explicitly selected at build time with `DELTECHO_CUBISM_CORE=purism`.

This construction does not grant rights to imported art or approve PR91’s inherited model assets. Original procedural geometry reduces that dependency but does not replace the source-rights/exact-byte approval process for a named character. DAO votes, ESN state, canonical DTE identity, model-generated speech and daemon authority are untouched.

Compiler format definitions are derived from [SakuraMotion/PurismCore](https://github.com/SakuraMotion/PurismCore) (MIT; source revision recorded in the writer). First-party template code follows the repository's GPL-3.0-or-later license; vendored runtime MIT notices remain required.

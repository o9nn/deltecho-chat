import { Dove9Engine } from "../src/engine/dove9-engine.js";
import { STREAM_PHASES } from "../src/types/index.js";

describe("Dove9Engine", () => {
  let engine: Dove9Engine;

  beforeEach(() => {
    engine = new Dove9Engine();
  });

  it("should initialize with 3 streams", () => {
    const state = engine.tick(); // Step 0
    expect(state.streams.length).toBe(3);
    expect(state.streams[0].id).toBe("primary");
    expect(state.streams[1].id).toBe("secondary");
    expect(state.streams[2].id).toBe("tertiary");
  });

  it("should cycle through 12 steps", () => {
    for (let i = 0; i < 12; i++) {
      const state = engine.tick();
      expect(state.cycleStep).toBe(i);
    }
    const state = engine.tick();
    expect(state.cycleStep).toBe(0);
  });

  it("should have correct phase offets", () => {
    // Step 0 -> 0 degrees
    // Primary (0 offset): 0 + 0 = 0 -> Sense
    // Secondary (120 offset): 0 + 120 = 120 -> Process
    // Tertiary (240 offset): 0 + 240 = 240 -> Act

    const state = engine.tick();
    const primary = state.streams.find((s) => s.id === "primary");
    const secondary = state.streams.find((s) => s.id === "secondary");
    const tertiary = state.streams.find((s) => s.id === "tertiary");

    expect(primary?.currentPhase).toBe("sense");
    expect(secondary?.currentPhase).toBe("process");
    expect(tertiary?.currentPhase).toBe("act");
  });

  it("should advance phases correctly", () => {
    // Advance 4 steps (4 * 30 = 120 degrees)
    // Primary should move from Sense to Process

    for (let i = 0; i < 4; i++) {
      engine.tick();
    }

    // At step 4 (start of next tick)
    const state = engine.tick(); // This is technically step 4
    // Wait, tick() processes currentStep=0 then incs.
    // Calls: 0, 1, 2, 3 done.
    // Current step is 4.
    // 4 * 30 = 120.

    // Primary: 120 -> Process
    expect(state.streams[0].currentPhase).toBe("process");
  });
});

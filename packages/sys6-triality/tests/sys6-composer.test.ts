import { Sys6Composer } from "../src/operadic/sys6-composer.js";
import { PrimeModality } from "../src/types/index.js";

describe("Sys6Composer", () => {
  let composer: Sys6Composer;

  beforeEach(() => {
    composer = new Sys6Composer();
  });

  it("should initialize and tick correctly", () => {
    const result = composer.nextTick();
    expect(result.state.globalStep).toBe(0);
    expect(result.state.cycleStep).toBe(0);

    const result2 = composer.nextTick();
    expect(result2.state.globalStep).toBe(1);
    expect(result2.state.cycleStep).toBe(1);
  });

  it("should cycle through 30 steps", () => {
    for (let i = 0; i < 30; i++) {
      composer.nextTick();
    }
    const result = composer.nextTick();
    expect(result.state.cycleStep).toBe(0); // 30 % 30
    expect(result.state.globalStep).toBe(30);
  });

  it("should calculate prime phases correctly", () => {
    const result = composer.nextTick(); // step 0
    expect(result.state.primePhase[PrimeModality.Dyadic]).toBe(0);

    composer.nextTick(); // step 1
    const result2 = composer.nextTick(); // step 2
    expect(result2.state.primePhase[PrimeModality.Dyadic]).toBe(0); // 2 % 2
    expect(result2.state.primePhase[PrimeModality.Triadic]).toBe(2); // 2 % 3
  });

  it("should generate events", () => {
    // Step 0 produces events (dyadic, triadic, pentadic phases align at 0)
    const result = composer.nextTick();
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events.find((e) => e.type === "dyadic-sync")).toBeDefined();
  });
});

import { ResonanceCascadeConductor } from "../resonance-cascade-conductor";

describe("tentative crystal conductor", () => {
  it("renders only short-lived focus and brow motion, never eureka halo or smile", () => {
    const now = jest.spyOn(performance, "now");
    let time = 1_000;
    now.mockImplementation(() => time);
    try {
      const conductor = new ResonanceCascadeConductor();
      conductor.onCrystal({
        id: "crystal-tentative",
        timestamp: 10_000,
        targetConcept: "opaque",
        confidence: 0.8,
        avatarEffect: {
          eyeFocusIntensity: 0.4,
          browRaiseAsymmetry: 0.2,
          microSmileIntensity: 1, // An untrusted producer cannot earn a smile.
          haloCrystallizationHz: 2,
        },
      });
      time += 200;
      const cue = conductor.tick(200);
      expect(cue.active).toBe(true);
      expect(cue.pupilDilation).toBeGreaterThan(0);
      expect(cue.browAsymmetry).toBeGreaterThan(0);
      expect(cue.haloPulse).toBe(0);
      expect(cue.insightSmile).toBe(0);
      expect(cue.cascadeIntensity).toBe(0);

      time += 3_000;
      const after = conductor.tick(3_000);
      expect(after.active).toBe(false);
      expect(conductor.getStats().activeCrystals).toBe(0);
    } finally {
      now.mockRestore();
    }
  });
});

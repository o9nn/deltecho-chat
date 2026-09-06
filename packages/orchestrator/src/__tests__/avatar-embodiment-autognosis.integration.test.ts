import { EventEmitter } from "events";
import { describe, expect, it } from "@jest/globals";

import { AutonomyLifecycleCoordinator } from "../autonomy-lifecycle";
import { EntelechyIntegration } from "../entelechy-integration";

class AvatarFeedbackProbe extends EventEmitter {
  public getSelfModelAccuracy(): number {
    return 0.87;
  }
}

describe("avatar embodiment autognosis integration", () => {
  it("forwards rendered-state self-model evidence into the shared entelechy authority", () => {
    const entelechy = new EntelechyIntegration({
      enableReservoir: false,
      enableEchoBeats: false,
      enableConsciousness: false,
      enableEntelechy: false,
    });
    const lifecycle = new AutonomyLifecycleCoordinator(
      {},
      undefined,
      entelechy,
    );
    const feedback = new AvatarFeedbackProbe();

    lifecycle.wireAvatarFeedback(feedback);
    feedback.emit("self-model-update", {
      accuracy: 0.87,
      meanError: 0.065,
      experienceCount: 24,
    });

    const embodiment = entelechy.getEmbodimentAutognosis();
    const visual = entelechy.getScientificGeniusVisualState();
    expect(embodiment.accuracy).toBeCloseTo(0.87);
    expect(embodiment.meanError).toBeCloseTo(0.065);
    expect(embodiment.experienceCount).toBe(24);
    expect(embodiment.confidence).toBeGreaterThan(0.86);
    expect(visual.embodimentAccuracy).toBeCloseTo(0.87);
    expect(visual.embodimentError).toBeCloseTo(0.065);
  });
});

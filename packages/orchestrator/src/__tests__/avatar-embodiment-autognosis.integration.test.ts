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

  it("keeps exactly one feedback callback when rewired", () => {
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
    const first = new AvatarFeedbackProbe();
    const second = new AvatarFeedbackProbe();
    let forwarded = 0;
    lifecycle.on("avatar:self-model-update", () => forwarded++);

    lifecycle.wireAvatarFeedback(first);
    lifecycle.wireAvatarFeedback(second);
    lifecycle.wireAvatarFeedback(second);

    expect(first.listenerCount("self-model-update")).toBe(0);
    expect(second.listenerCount("self-model-update")).toBe(1);

    first.emit("self-model-update", {
      accuracy: 0.2,
      meanError: 0.4,
      experienceCount: 1,
    });
    second.emit("self-model-update", {
      accuracy: 0.9,
      meanError: 0.05,
      experienceCount: 2,
    });

    expect(forwarded).toBe(1);
    expect(entelechy.getEmbodimentAutognosis()).toMatchObject({
      accuracy: 0.9,
      meanError: 0.05,
      experienceCount: 2,
    });
  });

  it("unsubscribes avatar feedback on stop, including before the lifecycle starts", () => {
    const stoppedBeforeStart = new AutonomyLifecycleCoordinator();
    const firstFeedback = new AvatarFeedbackProbe();
    stoppedBeforeStart.wireAvatarFeedback(firstFeedback);
    stoppedBeforeStart.stop();
    expect(firstFeedback.listenerCount("self-model-update")).toBe(0);

    const runningLifecycle = new AutonomyLifecycleCoordinator();
    const runningFeedback = new AvatarFeedbackProbe();
    runningLifecycle.wireAvatarFeedback(runningFeedback);
    runningLifecycle.start();
    runningLifecycle.stop();
    expect(runningFeedback.listenerCount("self-model-update")).toBe(0);
  });

  it("rejects malformed avatar feedback before any integration or self-model mutation", () => {
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
    let forwarded = 0;
    lifecycle.on("avatar:self-model-update", () => forwarded++);
    lifecycle.wireAvatarFeedback(feedback);
    const beforeEmbodiment = entelechy.getEmbodimentAutognosis();
    const beforePerceivedAccuracy =
      lifecycle.getVirtualAgent().selfAwareness.perceivedAccuracy;

    feedback.emit("self-model-update", {
      accuracy: Number.NaN,
      meanError: Number.POSITIVE_INFINITY,
      experienceCount: 1.5,
    });

    expect(forwarded).toBe(0);
    expect(entelechy.getEmbodimentAutognosis()).toEqual(beforeEmbodiment);
    expect(lifecycle.getVirtualAgent().selfAwareness.perceivedAccuracy).toBe(
      beforePerceivedAccuracy,
    );
  });
});

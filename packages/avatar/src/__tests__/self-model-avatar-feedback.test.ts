import { SelfModelAvatarFeedback } from "../self-model-avatar-feedback";

describe("self-model avatar feedback qualification", () => {
  it("does not count a partial model readback as zero-error evidence", () => {
    const feedback = new SelfModelAvatarFeedback();
    const experience = jest.fn();
    feedback.on("experience", experience);
    feedback.recordIntendedProjection(
      { ParamAngleX: 5, ParamAngleY: 3 },
      "Idle",
    );
    expect(feedback.sampleActualState({ ParamAngleX: 5 })).toBeNull();
    expect(feedback.getCalibration().experienceCount).toBe(0);
    expect(feedback.getSelfModelAccuracy()).toBe(0.5);
    expect(experience).not.toHaveBeenCalled();
    // The invalid pair must not linger and combine with a later unrelated frame.
    expect(
      feedback.sampleActualState({ ParamAngleX: 5, ParamAngleY: 3 }),
    ).toBeNull();
  });

  it("rejects non-finite targets and readings rather than corrupting bias state", () => {
    const feedback = new SelfModelAvatarFeedback();
    feedback.recordIntendedProjection(
      { ParamAngleX: Number.POSITIVE_INFINITY },
      "Idle",
    );
    expect(feedback.sampleActualState({ ParamAngleX: 1 })).toBeNull();
    feedback.recordIntendedProjection({ ParamAngleX: 1 }, "Idle");
    expect(feedback.sampleActualState({ ParamAngleX: Number.NaN })).toBeNull();
    expect(feedback.getCalibration()).toMatchObject({
      biasCorrections: {},
      experienceCount: 0,
      selfModelAccuracy: 0.5,
    });
  });

  it("rejects finite overflow and excludes unrelated readback values", () => {
    const feedback = new SelfModelAvatarFeedback();
    feedback.recordIntendedProjection({ ParamAngleX: 1e308 }, "Idle");
    expect(feedback.sampleActualState({ ParamAngleX: -1e308 })).toBeNull();
    expect(feedback.getCalibration().experienceCount).toBe(0);
    feedback.recordIntendedProjection({ ParamAngleX: 1 }, "Idle");
    const valid = feedback.sampleActualState({
      ParamAngleX: 2,
      ParamGhost: Number.NaN,
    });
    expect(valid?.actual.params).toEqual({ ParamAngleX: 2 });
  });

  it("still trains on complete finite parameter readbacks", () => {
    const feedback = new SelfModelAvatarFeedback();
    feedback.recordIntendedProjection(
      { ParamAngleX: 1, ParamAngleY: 2 },
      "Idle",
    );
    const result = feedback.sampleActualState({
      ParamAngleX: 2,
      ParamAngleY: 3,
    });
    expect(result?.delta).toEqual({ ParamAngleX: 1, ParamAngleY: 1 });
    expect(result?.errorMagnitude).toBe(1);
    expect(feedback.getCalibration().experienceCount).toBe(1);
  });
});

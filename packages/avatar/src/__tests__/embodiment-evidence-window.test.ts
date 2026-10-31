import {
  EmbodimentEvidenceWindow,
  type EmbodimentEvidenceRow,
} from "../embodiment-evidence-window";

const row = (
  parameterId: string,
  requested: number,
  observed: number,
  min = 0,
  max = 10,
): EmbodimentEvidenceRow => ({
  parameterId,
  requested,
  observed,
  range: { min, max },
});

describe("EmbodimentEvidenceWindow", () => {
  it("waits until a valid observation is recorded", () => {
    const window = new EmbodimentEvidenceWindow();

    expect(window.snapshot()).toEqual({
      status: "waiting",
      sampleCount: 0,
      capacity: 32,
      parameters: [],
    });
  });

  it("summarizes normalized signed bias, population variability, and RMS", () => {
    const window = new EmbodimentEvidenceWindow();

    expect(window.record([row("ParamAngleX", 0, 1)])).toBe(true);
    expect(window.record([row("ParamAngleX", 0, 3)])).toBe(true);

    const [parameter] = window.snapshot().parameters;
    expect(window.snapshot()).toMatchObject({
      status: "observed",
      sampleCount: 2,
      capacity: 32,
    });
    expect(parameter).toMatchObject({
      parameterId: "ParamAngleX",
      count: 2,
    });
    expect(parameter.meanSignedError).toBeCloseTo(0.2);
    expect(parameter.variability).toBeCloseTo(0.1);
    expect(parameter.rmsError).toBeCloseTo(Math.sqrt(0.05));
  });

  it("reports zero population variability for a constant normalized offset", () => {
    const window = new EmbodimentEvidenceWindow();

    window.record([row("ParamBodyAngleZ", 0, 2)]);
    window.record([row("ParamBodyAngleZ", 3, 5)]);

    const [parameter] = window.snapshot().parameters;
    expect(parameter.meanSignedError).toBeCloseTo(0.2);
    expect(parameter.variability).toBe(0);
    expect(parameter.rmsError).toBeCloseTo(0.2);
  });

  it("keeps only the latest 32 caller samples", () => {
    const window = new EmbodimentEvidenceWindow();

    for (let value = 0; value <= 32; value += 1) {
      expect(window.record([row("ParamAngleY", 0, value, 0, 1)])).toBe(true);
    }

    const [parameter] = window.snapshot().parameters;
    expect(window.snapshot().sampleCount).toBe(32);
    expect(parameter.count).toBe(32);
    expect(parameter.meanSignedError).toBeCloseTo(16.5);
  });

  it("excludes missing or invalid rows rather than treating them as zero error", () => {
    const window = new EmbodimentEvidenceWindow();
    const missingRange: EmbodimentEvidenceRow = {
      parameterId: "ParamIgnored",
      requested: 0,
      observed: 0,
      range: null,
    };
    const nonFinite: EmbodimentEvidenceRow = {
      ...row("ParamNaN", 0, 0),
      observed: Number.NaN,
    };

    expect(
      window.record([missingRange, nonFinite, row("ParamMouthOpenY", 0, 4)]),
    ).toBe(true);

    const snapshot = window.snapshot();
    expect(snapshot.sampleCount).toBe(1);
    expect(snapshot.parameters).toEqual([
      expect.objectContaining({
        parameterId: "ParamMouthOpenY",
        count: 1,
        meanSignedError: 0.4,
        rmsError: 0.4,
      }),
    ]);
  });

  it("resets and rejects samples with no valid rows", () => {
    const window = new EmbodimentEvidenceWindow();
    window.record([row("ParamAngleX", 0, 1)]);

    expect(
      window.record([
        { ...row("", 0, 1) },
        { ...row("ParamBad", 0, 1), range: null },
        row("ParamFlat", 0, 0, 4, 4),
        row("ParamTiny", 0, 0, 0, 0.0000001),
        row("ParamBounded", 0, 1001),
      ]),
    ).toBe(false);
    expect(window.snapshot().status).toBe("waiting");
  });

  it("rejects duplicate valid IDs but ignores invalid duplicate rows", () => {
    const window = new EmbodimentEvidenceWindow();
    const invalidDuplicate: EmbodimentEvidenceRow = {
      parameterId: "ParamAngleX",
      requested: 0,
      observed: 0,
      range: null,
    };

    expect(window.record([row("ParamAngleX", 0, 1), invalidDuplicate])).toBe(
      true,
    );
    expect(window.snapshot().sampleCount).toBe(1);

    expect(
      window.record([row("ParamAngleX", 0, 1), row("ParamAngleX", 0, 2)]),
    ).toBe(false);
    expect(window.snapshot()).toMatchObject({
      status: "waiting",
      sampleCount: 0,
    });
  });

  it("resets retained samples when sorted IDs or actual ranges change", () => {
    const window = new EmbodimentEvidenceWindow();
    window.record([
      row("ParamAngleX", 0, 1, -30, 30),
      row("ParamAngleY", 0, 1, -30, 30),
    ]);
    window.record([
      row("ParamAngleX", 0, 2, -30, 30),
      row("ParamAngleY", 0, 2, -30, 30),
    ]);

    expect(window.snapshot().sampleCount).toBe(2);

    window.record([
      row("ParamAngleX", 0, 6, -30, 30),
      row("ParamAngleY", 0, 6, -20, 20),
    ]);

    const snapshot = window.snapshot();
    expect(snapshot.sampleCount).toBe(1);
    expect(snapshot.parameters).toEqual([
      expect.objectContaining({ parameterId: "ParamAngleX", count: 1 }),
      expect.objectContaining({ parameterId: "ParamAngleY", count: 1 }),
    ]);
  });

  it("uses sorted IDs so equivalent input order preserves the schema", () => {
    const window = new EmbodimentEvidenceWindow();

    window.record([row("ParamAngleY", 0, 2), row("ParamAngleX", 0, 1)]);
    window.record([row("ParamAngleX", 0, 3), row("ParamAngleY", 0, 4)]);

    const snapshot = window.snapshot();
    expect(snapshot.sampleCount).toBe(2);
    expect(
      snapshot.parameters.map((parameter) => parameter.parameterId),
    ).toEqual(["ParamAngleX", "ParamAngleY"]);
    expect(snapshot.parameters[0].meanSignedError).toBeCloseTo(0.2);
    expect(snapshot.parameters[1].meanSignedError).toBeCloseTo(0.3);
  });

  it("retains out-of-span normalized errors without clamping", () => {
    const window = new EmbodimentEvidenceWindow();

    window.record([row("ParamEyeLOpen", 0, 25, 0, 10)]);

    const [parameter] = window.snapshot().parameters;
    expect(parameter.meanSignedError).toBeCloseTo(2.5);
    expect(parameter.rmsError).toBeCloseTo(2.5);
  });

  it("returns detached snapshots and resets explicitly", () => {
    const window = new EmbodimentEvidenceWindow();
    window.record([row("ParamMouthForm", 0, 1)]);

    const first = window.snapshot();
    first.parameters[0].parameterId = "mutated";
    first.parameters[0].meanSignedError = 99;
    first.parameters.push({
      parameterId: "invented",
      count: 1,
      meanSignedError: 1,
      variability: 0,
      rmsError: 1,
    });

    expect(window.snapshot().parameters).toEqual([
      expect.objectContaining({
        parameterId: "ParamMouthForm",
        meanSignedError: 0.1,
      }),
    ]);

    window.reset();
    expect(window.snapshot()).toEqual({
      status: "waiting",
      sampleCount: 0,
      capacity: 32,
      parameters: [],
    });
  });
  it("rejects oversized parameter vectors instead of retaining unbounded evidence", () => {
    const window = new EmbodimentEvidenceWindow();
    const rows = Array.from({ length: 513 }, (_, index) =>
      row(`Param${index}`, 0, 0),
    );
    expect(window.record(rows)).toBe(false);
    expect(window.snapshot().sampleCount).toBe(0);
  });
});

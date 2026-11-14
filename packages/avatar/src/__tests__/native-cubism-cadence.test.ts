import { NativeCubismCadence } from "../native-cubism-cadence";

// Explicit clock fixtures test the instrument; they are not runtime performance.
describe("Native Cubism callback cadence", () => {
  it("counts callbacks only and returns exact bounded interval statistics", () => {
    let now = 0;
    const probe = new NativeCubismCadence(() => now, 2);
    const times = [0, 20, 60, 120];
    for (const value of times) {
      now = value;
      probe.markNativeCallback();
    }
    const intervals = times
      .slice(2)
      .map((value, index) => value - times[index + 1]);
    expect(probe.snapshot()).toMatchObject({
      status: "observed",
      nativeCallbackCount: times.length,
      intervalCount: 2,
      capacity: 2,
      minIntervalMs: Math.min(...intervals),
      maxIntervalMs: Math.max(...intervals),
      meanIntervalMs:
        intervals.reduce((sum, value) => sum + value, 0) / intervals.length,
      lastCallbackAgeMs: 0,
    });
    now = 240;
    const snapshot = probe.snapshot();
    snapshot.nativeCallbackCount = 999;
    expect(probe.snapshot()).toMatchObject({
      nativeCallbackCount: times.length,
      lastCallbackAgeMs: 240 - 120,
    });
  });

  it("waits for two actual callbacks and never infers callbacks from elapsed time", () => {
    let now = 100;
    const probe = new NativeCubismCadence(() => now);
    expect(probe.snapshot()).toMatchObject({
      status: "waiting",
      nativeCallbackCount: 0,
      meanIntervalMs: null,
    });
    probe.markNativeCallback();
    now = 100_000;
    expect(probe.snapshot()).toMatchObject({
      status: "waiting",
      nativeCallbackCount: 1,
      intervalCount: 0,
      meanIntervalMs: null,
    });
  });

  it("excludes minimized gaps while retaining actual callback counts including unexpected hidden callbacks", () => {
    let now = 0;
    const probe = new NativeCubismCadence(() => now);
    probe.markNativeCallback();
    now = 20;
    probe.markNativeCallback();
    probe.setVisible(false);
    now = 1_000;
    expect(probe.snapshot()).toMatchObject({
      status: "waiting",
      visible: false,
      nativeCallbackCount: 2,
      intervalCount: 0,
    });
    probe.markNativeCallback();
    expect(probe.snapshot().nativeCallbackCount).toBe(3);
    probe.setVisible(true);
    now = 2_000;
    probe.markNativeCallback();
    expect(probe.snapshot().meanIntervalMs).toBeNull();
    now = 2_040;
    probe.markNativeCallback();
    expect(probe.snapshot()).toMatchObject({
      status: "observed",
      nativeCallbackCount: 5,
      meanIntervalMs: 2_040 - 2_000,
      intervalCount: 1,
    });
    probe.setVisible(true);
    expect(probe.snapshot().intervalCount).toBe(1);
  });

  it.each([null, NaN, Infinity, -Infinity, -1])(
    "does not manufacture a zero interval for invalid clock %s",
    (bad) => {
      let now: number | null = 100;
      const probe = new NativeCubismCadence(() => now);
      probe.markNativeCallback();
      now = bad;
      probe.markNativeCallback();
      expect(probe.snapshot()).toMatchObject({
        status: "unavailable",
        nativeCallbackCount: 2,
        intervalCount: 0,
        meanIntervalMs: null,
      });
      now = 200;
      probe.markNativeCallback();
      expect(probe.snapshot().status).toBe("waiting");
      now = 250;
      probe.markNativeCallback();
      expect(probe.snapshot().meanIntervalMs).toBe(250 - 200);
    },
  );

  it("abstains on monotonic reversal without treating snapshot reads as native events", () => {
    let now = 100;
    const probe = new NativeCubismCadence(() => now);
    probe.markNativeCallback();
    now = 200;
    probe.markNativeCallback();
    now = 50;
    expect(probe.snapshot()).toMatchObject({
      status: "unavailable",
      nativeCallbackCount: 2,
      meanIntervalMs: null,
    });
    probe.markNativeCallback();
    expect(probe.snapshot()).toMatchObject({
      status: "unavailable",
      nativeCallbackCount: 3,
      intervalCount: 0,
    });
    now = 60;
    probe.markNativeCallback();
    expect(probe.snapshot().status).toBe("waiting");
  });

  it("is bounded under many events and reset clears all retained measurements", () => {
    let now = 0;
    const probe = new NativeCubismCadence(() => now, 120);
    for (let i = 0; i < 100_000; i++) {
      now = i;
      probe.markNativeCallback();
    }
    expect(probe.snapshot()).toMatchObject({
      nativeCallbackCount: 100_000,
      intervalCount: 120,
    });
    expect(probe.snapshot().meanIntervalMs).toBeCloseTo(1, 12);
    probe.reset();
    expect(probe.snapshot()).toMatchObject({
      status: "waiting",
      nativeCallbackCount: 0,
      lastCallbackAgeMs: null,
      intervalCount: 0,
    });
  });

  it.each([0, -1, 1.5, 257, Infinity])(
    "rejects unbounded or invalid capacity %s",
    (capacity) => {
      expect(() => new NativeCubismCadence(() => 0, capacity)).toThrow(
        "capacity",
      );
    },
  );
});

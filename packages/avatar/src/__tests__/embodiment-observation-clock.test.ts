import { EmbodimentObservationClock } from "../embodiment-observation-clock";

/** Clock fixtures verify provenance arithmetic, not real renderer performance. */
describe("EmbodimentObservationClock", () => {
  it("retains distinct write and read times at actual native boundaries", () => {
    let now = 100;
    const clock = new EmbodimentObservationClock(() => now);
    clock.markWrite(1000);
    clock.markNativeUpdate();
    now = 350;
    clock.markNativeUpdate();
    expect(clock.observe()).toEqual({
      writeSequence: 1,
      nativeUpdateAtWrite: 0,
      nativeUpdateAtReadback: 2,
      nativeUpdatesSinceWrite: 2,
      writtenAtMonotonicMs: 100,
      readAtMonotonicMs: 350,
      elapsedMs: 250,
      writtenAt: 1000,
    });
  });

  it("uses the latest rewritten target rather than the initial projection", () => {
    let now = 100;
    const clock = new EmbodimentObservationClock(() => now);
    clock.markWrite(1000);
    clock.markNativeUpdate();
    now = 200;
    clock.markWrite(1100);
    now = 225;
    clock.markNativeUpdate();
    expect(clock.observe()).toMatchObject({
      writeSequence: 2,
      elapsedMs: 25,
      nativeUpdatesSinceWrite: 1,
      writtenAt: 1100,
    });
  });

  it("does not count a hidden pause as native updates or use wall-clock rollback for durations", () => {
    let now = 100;
    const clock = new EmbodimentObservationClock(() => now);
    clock.markWrite(50_000);
    clock.markNativeUpdate();
    now = 10_100;
    expect(clock.observe()).toMatchObject({
      elapsedMs: 10_000,
      nativeUpdatesSinceWrite: 1,
    });
    clock.markWrite(10); // Wall clock moved backward; monotonic time did not.
    now = 10_120;
    clock.markNativeUpdate();
    expect(clock.observe()).toMatchObject({ elapsedMs: 20, writtenAt: 10 });
  });

  it("returns detached snapshots and invalidates all metadata on reset", () => {
    const clock = new EmbodimentObservationClock(() => 100);
    expect(clock.observe()).toBeNull();
    clock.markWrite(1000);
    clock.observe()!.writtenAt = 999;
    expect(clock.observe()!.writtenAt).toBe(1000);
    clock.reset();
    expect(clock.observe()).toBeNull();
    expect(clock.getWrittenAt()).toBeUndefined();
    clock.markWrite(2000);
    expect(clock.observe()!.writeSequence).toBe(1);
    expect(clock.observe()!.nativeUpdateAtReadback).toBe(0);
  });

  it.each([NaN, Infinity, -1, null])(
    "abstains when monotonic time is unusable: %s",
    (invalid) => {
      let now: number | null = 100;
      const clock = new EmbodimentObservationClock(() => now);
      clock.markWrite(1000);
      now = invalid;
      expect(clock.observe()).toBeNull();
      now = 200;
      expect(clock.observe()).toBeNull();
      now = invalid;
      clock.markWrite(1000);
      now = 300;
      expect(clock.observe()).toBeNull();
    },
  );

  it("rejects a backwards monotonic observation and never fabricates zero latency", () => {
    let now = 200;
    const clock = new EmbodimentObservationClock(() => now);
    clock.markWrite(1000);
    now = 100;
    expect(clock.observe()).toBeNull();
    now = 300;
    expect(clock.observe()).toBeNull();
  });

  it.each([NaN, Infinity, -1])(
    "rejects an unusable write epoch: %s",
    (wall) => {
      const clock = new EmbodimentObservationClock(() => 100);
      clock.markWrite(wall);
      expect(clock.observe()).toBeNull();
    },
  );
});

/** Descriptive native parameter-callback timing, never display FPS or authority. */
export interface NativeCubismCadenceSnapshot {
  status: "waiting" | "observed" | "unavailable";
  /** Historical callback count for this manager/model lifetime, including paused callbacks. */
  nativeCallbackCount: number;
  visible: boolean;
  capacity: number;
  intervalCount: number;
  meanIntervalMs: number | null;
  minIntervalMs: number | null;
  maxIntervalMs: number | null;
  lastCallbackAgeMs: number | null;
}

/**
 * A bounded ring fed only by beforeModelUpdate. Reads and visibility changes
 * cannot create callbacks. Hidden intervals and invalid clocks are not samples.
 * No timers, animation/control writes, calibration, neural or DAO dependencies.
 */
export class NativeCubismCadence {
  private readonly intervals: number[] = [];
  private cursor = 0;
  private nativeCallbackCount = 0;
  private previous: number | null = null;
  private lastCallback: number | null = null;
  private visible = true;
  private clockValid = true;

  constructor(
    private readonly now: () => number | null = () =>
      typeof performance !== "undefined" ? performance.now() : null,
    private readonly capacity = 120,
  ) {
    if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 256) {
      throw new Error(
        "Native cadence capacity must be an integer from 1 to 256",
      );
    }
  }

  markNativeCallback(): void {
    this.nativeCallbackCount++;
    const time = this.now();
    if (
      !this.validTime(time) ||
      (this.lastCallback !== null && time < this.lastCallback)
    ) {
      this.clearIntervals();
      this.lastCallback = null;
      this.clockValid = false;
      return;
    }
    this.clockValid = true;
    this.lastCallback = time;
    if (!this.visible) return;
    if (this.previous !== null) {
      const interval = time - this.previous;
      if (this.intervals.length < this.capacity) this.intervals.push(interval);
      else {
        this.intervals[this.cursor] = interval;
        this.cursor = (this.cursor + 1) % this.capacity;
      }
    }
    this.previous = time;
  }

  setVisible(visible: boolean): void {
    if (visible === this.visible) return;
    this.visible = visible;
    this.clearIntervals();
  }

  snapshot(): NativeCubismCadenceSnapshot {
    const time = this.now();
    const valid =
      this.clockValid &&
      this.validTime(time) &&
      (this.lastCallback === null || time >= this.lastCallback);
    const measured = valid && this.visible && this.intervals.length > 0;
    // Scale terms before addition so even a large finite interval window cannot
    // overflow the descriptive mean. This is not a learned estimate.
    const mean = measured
      ? this.intervals.reduce(
          (sum, value) => sum + value / this.intervals.length,
          0,
        )
      : null;
    return {
      status: !valid ? "unavailable" : measured ? "observed" : "waiting",
      nativeCallbackCount: this.nativeCallbackCount,
      visible: this.visible,
      capacity: this.capacity,
      intervalCount: measured ? this.intervals.length : 0,
      meanIntervalMs: mean,
      minIntervalMs: measured ? Math.min(...this.intervals) : null,
      maxIntervalMs: measured ? Math.max(...this.intervals) : null,
      lastCallbackAgeMs:
        valid && this.lastCallback !== null ? time! - this.lastCallback : null,
    };
  }

  reset(): void {
    this.nativeCallbackCount = 0;
    this.lastCallback = null;
    this.clockValid = true;
    this.clearIntervals();
  }

  private clearIntervals(): void {
    this.intervals.length = 0;
    this.cursor = 0;
    this.previous = null;
  }

  private validTime(value: number | null): value is number {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  }
}

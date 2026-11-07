/** Temporal provenance for a local Cubism target/readback pair, not render latency. */
export interface EmbodimentObservationTiming {
  writeSequence: number;
  nativeUpdateAtWrite: number;
  nativeUpdateAtReadback: number;
  nativeUpdatesSinceWrite: number;
  writtenAtMonotonicMs: number;
  readAtMonotonicMs: number;
  elapsedMs: number;
  /** Epoch time of the actual write; never used to compute elapsed duration. */
  writtenAt: number;
}

/** Retains only the latest write; no history, timers, learning or authority. */
export class EmbodimentObservationClock {
  private writeSequence = 0;
  private nativeUpdateSequence = 0;
  private latestWrite: {
    sequence: number;
    nativeUpdate: number;
    monotonicMs: number;
    wallMs: number;
  } | null = null;

  constructor(
    private readonly now: () => number | null = () =>
      typeof performance !== "undefined" ? performance.now() : null,
  ) {}

  markWrite(wallMs = Date.now()): void {
    const monotonicMs = this.now();
    this.writeSequence++;
    this.latestWrite =
      this.validTime(monotonicMs) && this.validTime(wallMs)
        ? {
            sequence: this.writeSequence,
            nativeUpdate: this.nativeUpdateSequence,
            monotonicMs,
            wallMs,
          }
        : null;
  }

  /** Count real before-model-update callbacks, not ticker ticks or wall time. */
  markNativeUpdate(): void {
    this.nativeUpdateSequence++;
  }

  getWrittenAt(): number | undefined {
    return this.latestWrite?.wallMs;
  }

  observe(): EmbodimentObservationTiming | null {
    const write = this.latestWrite;
    const readAtMonotonicMs = this.now();
    if (
      !write ||
      !this.validTime(readAtMonotonicMs) ||
      readAtMonotonicMs < write.monotonicMs
    ) {
      this.latestWrite = null;
      return null;
    }
    return {
      writeSequence: write.sequence,
      nativeUpdateAtWrite: write.nativeUpdate,
      nativeUpdateAtReadback: this.nativeUpdateSequence,
      nativeUpdatesSinceWrite: this.nativeUpdateSequence - write.nativeUpdate,
      writtenAtMonotonicMs: write.monotonicMs,
      readAtMonotonicMs,
      elapsedMs: readAtMonotonicMs - write.monotonicMs,
      writtenAt: write.wallMs,
    };
  }

  reset(): void {
    this.latestWrite = null;
    this.writeSequence = 0;
    this.nativeUpdateSequence = 0;
  }

  private validTime(value: number | null): value is number {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  }
}

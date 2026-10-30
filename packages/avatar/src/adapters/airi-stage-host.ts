import type {
  AiriStageCue,
  AiriOwnedPoseAxis,
  AiriStageCueSink,
} from "./airi-stage-cue-adapter";

/** AIRI MAGIC's complete normalized Pose; DTE never owns mouth or translation. */
export interface AiriStagePose {
  eyeX: number;
  eyeY: number;
  eyeSquint: number;
  headX: number;
  headY: number;
  headZ: number;
  bodyX: number;
  bodyY: number;
  bodyZ: number;
  mouthForm: number;
  mouthOpen: number;
  offsetX: number;
  offsetY: number;
}

export interface AiriSelectedModel {
  id: string;
  /** SHA-256 of the selected model's real, locally verified package bytes. */
  sha256: string;
  expressions: readonly string[];
  motions: readonly string[];
}

export interface AiriStageHostOptions {
  /** Host-owned functions. Do not derive these from untrusted cue fields. */
  selectedModel: () => AiriSelectedModel | null;
  isSpeaking: () => boolean;
  now?: () => number;
}

const MAX_OBSERVATION_AGE_MS = 500;
const MAX_LEASE_MS = 3_000;
const MAX_RETIRED_LEASES = 1_024;
const SHA256 = /^[a-f0-9]{64}$/;
const LEASE_ID = /^[a-zA-Z0-9_-]{8,64}$/;
const AXES = new Set<AiriOwnedPoseAxis>([
  "eyeX",
  "eyeY",
  "eyeSquint",
  "headX",
  "headY",
  "headZ",
  "bodyX",
  "bodyY",
  "bodyZ",
]);
const FIELDS = new Set([
  "schemaVersion",
  "kind",
  "modelId",
  "modelSha256",
  "leaseId",
  "observedAt",
  "expiresAt",
  "expressionName",
  "motion",
  "pose",
]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Stage-owned, presentation-only host. Place behind an authenticated local transport.
 * This class does not grant an arbitrary web page a right to send cues to AIRI.
 */
export class AiriStageCueHost implements AiriStageCueSink {
  private readonly now: () => number;
  private current: AiriStageCue | null = null;
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private readonly retired = new Set<string>();
  private lastObservedAt = -Infinity;
  private disposed = false;

  constructor(private readonly options: AiriStageHostOptions) {
    this.now = options.now ?? Date.now;
  }

  /** A false return is a transport rejection, not a request to mutate AIRI state. */
  publish(input: AiriStageCue): boolean {
    if (this.disposed) return false;
    try {
      const time = this.now();
      const model = this.options.selectedModel();
      if (!this.isValid(input, model, time)) {
        if (this.isDuplicate(input)) return false;
        this.revoke();
        return false;
      }
      const cue: AiriStageCue = Object.freeze({
        schemaVersion: 1,
        kind: "dte.presentation.cue",
        modelId: input.modelId,
        modelSha256: input.modelSha256,
        leaseId: input.leaseId,
        observedAt: input.observedAt,
        expiresAt: input.expiresAt,
        expressionName: input.expressionName,
        motion: input.motion,
        pose: Object.freeze({ ...input.pose }),
      });
      if (this.current && this.current.leaseId !== cue.leaseId) this.revoke();
      if (this.retired.size >= MAX_RETIRED_LEASES) return false;
      this.current = cue;
      this.lastObservedAt = cue.observedAt;
      this.clearTimer();
      this.timeout = setTimeout(() => this.revoke(), cue.expiresAt - time);
      if (typeof this.timeout === "object" && "unref" in this.timeout)
        this.timeout.unref();
      return true;
    } catch {
      this.revoke();
      return false;
    }
  }

  /** A stale or unrelated release cannot clear another source's stage controls. */
  release(leaseId: string): void {
    if (this.current?.leaseId === leaseId) this.revoke();
  }

  /** Apply sparse pose axes after AIRI has generated its current complete frame. */
  compose(basePose: AiriStagePose): AiriStagePose {
    const cue = this.activeCue();
    if (!cue) return basePose;
    return { ...basePose, ...cue.pose };
  }

  /** Only expose names actually declared by AIRI's currently loaded model. */
  get activeExpression(): string | null {
    if (this.options.isSpeaking()) return null;
    return this.activeCue()?.expressionName ?? null;
  }

  get activeMotion(): string | null {
    if (this.options.isSpeaking()) return null;
    return this.activeCue()?.motion ?? null;
  }

  snapshot(): AiriStageCue | null {
    return this.activeCue();
  }

  revoke(): void {
    if (this.current) this.retired.add(this.current.leaseId);
    this.current = null;
    this.clearTimer();
  }

  dispose(): void {
    this.revoke();
    this.disposed = true;
  }

  private isDuplicate(input: unknown): boolean {
    if (
      !this.current ||
      !isPlainRecord(input) ||
      Object.keys(input).length !== FIELDS.size ||
      Object.keys(input).some((key) => !FIELDS.has(key)) ||
      !isPlainRecord(input.pose)
    )
      return false;
    const previous = this.current;
    const pose = input.pose;
    return (
      input.leaseId === previous.leaseId &&
      input.observedAt === previous.observedAt &&
      input.expiresAt === previous.expiresAt &&
      input.modelId === previous.modelId &&
      input.modelSha256 === previous.modelSha256 &&
      input.kind === previous.kind &&
      input.schemaVersion === previous.schemaVersion &&
      input.expressionName === previous.expressionName &&
      input.motion === previous.motion &&
      Object.keys(pose).length === Object.keys(previous.pose).length &&
      Object.entries(pose).every(
        ([key, value]) =>
          key in previous.pose &&
          previous.pose[key as AiriOwnedPoseAxis] === value,
      )
    );
  }

  private activeCue(): AiriStageCue | null {
    if (!this.current || this.disposed) return null;
    try {
      const now = this.now();
      const model = this.options.selectedModel();
      if (
        !Number.isFinite(now) ||
        now < this.current.observedAt ||
        now >= this.current.expiresAt ||
        model?.id !== this.current.modelId ||
        model.sha256 !== this.current.modelSha256 ||
        (this.current.expressionName !== null &&
          !model.expressions.includes(this.current.expressionName)) ||
        (this.current.motion !== null &&
          !model.motions.includes(this.current.motion))
      ) {
        this.revoke();
        return null;
      }
      return this.current;
    } catch {
      this.revoke();
      return null;
    }
  }

  private isValid(
    input: unknown,
    model: AiriSelectedModel | null,
    time: number,
  ): input is AiriStageCue {
    if (
      !isPlainRecord(input) ||
      !model ||
      !Number.isFinite(time) ||
      Object.keys(input).some((key) => !FIELDS.has(key)) ||
      input.schemaVersion !== 1 ||
      input.kind !== "dte.presentation.cue" ||
      input.modelId !== model.id ||
      input.modelSha256 !== model.sha256 ||
      typeof input.modelSha256 !== "string" ||
      !SHA256.test(input.modelSha256) ||
      typeof input.leaseId !== "string" ||
      !LEASE_ID.test(input.leaseId) ||
      this.retired.has(input.leaseId) ||
      typeof input.observedAt !== "number" ||
      !Number.isFinite(input.observedAt) ||
      input.observedAt <= this.lastObservedAt ||
      input.observedAt > time ||
      time - input.observedAt > MAX_OBSERVATION_AGE_MS ||
      typeof input.expiresAt !== "number" ||
      !Number.isFinite(input.expiresAt) ||
      input.expiresAt <= time ||
      input.expiresAt <= input.observedAt ||
      input.expiresAt - time > MAX_LEASE_MS ||
      (input.expressionName !== null &&
        (typeof input.expressionName !== "string" ||
          !model.expressions.includes(input.expressionName))) ||
      (input.motion !== null &&
        (typeof input.motion !== "string" ||
          !model.motions.includes(input.motion))) ||
      !isPlainRecord(input.pose)
    )
      return false;
    const pose = input.pose;
    const axes = Object.keys(pose);
    if (!axes.length && !input.expressionName && !input.motion) return false;
    return axes.every((axis) => {
      if (!AXES.has(axis as AiriOwnedPoseAxis)) return false;
      const value = pose[axis];
      return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= (axis === "eyeSquint" ? 0 : -1) &&
        value <= 1
      );
    });
  }

  private clearTimer(): void {
    if (this.timeout !== null) clearTimeout(this.timeout);
    this.timeout = null;
  }
}

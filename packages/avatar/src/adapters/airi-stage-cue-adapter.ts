import type { DTEchoVisualProjection } from "../dtecho-expression-driver";
import type { AvatarMotion } from "../types";

/** Only these normalized AIRI Pose axes are owned by DTE; mouth and translation remain AIRI/audio-owned. */
export type AiriOwnedPoseAxis =
  | "eyeX"
  | "eyeY"
  | "eyeSquint"
  | "headX"
  | "headY"
  | "headZ"
  | "bodyX"
  | "bodyY"
  | "bodyZ";

export interface AiriStageLease {
  /** A local broker must validate its own session; this label alone is NOT authentication. */
  source: "dte-local-cognitive-bridge";
  modelId: string;
  /** Digest of the actual selected model, checked independently by the host. */
  modelSha256: string;
  leaseId: string;
  observedAt: number;
  expiresAt: number;
  coreSelfInitialized: boolean;
  audioActive: boolean;
}

export interface AiriStageCue {
  readonly schemaVersion: 1;
  readonly kind: "dte.presentation.cue";
  readonly modelId: string;
  readonly modelSha256: string;
  readonly leaseId: string;
  readonly observedAt: number;
  readonly expiresAt: number;
  readonly expressionName: string | null;
  readonly motion: AvatarMotion | null;
  readonly pose: Readonly<Partial<Record<AiriOwnedPoseAxis, number>>>;
}

/** A host-implemented transport owns the loaded AIRI stage and must honor expiresAt and release. */
export interface AiriStageCueSink {
  publish(cue: AiriStageCue): void;
  release(leaseId: string): void;
}

export interface AiriStageCueConfig {
  modelId: string;
  modelSha256: string;
  /** Obtain from the imported model's real manifest, never from a projected wish-list. */
  availableExpressions: readonly string[];
  availableMotions: readonly AvatarMotion[];
  now?: () => number;
  maxObservationAgeMs?: number;
  maxLeaseMs?: number;
}

export type AiriCueResult = "published" | "rejected";

const SHA256 = /^[a-f0-9]{64}$/;
const MODEL_ID = /^[a-z0-9][a-z0-9_-]{1,63}$/;
const LEASE_ID = /^[a-zA-Z0-9_-]{8,64}$/;
const MAX_AGE_MS = 2_000;
const MAX_LEASE_MS = 5_000;
const MAX_RETIRED_LEASES = 1_024;

const AXES: readonly [string, AiriOwnedPoseAxis, number][] = [
  ["ParamEyeBallX", "eyeX", 1],
  ["ParamEyeBallY", "eyeY", 1],
  ["ParamAngleX", "headX", 30],
  ["ParamAngleY", "headY", 30],
  ["ParamAngleZ", "headZ", 30],
  ["ParamBodyAngleX", "bodyX", 15],
  ["ParamBodyAngleY", "bodyY", 15],
  ["ParamBodyAngleZ", "bodyZ", 15],
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Never copy the projection's cognitive fields, unknown parameters, or mouth axes. */
function boundedPose(
  params: Record<string, number>,
): AiriStageCue["pose"] | null {
  if (!params || typeof params !== "object") return null;
  const pose: Partial<Record<AiriOwnedPoseAxis, number>> = {};
  for (const [paramId, axis, scale] of AXES) {
    const value = params[paramId];
    if (value === undefined) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    pose[axis] = clamp(value / scale, -1, 1);
  }
  const left = params.ParamEyeLOpen;
  const right = params.ParamEyeROpen;
  if (left !== undefined || right !== undefined) {
    if (
      typeof left !== "number" ||
      !Number.isFinite(left) ||
      typeof right !== "number" ||
      !Number.isFinite(right)
    )
      return null;
    pose.eyeSquint = clamp(1 - (left + right) / 2, 0, 1);
  }
  return Object.freeze(pose);
}

/**
 * Outbound presentation only. Not a credential, AIRI plugin implementation, Cubism model,
 * rendered-frame observation, or core-self mutation path. The host must authenticate its
 * private DTE session and validate the selected model digest before creating this adapter.
 */
export class AiriStageCueAdapter {
  private readonly now: () => number;
  private readonly maxObservationAgeMs: number;
  private readonly maxLeaseMs: number;
  private readonly expressions: ReadonlySet<string>;
  private readonly motions: ReadonlySet<AvatarMotion>;
  private active: {
    leaseId: string;
    expiresAt: number;
    observedAt: number;
  } | null = null;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private readonly retiredLeaseIds = new Set<string>();

  constructor(
    private readonly sink: AiriStageCueSink,
    private readonly config: AiriStageCueConfig,
  ) {
    if (!MODEL_ID.test(config.modelId) || !SHA256.test(config.modelSha256)) {
      throw new Error(
        "AIRI stage cue requires a model identity and lowercase SHA-256 digest",
      );
    }
    this.maxObservationAgeMs = config.maxObservationAgeMs ?? 500;
    this.maxLeaseMs = config.maxLeaseMs ?? 3_000;
    if (
      !Number.isFinite(this.maxObservationAgeMs) ||
      this.maxObservationAgeMs <= 0 ||
      this.maxObservationAgeMs > MAX_AGE_MS ||
      !Number.isFinite(this.maxLeaseMs) ||
      this.maxLeaseMs <= 0 ||
      this.maxLeaseMs > MAX_LEASE_MS
    )
      throw new Error("AIRI cue freshness/lease windows must remain bounded");
    this.now = config.now ?? Date.now;
    this.expressions = new Set(config.availableExpressions);
    this.motions = new Set(config.availableMotions);
  }

  submit(
    projection: DTEchoVisualProjection,
    lease: AiriStageLease,
  ): AiriCueResult {
    if (this.disposed) return "rejected";
    const now = this.now();
    if (
      !Number.isFinite(now) ||
      !lease ||
      lease.source !== "dte-local-cognitive-bridge" ||
      lease.modelId !== this.config.modelId ||
      lease.modelSha256 !== this.config.modelSha256 ||
      !LEASE_ID.test(lease.leaseId) ||
      lease.coreSelfInitialized !== true ||
      typeof lease.audioActive !== "boolean" ||
      !Number.isFinite(lease.observedAt) ||
      !Number.isFinite(lease.expiresAt) ||
      lease.observedAt > now ||
      now - lease.observedAt > this.maxObservationAgeMs ||
      lease.expiresAt <= now ||
      lease.expiresAt <= lease.observedAt ||
      lease.expiresAt - now > this.maxLeaseMs
    ) {
      this.revoke();
      return "rejected";
    }
    if (this.retiredLeaseIds.has(lease.leaseId)) return "rejected";
    if (this.retiredLeaseIds.size >= MAX_RETIRED_LEASES) {
      this.revoke();
      return "rejected";
    }
    if (
      this.active?.leaseId === lease.leaseId &&
      lease.observedAt <= this.active.observedAt
    ) {
      return "rejected";
    }
    const pose = boundedPose(projection?.cubism);
    if (!pose) {
      this.revoke();
      return "rejected";
    }
    const cue: AiriStageCue = Object.freeze({
      schemaVersion: 1,
      kind: "dte.presentation.cue",
      modelId: lease.modelId,
      modelSha256: lease.modelSha256,
      leaseId: lease.leaseId,
      observedAt: lease.observedAt,
      expiresAt: lease.expiresAt,
      expressionName:
        !lease.audioActive && this.expressions.has(projection.expressionName)
          ? projection.expressionName
          : null,
      motion:
        !lease.audioActive &&
        projection.motion &&
        this.motions.has(projection.motion)
          ? projection.motion
          : null,
      pose,
    });
    if (!Object.keys(pose).length && !cue.expressionName && !cue.motion) {
      this.revoke();
      return "rejected";
    }
    if (this.active && this.active.leaseId !== lease.leaseId) this.revoke();
    if (this.disposed) return "rejected";
    try {
      this.active = {
        leaseId: lease.leaseId,
        expiresAt: lease.expiresAt,
        observedAt: lease.observedAt,
      };
      this.clearTimer();
      this.expiryTimer = setTimeout(() => this.revoke(), lease.expiresAt - now);
      if (typeof this.expiryTimer === "object" && "unref" in this.expiryTimer) {
        this.expiryTimer.unref();
      }
      this.sink.publish(cue);
      // A synchronous host callback may revoke this lease during publish.
      if (
        this.active?.leaseId !== lease.leaseId ||
        this.active.observedAt !== lease.observedAt
      ) {
        return "rejected";
      }
      return "published";
    } catch {
      this.revoke(lease.leaseId);
      return "rejected";
    }
  }

  /** Host heartbeat may expire a lease earlier than the wall-clock fail-safe timer. */
  tick(): boolean {
    if (!this.active) return false;
    const now = this.now();
    if (!Number.isFinite(now) || now >= this.active.expiresAt) {
      this.revoke();
      return true;
    }
    return false;
  }

  /** Release only DTE-owned controls, never reset other AIRI stage or audio state. */
  revoke(failedPublishLeaseId?: string): void {
    const leaseId = this.active?.leaseId ?? failedPublishLeaseId;
    this.active = null;
    this.clearTimer();
    if (leaseId) {
      this.retiredLeaseIds.add(leaseId);
      try {
        this.sink.release(leaseId);
      } catch {
        // If the sink cannot release ownership, do not grant another lease.
        this.disposed = true;
      }
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.revoke();
    this.disposed = true;
  }

  private clearTimer(): void {
    if (this.expiryTimer !== null) clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
  }
}

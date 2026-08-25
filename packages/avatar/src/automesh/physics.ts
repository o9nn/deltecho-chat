/**
 * Retarget Cubism physics3 settings toward a character's motion style
 * without rewriting `.physics3.json`. Snapshot originals so Miara can
 * restore when the identity clears.
 *
 * Live2D Cubism 4 runtime layout (pixi-live2d-display):
 * `internal.physics._physicsRig` has `settings`, `outputs`, `particles`.
 * Setting names live in Meta.PhysicsDictionary, not on the sub-rigs.
 */

export type PhysicsParticleSnapshot = {
  mobility: number;
  delay: number;
  acceleration: number;
  radius: number;
};

export type PhysicsOutputSnapshot = {
  angleScale: number;
  weight: number;
};

export type PhysicsRigSnapshot = {
  particles: PhysicsParticleSnapshot[];
  outputs: PhysicsOutputSnapshot[];
};

export type PhysicsGroupKind = "hair" | "cloth" | "wings" | "accessory";

export type PhysicsGroupScale = {
  readonly delay?: number;
  readonly mobility?: number;
  readonly acceleration?: number;
  readonly radius?: number;
  readonly angleScale?: number;
  readonly weight?: number;
};

export type PhysicsRetargetProfile = {
  readonly id: string;
  readonly groups: Readonly<Record<PhysicsGroupKind, PhysicsGroupScale>>;
};

/** Official Miara physics3 dictionary, index-aligned with PhysicsSettings. */
export const MIARA_PHYSICS_SETTING_NAMES = [
  "Twin tail",
  "Front hair",
  "Side hair",
  "Back hair",
  "Aho hair sway",
  "Left behind the back",
  "Sleeve Left",
  "Sleeve right",
  "loincloth",
  "Breast accessory",
  "Move bust Y",
  "Left cloth",
  "Left cloth twist",
  "Right cloth",
  "Right cloth twist",
  "Right rear wings",
  "Fairy wings fluctuate",
  "Move Bust X",
  "Right hair accessory",
] as const;

/** Melody: heavier ponytail, quieter fairy dress, livelier musical wings. */
export const MELODY_PHYSICS_RETARGET: PhysicsRetargetProfile = {
  id: "melody",
  groups: {
    hair: {
      delay: 1.18,
      mobility: 0.9,
      acceleration: 0.86,
      radius: 1.1,
      angleScale: 0.88,
    },
    cloth: {
      delay: 0.62,
      mobility: 0.38,
      acceleration: 0.42,
      radius: 0.65,
      angleScale: 0.32,
      weight: 0.55,
    },
    wings: {
      delay: 1.22,
      mobility: 1.18,
      acceleration: 1.08,
      radius: 1.22,
      angleScale: 1.18,
    },
    accessory: {
      delay: 0.82,
      mobility: 0.68,
      acceleration: 0.72,
      radius: 0.88,
      angleScale: 0.6,
    },
  },
};

/** Deep Tree Echo: slower mossy hair, living wings, slightly quieter cloth. */
export const GROVE_PHYSICS_RETARGET: PhysicsRetargetProfile = {
  id: "deep-tree-echo",
  groups: {
    hair: {
      delay: 1.12,
      mobility: 0.88,
      acceleration: 0.84,
      radius: 1.06,
      angleScale: 0.92,
    },
    cloth: {
      delay: 0.9,
      mobility: 0.82,
      acceleration: 0.85,
      radius: 0.92,
      angleScale: 0.8,
    },
    wings: {
      delay: 1.28,
      mobility: 1.22,
      acceleration: 1.12,
      radius: 1.18,
      angleScale: 1.24,
    },
    accessory: {
      delay: 1.05,
      mobility: 0.9,
      acceleration: 0.88,
      radius: 1.04,
      angleScale: 0.85,
    },
  },
};

export type PhysicsSettingLike = {
  readonly name?: string;
  readonly baseParticleIndex: number;
  readonly particleCount: number;
  readonly baseOutputIndex: number;
  readonly outputCount: number;
};

export type PhysicsParticleLike = {
  mobility: number;
  delay: number;
  acceleration: number;
  radius: number;
};

export type PhysicsOutputLike = {
  angleScale: number;
  weight: number;
};

export type PhysicsRigLike = {
  readonly settings: readonly PhysicsSettingLike[];
  readonly particles: PhysicsParticleLike[];
  readonly outputs: PhysicsOutputLike[];
};

export function classifyPhysicsSettingName(
  name: string,
): PhysicsGroupKind | null {
  const n = name.toLowerCase();
  if (n.includes("wing")) return "wings";
  if (
    n.includes("accessory") ||
    n.includes("headset") ||
    n.includes("headphone")
  ) {
    return "accessory";
  }
  if (
    n.includes("sleeve") ||
    n.includes("cloth") ||
    n.includes("loincloth") ||
    n.includes("chest") ||
    n.includes("dress") ||
    n.includes("skirt")
  ) {
    return "cloth";
  }
  if (
    n.includes("hair") ||
    n.includes("twintail") ||
    n.includes("twin") ||
    n.includes("bang") ||
    n.includes("behind")
  ) {
    return "hair";
  }
  return null;
}

export function namePhysicsSettings(
  settings: readonly PhysicsSettingLike[],
  names: readonly string[] = MIARA_PHYSICS_SETTING_NAMES,
): PhysicsSettingLike[] {
  return settings.map((setting, index) => ({
    ...setting,
    name: setting.name || names[index] || "",
  }));
}

export function snapshotPhysicsRig(rig: PhysicsRigLike): PhysicsRigSnapshot {
  return {
    particles: rig.particles.map((particle) => ({
      mobility: particle.mobility,
      delay: particle.delay,
      acceleration: particle.acceleration,
      radius: particle.radius,
    })),
    outputs: rig.outputs.map((output) => ({
      angleScale: output.angleScale,
      weight: output.weight,
    })),
  };
}

export function restorePhysicsRig(
  rig: PhysicsRigLike,
  snapshot: PhysicsRigSnapshot,
): void {
  const particleCount = Math.min(
    rig.particles.length,
    snapshot.particles.length,
  );
  for (let i = 0; i < particleCount; i++) {
    const src = snapshot.particles[i];
    const dst = rig.particles[i];
    dst.mobility = src.mobility;
    dst.delay = src.delay;
    dst.acceleration = src.acceleration;
    dst.radius = src.radius;
  }
  const outputCount = Math.min(rig.outputs.length, snapshot.outputs.length);
  for (let i = 0; i < outputCount; i++) {
    const src = snapshot.outputs[i];
    const dst = rig.outputs[i];
    dst.angleScale = src.angleScale;
    dst.weight = src.weight;
  }
}

function scaleParticle(
  particle: PhysicsParticleLike,
  snapshot: PhysicsParticleSnapshot,
  scale: PhysicsGroupScale,
): void {
  particle.mobility = snapshot.mobility * (scale.mobility ?? 1);
  particle.delay = snapshot.delay * (scale.delay ?? 1);
  particle.acceleration = snapshot.acceleration * (scale.acceleration ?? 1);
  particle.radius = snapshot.radius * (scale.radius ?? 1);
}

function scaleOutput(
  output: PhysicsOutputLike,
  snapshot: PhysicsOutputSnapshot,
  scale: PhysicsGroupScale,
): void {
  output.angleScale = snapshot.angleScale * (scale.angleScale ?? 1);
  output.weight = snapshot.weight * (scale.weight ?? 1);
}

/**
 * Multiply each classified physics group from the snapshot (Miara base)
 * toward the identity profile. Unclassified settings stay at snapshot.
 */
export function applyPhysicsRetarget(
  rig: PhysicsRigLike,
  snapshot: PhysicsRigSnapshot,
  profile: PhysicsRetargetProfile,
): void {
  restorePhysicsRig(rig, snapshot);
  for (const setting of rig.settings) {
    const kind = classifyPhysicsSettingName(setting.name ?? "");
    if (!kind) continue;
    const scale = profile.groups[kind];
    const particleStart = setting.baseParticleIndex;
    const particleEnd = particleStart + setting.particleCount;
    for (
      let i = particleStart;
      i < particleEnd && i < rig.particles.length;
      i++
    ) {
      const snap = snapshot.particles[i];
      if (!snap) continue;
      scaleParticle(rig.particles[i], snap, scale);
    }
    const outputStart = setting.baseOutputIndex;
    const outputEnd = outputStart + setting.outputCount;
    for (let i = outputStart; i < outputEnd && i < rig.outputs.length; i++) {
      const snap = snapshot.outputs[i];
      if (!snap) continue;
      scaleOutput(rig.outputs[i], snap, scale);
    }
  }
}

export function readPhysicsDictionaryNames(physics3: {
  Meta?: { PhysicsDictionary?: readonly { Name?: string }[] };
}): string[] {
  return (physics3.Meta?.PhysicsDictionary ?? []).map(
    (entry) => entry.Name ?? "",
  );
}

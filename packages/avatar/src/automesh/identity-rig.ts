/**
 * Per-identity convergence on the shared Miara `.moc3`:
 * remapped atlas (texture), runtime mesh deform (shape), and physics
 * retarget (motion). Official topology stays; each named look pulls
 * vertices and physics toward its reference character.
 */

import {
  GROVE_MESH_DEFORM,
  MELODY_MESH_DEFORM,
  type MeshDeformProfile,
} from "./deform";
import {
  GROVE_PHYSICS_RETARGET,
  MELODY_PHYSICS_RETARGET,
  type PhysicsRetargetProfile,
} from "./physics";

export type IdentityRigId = "melody" | "deep-tree-echo";

export type IdentityRig = {
  readonly id: IdentityRigId;
  readonly deform: MeshDeformProfile;
  /** Present for bake/tests. Runtime skips this when the model folder already baked physics. */
  readonly physics: PhysicsRetargetProfile;
  readonly bakedPhysics?: boolean;
};

export const MELODY_IDENTITY_RIG: IdentityRig = {
  id: "melody",
  deform: MELODY_MESH_DEFORM,
  physics: MELODY_PHYSICS_RETARGET,
  bakedPhysics: true,
};

export const GROVE_IDENTITY_RIG: IdentityRig = {
  id: "deep-tree-echo",
  deform: GROVE_MESH_DEFORM,
  physics: GROVE_PHYSICS_RETARGET,
  bakedPhysics: true,
};

const IDENTITY_RIGS: Readonly<Record<IdentityRigId, IdentityRig>> = {
  melody: MELODY_IDENTITY_RIG,
  "deep-tree-echo": GROVE_IDENTITY_RIG,
};

export function resolveIdentityRig(identity: unknown): IdentityRig | null {
  if (identity === "melody" || identity === "deep-tree-echo") {
    return IDENTITY_RIGS[identity];
  }
  return null;
}

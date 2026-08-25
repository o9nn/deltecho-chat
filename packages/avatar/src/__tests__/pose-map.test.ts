import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_MELODY_POSE_ID,
  MELODY_AVATAR_MESH_MAP,
  MELODY_MESH3D_GROUPS,
  MELODY_PARAMETER_PROFILE,
  MELODY_POSE_IDS,
  MELODY_POSES,
  isMelodyPoseId,
  live2dRegionsForMesh3d,
  mesh3dGroupsForRegion,
  parametersForMelodyPose,
  poseForExpression,
  poseForMotion,
  resolveAvatarMeshMap,
  resolveMelodyPose,
  serializeMelodyPoseMap,
} from "../automesh";
import { IDENTITY_MODEL3_PATHS } from "../automesh/mesh-map";

describe("Melody pose map", () => {
  it("ships every necessary bind and performance pose", () => {
    expect(MELODY_POSE_IDS).toEqual([
      "a-pose",
      "idle",
      "talk",
      "listen",
      "smile",
      "laugh",
      "wonder",
      "think",
      "surprise",
      "sad",
      "awe",
      "wave",
    ]);
    expect(DEFAULT_MELODY_POSE_ID).toBe("a-pose");
    expect(isMelodyPoseId("a-pose")).toBe(true);
    expect(isMelodyPoseId("t-pose")).toBe(false);
    expect(MELODY_POSES).toHaveLength(MELODY_POSE_IDS.length);
  });

  it("keeps the A-pose on the dedicated Melody model with arms out and wings open", () => {
    const aPose = resolveMelodyPose("a-pose");
    expect(aPose.expression).toBe("JOY_03_GentleSmile");
    expect(aPose.motion).toBe("Idle");
    expect(aPose.parameters.ParamArmL1).toBeGreaterThan(0.3);
    expect(aPose.parameters.ParamArmR1).toBeGreaterThan(0.3);
    expect(aPose.parameters.ParamFlapping3).toBeGreaterThan(0.2);
    expect(aPose.parameters.ParamMouthForm).toBe(
      MELODY_PARAMETER_PROFILE.ParamMouthForm,
    );
    expect(parametersForMelodyPose(undefined).ParamHairTail).toBe(0.15);
  });

  it("maps semantic expressions and motions onto named poses", () => {
    expect(poseForExpression("happy").id).toBe("smile");
    expect(poseForExpression("curious").id).toBe("wonder");
    expect(poseForMotion("talking").id).toBe("talk");
    expect(poseForMotion("wave").id).toBe("wave");
    expect(poseForMotion("breathing").id).toBe("idle");
  });

  it("writes an identity-scoped pose index next to melody_t03", () => {
    const shipped = JSON.parse(
      readFileSync(
        join(process.cwd(), "../frontend/static/models/melody/pose-map.json"),
        "utf8",
      ),
    );
    const serialized = serializeMelodyPoseMap();
    expect(shipped.identity).toBe("melody");
    expect(shipped.sourceModel).toBe(IDENTITY_MODEL3_PATHS.melody);
    expect(shipped.defaultPose).toBe("a-pose");
    expect(shipped.poses.map((pose: { id: string }) => pose.id)).toEqual([
      ...MELODY_POSE_IDS,
    ]);
    expect(shipped.poses).toHaveLength(serialized.poses.length);
  });
});

describe("Melody 2D / 3D avatar mesh map", () => {
  it("binds Live2D regions to A-pose 3D groups from the still", () => {
    expect(MELODY_AVATAR_MESH_MAP.identity).toBe("melody");
    expect(MELODY_AVATAR_MESH_MAP.live2d.model3).toBe(
      IDENTITY_MODEL3_PATHS.melody,
    );
    expect(MELODY_AVATAR_MESH_MAP.mesh3d.bindPose).toBe("a-pose");
    expect(MELODY_AVATAR_MESH_MAP.mesh3d.groups.map((group) => group.id)).toEqual(
      [...MELODY_MESH3D_GROUPS],
    );
    expect(mesh3dGroupsForRegion("hair")).toEqual([
      "hairCrown",
      "hairPonytail",
      "bangs",
    ]);
    expect(mesh3dGroupsForRegion("headset")).toEqual([
      "headsetBand",
      "headsetCups",
    ]);
    expect(live2dRegionsForMesh3d("cropTop")).toEqual(["body"]);
    expect(live2dRegionsForMesh3d("wingFeathers")).toEqual(["wings"]);
    expect(resolveAvatarMeshMap("melody")?.still).toBe(
      "./images/avatar/identities/melody.webp",
    );
    expect(resolveAvatarMeshMap("miara")).toBeNull();
  });

  it("ships the 2D/3D correspondence beside the Cubism package", () => {
    const shipped = JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          "../frontend/static/models/melody/avatar-mesh-map.json",
        ),
        "utf8",
      ),
    );
    expect(shipped.identity).toBe("melody");
    expect(shipped.live2d.moc3).toBe("models/melody/melody_t03.moc3");
    expect(shipped.mesh3d.groups).toHaveLength(MELODY_MESH3D_GROUPS.length);
    expect(
      shipped.live2dTo3d.find((row: { region: string }) => row.region === "wings")
        .mesh3d,
    ).toEqual(["wingBones", "wingFeathers", "energyRibbons"]);
  });
});

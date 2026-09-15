import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  MELODY_AVATAR_MESH_MAP,
  MESH_TILE_MAP_VERSION,
  buildIdentityTileMap,
  serializeMelodyTileMap,
  tileForDrawable,
  tilesForChain,
  tilesForParameter,
} from "../automesh";
import { IDENTITY_MODEL3_PATHS } from "../automesh/mesh-map";

const melodyMeshMap = JSON.parse(
  readFileSync(
    join(process.cwd(), "../frontend/static/models/melody/mesh-map.json"),
    "utf8",
  ),
);

const tileMapPath = join(
  process.cwd(),
  "../frontend/static/models/melody/tile-map.json",
);

if (process.env.WRITE_TILE_MAP === "1") {
  writeFileSync(
    tileMapPath,
    `${JSON.stringify(serializeMelodyTileMap(melodyMeshMap), null, 2)}\n`,
  );
}

describe("Melody per-tile art map", () => {
  const tileMap = buildIdentityTileMap(melodyMeshMap);

  it("indexes every mesh-map drawable as a still-space tile", () => {
    expect(tileMap.version).toBe(MESH_TILE_MAP_VERSION);
    expect(tileMap.identity).toBe("melody");
    expect(tileMap.sourceModel).toBe(IDENTITY_MODEL3_PATHS.melody);
    expect(tileMap.tiles).toHaveLength(melodyMeshMap.drawables.length);
    expect(new Set(tileMap.tiles.map((tile) => tile.id)).size).toBe(
      melodyMeshMap.drawables.length,
    );
    for (const drawable of melodyMeshMap.drawables) {
      const tile = tileForDrawable(tileMap, drawable.id);
      expect(tile).not.toBeNull();
      if (!tile) continue;
      expect(tile.region).toBe(drawable.region);
      expect(tile.still.w).toBeGreaterThan(0);
      expect(tile.still.h).toBeGreaterThan(0);
      expect(tile.still.x).toBeGreaterThanOrEqual(0);
      expect(tile.still.y).toBeGreaterThanOrEqual(0);
      expect(tile.still.x + tile.still.w).toBeLessThanOrEqual(1.0001);
      expect(tile.still.y + tile.still.h).toBeLessThanOrEqual(1.0001);
    }
  });

  it("splits limbs into proximal-to-distal segments that match the still", () => {
    expect(tileForDrawable(tileMap, "ArtMesh83")?.segment).toBe("thigh");
    expect(tileForDrawable(tileMap, "ArtMesh91")?.segment).toBe("shin");
    expect(tileForDrawable(tileMap, "ArtMesh87")?.segment).toBe("boot");
    expect(tileForDrawable(tileMap, "ArtMesh95")?.segment).toBe("thigh");
    expect(tileForDrawable(tileMap, "ArtMesh100")?.segment).toBe("shin");
    expect(tileForDrawable(tileMap, "ArtMesh97")?.segment).toBe("boot");
    expect(tileForDrawable(tileMap, "ArtMesh152")?.segment).toBe("strap");
    expect(tileForDrawable(tileMap, "ArtMesh10")?.segment).toBe("upperArm");
    expect(tileForDrawable(tileMap, "ArtMesh16")?.segment).toBe("forearm");
    expect(tileForDrawable(tileMap, "ArtMesh159")?.segment).toBe("glove");
    expect(tileForDrawable(tileMap, "ArtMesh117")?.segment).toBe("upperArm");
    expect(tileForDrawable(tileMap, "ArtMesh80")?.segment).toBe("forearm");
    expect(tileForDrawable(tileMap, "ArtMesh175")?.segment).toBe("glove");
    expect(tileForDrawable(tileMap, "ArtMesh82")?.segment).toBe("waist");
    expect(tileForDrawable(tileMap, "ArtMesh145")?.segment).toBe("belt");
    expect(tileForDrawable(tileMap, "ArtMesh151")?.segment).toBe("hem");

    const legL = tilesForChain(tileMap, "legL");
    expect(legL.map((tile) => tile.joint)).toEqual(
      [...legL].map((tile) => tile.joint).sort((a, b) => a - b),
    );
    expect(legL[0].segment).toBe("thigh");
    expect(legL[legL.length - 1].segment).toBe("boot");
    expect(legL.every((tile) => tile.laterality === "L")).toBe(true);
    expect(legL.every((tile) => tile.stillCentroid.u > 0.6)).toBe(true);

    const legR = tilesForChain(tileMap, "legR");
    expect(legR.every((tile) => tile.laterality === "R")).toBe(true);
    expect(legR.every((tile) => tile.stillCentroid.u < 0.5)).toBe(true);
    expect(tileForDrawable(tileMap, "ArtMesh152")?.parameters).toEqual([
      "ParamLegRibbonR1",
      "ParamLegRibbonR2",
    ]);
  });

  it("binds Cubism limb parameters to the matching art-map tiles", () => {
    expect(
      tilesForParameter(tileMap, "ParamArmL1").map((tile) => tile.id),
    ).toEqual(["ArtMesh10"]);
    expect(
      tilesForParameter(tileMap, "ParamArmR1").map((tile) => tile.id),
    ).toEqual(["ArtMesh117"]);
    expect(
      tilesForParameter(tileMap, "ParamLegL3X").every(
        (tile) => tile.segment === "boot" && tile.laterality === "L",
      ),
    ).toBe(true);
    expect(tileForDrawable(tileMap, "ArtMesh132")?.laterality).toBe("L");
    expect(tileForDrawable(tileMap, "ArtMesh133")?.laterality).toBe("R");
    expect(tileForDrawable(tileMap, "ArtMesh132")?.parameters).toEqual(
      expect.arrayContaining(["ParamEyeLOpen"]),
    );
    expect(tileForDrawable(tileMap, "ArtMesh133")?.parameters).toEqual(
      expect.arrayContaining(["ParamEyeROpen"]),
    );
    expect(tileForDrawable(tileMap, "ArtMesh134")?.segment).toBe("ponytail");
    expect(tileForDrawable(tileMap, "ArtMesh178")?.segment).toBe("ribbon");
  });

  it("ships tile-map.json beside melody_t03 and points the 2D/3D map at it", () => {
    const shipped = JSON.parse(
      readFileSync(
        join(process.cwd(), "../frontend/static/models/melody/tile-map.json"),
        "utf8",
      ),
    );
    const serialized = serializeMelodyTileMap(melodyMeshMap);
    expect(shipped.identity).toBe("melody");
    expect(shipped.sourceModel).toBe(IDENTITY_MODEL3_PATHS.melody);
    expect(shipped.tiles).toHaveLength(serialized.tiles.length);
    expect(shipped.byChain.legL).toEqual(serialized.byChain.legL);
    expect(shipped.byChain.armR).toEqual(serialized.byChain.armR);
    expect(MELODY_AVATAR_MESH_MAP.live2d.tileMap).toBe(
      "models/melody/tile-map.json",
    );
    expect(MELODY_AVATAR_MESH_MAP.live2d.poseMap).toBe(
      "models/melody/pose-map.json",
    );
  });
});

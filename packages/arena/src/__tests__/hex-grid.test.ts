import {
  HexGrid,
  hexDistance,
  hexNeighbors,
  type ArenaObject,
} from "../hex-grid.js";

function makeObject(id: string, q: number, r: number): ArenaObject {
  return {
    id,
    name: id,
    position: { q, r },
    simplex: { level: 2, volume: 0.2, surface: 0.8, edge: 0.5, vertex: 0.2 },
    aesthetic: {
      centrality: 0.5,
      radiance: 0.6,
      patina: 0.2,
      scaleRelative: 0.4,
      semanticWeight: "connector",
    },
    material: {
      cost: 0.2,
      durability: 0.8,
      replaceability: 0.5,
      flexibility: 0.4,
      porosity: 0.3,
      reactivity: 0.6,
      temperature: 0,
      phase: "membrane",
    },
    color: [210, 0.7, 0.5],
    orientation: 0,
    symmetry: 0.7,
    force_vectors: [],
    metadata: {},
  };
}

describe("HexGrid", () => {
  it("constructs the complete axial hex spiral for its radius", () => {
    const grid = new HexGrid(2);

    expect(grid.cellCount()).toBe(19);
    expect(grid.getCell({ q: 0, r: 0 })).toBeDefined();
    expect(hexNeighbors({ q: 0, r: 0 })).toHaveLength(6);
    expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: -1 })).toBe(2);
  });

  it("moves objects atomically between cells and supports range perception", () => {
    const grid = new HexGrid(2);
    const anchor = makeObject("anchor", 0, 0);
    const satellite = makeObject("satellite", 2, -1);
    grid.placeObject(anchor);
    grid.placeObject(satellite);

    expect(
      grid.objectsInRange({ q: 0, r: 0 }, 1).map((item) => item.id),
    ).toEqual(["anchor"]);

    grid.moveObject("satellite", { q: 1, r: 0 });

    expect(grid.getCell({ q: 2, r: -1 })?.objects).toHaveLength(0);
    expect(grid.getCell({ q: 1, r: 0 })?.objects[0]?.id).toBe("satellite");
    expect(grid.objectsInRange({ q: 0, r: 0 }, 1)).toHaveLength(2);
  });

  it("removes relationships when an arena object leaves the field", () => {
    const grid = new HexGrid(1);
    grid.placeObject(makeObject("source", 0, 0));
    grid.placeObject(makeObject("target", 1, 0));
    grid.addRelationship({
      source: "source",
      target: "target",
      distance: 1,
      angle: 0,
      scaleRatio: 1,
      colorHarmony: 0.8,
      type: "supports",
      meaning: "stabilizes",
    });

    expect(grid.getRelationships("source")).toHaveLength(1);
    expect(grid.removeObject("target")?.id).toBe("target");
    expect(grid.getRelationships()).toHaveLength(0);
    expect(grid.objectCount()).toBe(1);
  });
});

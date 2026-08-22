/**
 * Hex Grid — Axial coordinate system for the cognitive arena.
 * Uses cube coordinates (q, r, s) where q + r + s = 0.
 * Each hex cell is a spatial container for objects, fields, and relationships.
 */

export interface HexCoord {
  q: number;
  r: number;
}

export interface CubeCoord {
  q: number;
  r: number;
  s: number;
}

export function axialToCube(hex: HexCoord): CubeCoord {
  return { q: hex.q, r: hex.r, s: -hex.q - hex.r };
}

export function cubeToAxial(cube: CubeCoord): HexCoord {
  return { q: cube.q, r: cube.r };
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  const ac = axialToCube(a);
  const bc = axialToCube(b);
  return Math.max(
    Math.abs(ac.q - bc.q),
    Math.abs(ac.r - bc.r),
    Math.abs(ac.s - bc.s),
  );
}

export function hexNeighbors(hex: HexCoord): HexCoord[] {
  const directions: HexCoord[] = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ];
  return directions.map((d) => ({ q: hex.q + d.q, r: hex.r + d.r }));
}

export function hexRing(center: HexCoord, radius: number): HexCoord[] {
  if (radius === 0) return [center];
  const results: HexCoord[] = [];
  let hex: HexCoord = { q: center.q + radius, r: center.r };
  const directions: HexCoord[] = [
    { q: 0, r: 1 },
    { q: -1, r: 1 },
    { q: -1, r: 0 },
    { q: 0, r: -1 },
    { q: 1, r: -1 },
    { q: 1, r: 0 },
  ];
  for (const dir of directions) {
    for (let i = 0; i < radius; i++) {
      results.push(hex);
      hex = { q: hex.q + dir.q, r: hex.r + dir.r };
    }
  }
  return results;
}

export function hexSpiral(center: HexCoord, maxRadius: number): HexCoord[] {
  const results: HexCoord[] = [center];
  for (let r = 1; r <= maxRadius; r++) {
    results.push(...hexRing(center, r));
  }
  return results;
}

export function hexAngle(from: HexCoord, to: HexCoord): number {
  const dx = to.q - from.q + (to.r - from.r) * 0.5;
  const dy = ((to.r - from.r) * Math.sqrt(3)) / 2;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

export function hexKey(hex: HexCoord): string {
  return `${hex.q},${hex.r}`;
}

// --- Simplex Descriptors (Volume/Surface/Edge/Vertex) ---

export type SimplexLevel = 0 | 1 | 2 | 3; // vertex, edge, surface, volume

export interface SimplexDescriptor {
  level: SimplexLevel;
  volume: number; // 3D extent (0-1)
  surface: number; // 2D extent (0-1)
  edge: number; // 1D extent (0-1)
  vertex: number; // 0D point presence (0-1)
}

// --- Arena Object ---

export interface ArenaObjectAesthetic {
  centrality: number; // 0-1: how central in the space
  radiance: number; // 0-1: how much it draws attention
  patina: number; // 0-1: age/wear (0=new, 1=ancient)
  scaleRelative: number; // relative to room (0-1)
  semanticWeight: "anchor" | "satellite" | "connector" | "void" | "atmosphere";
}

export interface MaterialProperties {
  cost: number; // 0-1 normalized
  durability: number; // 0-1
  replaceability: number; // 0-1
  flexibility: number; // 0-1 (rigid=0, fluid=1)
  porosity: number; // 0-1 (solid=0, porous=1)
  reactivity: number; // 0-1 (inert=0, reactive=1)
  temperature: number; // normalized (-1=cold, 0=ambient, 1=hot)
  phase: "solid" | "fluid" | "membrane" | "field" | "composite";
}

export interface ArenaObject {
  id: string;
  name: string;
  position: HexCoord;
  simplex: SimplexDescriptor;
  aesthetic: ArenaObjectAesthetic;
  material: MaterialProperties;
  color: [number, number, number]; // HSL
  orientation: number; // degrees
  symmetry: number; // 0=asymmetric, 1=perfectly symmetric
  nested_in?: string; // parent object id
  contains?: string[]; // child object ids
  force_vectors: Vector2[]; // active forces on this object
  metadata: Record<string, unknown>;
}

export interface Vector2 {
  x: number;
  y: number;
}

// --- Spatial Relationship ---

export interface SpatialRelationship {
  source: string; // object id
  target: string; // object id
  distance: number; // hex distance
  angle: number; // degrees
  scaleRatio: number; // source.scale / target.scale
  colorHarmony: number; // 0=clash, 1=perfect harmony
  type: RelationshipType;
  meaning: string; // semantic meaning of this relationship
}

export type RelationshipType =
  | "attended_by"
  | "faces"
  | "contains"
  | "orbits"
  | "opposes"
  | "supports"
  | "mirrors"
  | "feeds"
  | "blocks"
  | "attracts"
  | "repels";

// --- Hex Cell ---

export interface HexCell {
  coord: HexCoord;
  objects: ArenaObject[];
  aestheticValue: number; // computed field value at this cell
  forceField: Vector2; // net force at this cell
  temperature: number; // environmental parameter
  pressure: number; // environmental parameter
  reactivity: number; // environmental parameter
  zLevel: number; // height dimension
}

// --- The Hex Grid ---

export class HexGrid {
  private cells: Map<string, HexCell> = new Map();
  private objects: Map<string, ArenaObject> = new Map();
  private relationships: SpatialRelationship[] = [];

  constructor(public readonly radius: number) {
    // Initialize grid with empty cells
    for (const coord of hexSpiral({ q: 0, r: 0 }, radius)) {
      this.cells.set(hexKey(coord), {
        coord,
        objects: [],
        aestheticValue: 0,
        forceField: { x: 0, y: 0 },
        temperature: 0,
        pressure: 0.5,
        reactivity: 0,
        zLevel: 0,
      });
    }
  }

  getCell(coord: HexCoord): HexCell | undefined {
    return this.cells.get(hexKey(coord));
  }

  getAllCells(): HexCell[] {
    return Array.from(this.cells.values());
  }

  placeObject(obj: ArenaObject): void {
    this.objects.set(obj.id, obj);
    const cell = this.cells.get(hexKey(obj.position));
    if (cell) {
      cell.objects.push(obj);
    }
  }

  removeObject(id: string): ArenaObject | undefined {
    const obj = this.objects.get(id);
    if (!obj) return undefined;
    this.objects.delete(id);
    const cell = this.cells.get(hexKey(obj.position));
    if (cell) {
      cell.objects = cell.objects.filter((o) => o.id !== id);
    }
    // Remove relationships involving this object
    this.relationships = this.relationships.filter(
      (r) => r.source !== id && r.target !== id,
    );
    return obj;
  }

  getObject(id: string): ArenaObject | undefined {
    return this.objects.get(id);
  }

  getAllObjects(): ArenaObject[] {
    return Array.from(this.objects.values());
  }

  moveObject(id: string, to: HexCoord): void {
    const obj = this.objects.get(id);
    if (!obj) return;
    const oldCell = this.cells.get(hexKey(obj.position));
    if (oldCell) {
      oldCell.objects = oldCell.objects.filter((o) => o.id !== id);
    }
    obj.position = to;
    const newCell = this.cells.get(hexKey(to));
    if (newCell) {
      newCell.objects.push(obj);
    }
  }

  addRelationship(rel: SpatialRelationship): void {
    this.relationships.push(rel);
  }

  getRelationships(objectId?: string): SpatialRelationship[] {
    if (!objectId) return this.relationships;
    return this.relationships.filter(
      (r) => r.source === objectId || r.target === objectId,
    );
  }

  objectsInRange(center: HexCoord, range: number): ArenaObject[] {
    return this.getAllObjects().filter(
      (obj) => hexDistance(center, obj.position) <= range,
    );
  }

  cellCount(): number {
    return this.cells.size;
  }

  objectCount(): number {
    return this.objects.size;
  }
}

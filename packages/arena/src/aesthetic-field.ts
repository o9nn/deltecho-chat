/**
 * AestheticField — Continuous scalar field over the hex grid encoding spatial "aliveness."
 *
 * A(x, y) = Σᵢ Σⱼ coherence(objectᵢ, objectⱼ) × proximity(i, j, x, y)
 *
 * Coherence measures how much objects strengthen each other by their relative:
 * - Position (distance, angle, alignment)
 * - Scale (size ratio — golden ratio = maximum coherence)
 * - Color (complementary = high contrast, analogous = harmony)
 * - Material (rough/smooth, old/new, natural/crafted)
 * - Orientation (facing each other, facing center, facing outward)
 */

import {
  type HexCoord,
  type HexGrid,
  type ArenaObject,
  type SpatialRelationship,
  type Vector2,
  hexDistance,
  hexAngle,
  hexKey,
} from "./hex-grid.js";

const PHI = (1 + Math.sqrt(5)) / 2; // Golden ratio ≈ 1.618

export interface AestheticFieldConfig {
  /** How quickly coherence falls off with distance from the object pair */
  proximityDecay: number;
  /** Weight for positional coherence */
  positionWeight: number;
  /** Weight for scale ratio coherence */
  scaleWeight: number;
  /** Weight for color harmony */
  colorWeight: number;
  /** Weight for material compatibility */
  materialWeight: number;
  /** Weight for orientation alignment */
  orientationWeight: number;
}

const DEFAULT_CONFIG: AestheticFieldConfig = {
  proximityDecay: 0.5,
  positionWeight: 0.25,
  scaleWeight: 0.20,
  colorWeight: 0.20,
  materialWeight: 0.15,
  orientationWeight: 0.20,
};

export interface FieldSample {
  coord: HexCoord;
  value: number;       // 0-1 aliveness
  gradient: Vector2;   // direction of increasing aliveness
}

export interface SpaceGestalt {
  overallCoherence: number;
  mood: "warm" | "cool" | "active" | "still" | "sacred" | "mundane";
  focalPoint: HexCoord | null;
  focalStrength: number;
  scale: "intimate" | "moderate" | "vast";
  density: "sparse" | "balanced" | "dense";
}

export class AestheticField {
  private config: AestheticFieldConfig;
  private fieldCache: Map<string, number> = new Map();
  private dirty = true;

  constructor(
    private grid: HexGrid,
    config?: Partial<AestheticFieldConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Invalidate the field cache (call after any object mutation) */
  invalidate(): void {
    this.dirty = true;
    this.fieldCache.clear();
  }

  /** Compute the aesthetic field value at a specific hex coordinate */
  coherenceAt(coord: HexCoord): number {
    const key = hexKey(coord);
    if (!this.dirty && this.fieldCache.has(key)) {
      return this.fieldCache.get(key)!;
    }

    const objects = this.grid.getAllObjects();
    if (objects.length < 2) {
      this.fieldCache.set(key, 0);
      return 0;
    }

    let totalCoherence = 0;
    let pairCount = 0;

    for (let i = 0; i < objects.length; i++) {
      for (let j = i + 1; j < objects.length; j++) {
        const pairCoherence = this.computePairCoherence(objects[i], objects[j]);
        const proximity = this.computeProximity(objects[i], objects[j], coord);
        totalCoherence += pairCoherence * proximity;
        pairCount++;
      }
    }

    const value = pairCount > 0 ? Math.min(1, totalCoherence / Math.sqrt(pairCount)) : 0;
    this.fieldCache.set(key, value);
    return value;
  }

  /** Compute the gradient (direction of increasing aliveness) at a coordinate */
  gradientAt(coord: HexCoord): Vector2 {
    const center = this.coherenceAt(coord);
    const neighbors = [
      { q: coord.q + 1, r: coord.r },
      { q: coord.q - 1, r: coord.r },
      { q: coord.q, r: coord.r + 1 },
      { q: coord.q, r: coord.r - 1 },
      { q: coord.q + 1, r: coord.r - 1 },
      { q: coord.q - 1, r: coord.r + 1 },
    ];

    let gx = 0;
    let gy = 0;
    for (const n of neighbors) {
      const val = this.coherenceAt(n);
      const dx = n.q - coord.q + (n.r - coord.r) * 0.5;
      const dy = (n.r - coord.r) * Math.sqrt(3) / 2;
      gx += (val - center) * dx;
      gy += (val - center) * dy;
    }

    const mag = Math.sqrt(gx * gx + gy * gy);
    if (mag < 1e-8) return { x: 0, y: 0 };
    return { x: gx / mag, y: gy / mag };
  }

  /** Find all local maxima of the aesthetic field (strong centers) */
  focalPoints(): { coord: HexCoord; strength: number }[] {
    const cells = this.grid.getAllCells();
    const maxima: { coord: HexCoord; strength: number }[] = [];

    for (const cell of cells) {
      const value = this.coherenceAt(cell.coord);
      if (value < 0.1) continue; // Skip very low values

      const neighbors = [
        { q: cell.coord.q + 1, r: cell.coord.r },
        { q: cell.coord.q - 1, r: cell.coord.r },
        { q: cell.coord.q, r: cell.coord.r + 1 },
        { q: cell.coord.q, r: cell.coord.r - 1 },
        { q: cell.coord.q + 1, r: cell.coord.r - 1 },
        { q: cell.coord.q - 1, r: cell.coord.r + 1 },
      ];

      let isMaximum = true;
      for (const n of neighbors) {
        if (this.coherenceAt(n) > value) {
          isMaximum = false;
          break;
        }
      }

      if (isMaximum) {
        maxima.push({ coord: cell.coord, strength: value });
      }
    }

    return maxima.sort((a, b) => b.strength - a.strength);
  }

  /** Compute the overall gestalt of the space */
  perceiveGestalt(): SpaceGestalt {
    const cells = this.grid.getAllCells();
    const objects = this.grid.getAllObjects();

    // Overall coherence
    let totalCoherence = 0;
    let count = 0;
    for (const cell of cells) {
      if (cell.objects.length > 0) {
        totalCoherence += this.coherenceAt(cell.coord);
        count++;
      }
    }
    const overallCoherence = count > 0 ? totalCoherence / count : 0;

    // Focal point
    const foci = this.focalPoints();
    const focalPoint = foci.length > 0 ? foci[0].coord : null;
    const focalStrength = foci.length > 0 ? foci[0].strength : 0;

    // Mood (from average color temperature and material properties)
    const avgTemp = objects.reduce((s, o) => s + o.material.temperature, 0) / Math.max(objects.length, 1);
    const avgReactivity = objects.reduce((s, o) => s + o.material.reactivity, 0) / Math.max(objects.length, 1);
    let mood: SpaceGestalt["mood"];
    if (avgTemp > 0.3) mood = "warm";
    else if (avgTemp < -0.3) mood = "cool";
    else if (avgReactivity > 0.5) mood = "active";
    else if (overallCoherence > 0.7) mood = "sacred";
    else if (overallCoherence < 0.3) mood = "mundane";
    else mood = "still";

    // Scale and density
    const occupiedCells = cells.filter(c => c.objects.length > 0).length;
    const totalCells = cells.length;
    const occupancyRatio = occupiedCells / Math.max(totalCells, 1);

    const density: SpaceGestalt["density"] =
      occupancyRatio > 0.5 ? "dense" : occupancyRatio > 0.2 ? "balanced" : "sparse";

    const scale: SpaceGestalt["scale"] =
      this.grid.radius <= 3 ? "intimate" : this.grid.radius <= 7 ? "moderate" : "vast";

    return { overallCoherence, mood, focalPoint, focalStrength, scale, density };
  }

  /** Sample the entire field for visualization */
  sampleField(): FieldSample[] {
    return this.grid.getAllCells().map(cell => ({
      coord: cell.coord,
      value: this.coherenceAt(cell.coord),
      gradient: this.gradientAt(cell.coord),
    }));
  }

  // --- Private coherence computation ---

  private computePairCoherence(a: ArenaObject, b: ArenaObject): number {
    const pos = this.positionalCoherence(a, b);
    const scale = this.scaleCoherence(a, b);
    const color = this.colorCoherence(a, b);
    const material = this.materialCoherence(a, b);
    const orientation = this.orientationCoherence(a, b);

    return (
      pos * this.config.positionWeight +
      scale * this.config.scaleWeight +
      color * this.config.colorWeight +
      material * this.config.materialWeight +
      orientation * this.config.orientationWeight
    );
  }

  /** Golden ratio distance = maximum positional coherence */
  private positionalCoherence(a: ArenaObject, b: ArenaObject): number {
    const dist = hexDistance(a.position, b.position);
    if (dist === 0) return 0.5; // Same cell — moderate coherence
    // Peak at golden ratio distance, decay on either side
    const ratio = dist / PHI;
    return Math.exp(-0.5 * Math.pow(Math.log(ratio), 2));
  }

  /** Golden ratio scale = maximum scale coherence */
  private scaleCoherence(a: ArenaObject, b: ArenaObject): number {
    const scaleA = a.simplex.volume + a.simplex.surface * 0.5;
    const scaleB = b.simplex.volume + b.simplex.surface * 0.5;
    if (scaleA < 0.01 || scaleB < 0.01) return 0.5;
    const ratio = Math.max(scaleA, scaleB) / Math.min(scaleA, scaleB);
    // Peak at 1:1 (same scale = 0.7) and at φ (golden ratio = 1.0)
    const sameScale = Math.exp(-2 * Math.pow(ratio - 1, 2)) * 0.7;
    const goldenScale = Math.exp(-2 * Math.pow(ratio - PHI, 2));
    return Math.max(sameScale, goldenScale);
  }

  /** Color harmony using HSL hue difference */
  private colorCoherence(a: ArenaObject, b: ArenaObject): number {
    const hueDiff = Math.abs(a.color[0] - b.color[0]);
    const normalizedDiff = Math.min(hueDiff, 360 - hueDiff) / 180; // 0-1

    // Complementary (180°) = 0.9, Analogous (30°) = 0.8, Triadic (120°) = 0.7
    if (normalizedDiff > 0.9) return 0.9;  // complementary
    if (normalizedDiff < 0.17) return 0.8; // analogous
    if (Math.abs(normalizedDiff - 0.67) < 0.1) return 0.7; // triadic
    // Everything else decays
    return 0.3 + 0.4 * Math.cos(normalizedDiff * Math.PI);
  }

  /** Material compatibility — similar materials or complementary textures */
  private materialCoherence(a: ArenaObject, b: ArenaObject): number {
    // Same phase = moderate, complementary properties = high
    const phaseSame = a.material.phase === b.material.phase ? 0.6 : 0.3;
    const textureContrast = Math.abs(a.material.flexibility - b.material.flexibility);
    const ageContrast = Math.abs(a.aesthetic.patina - b.aesthetic.patina);
    // Complementary textures (one rough, one smooth) add coherence
    return phaseSame + textureContrast * 0.2 + ageContrast * 0.1;
  }

  /** Orientation alignment — facing each other = high coherence */
  private orientationCoherence(a: ArenaObject, b: ArenaObject): number {
    const angleAtoB = hexAngle(a.position, b.position);
    const angleBtoA = hexAngle(b.position, a.position);

    // How much does A face B?
    const aFacingB = 1 - Math.abs(angleDiff(a.orientation, angleAtoB)) / 180;
    // How much does B face A?
    const bFacingA = 1 - Math.abs(angleDiff(b.orientation, angleBtoA)) / 180;

    return (aFacingB + bFacingA) / 2;
  }

  /** How much does this point "feel" the coherence between two objects? */
  private computeProximity(a: ArenaObject, b: ArenaObject, point: HexCoord): number {
    const distA = hexDistance(a.position, point);
    const distB = hexDistance(b.position, point);
    const midDist = (distA + distB) / 2;
    return Math.exp(-this.config.proximityDecay * midDist);
  }
}

// --- Utility ---

function angleDiff(a: number, b: number): number {
  let diff = ((b - a) % 360 + 360) % 360;
  if (diff > 180) diff -= 360;
  return diff;
}

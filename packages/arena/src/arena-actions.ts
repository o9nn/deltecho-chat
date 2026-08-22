/**
 * ArenaActions — The 40 TRIZ Inventive Principles as actions an agent can perform
 * in the cognitive hex arena. Each action transforms objects/space and returns
 * the coherence delta (reward signal for discovery).
 */

import {
  type HexGrid,
  type ArenaObject,
  type HexCoord,
  type MaterialProperties,
  type Vector2,
  hexDistance,
  hexNeighbors,
} from "./hex-grid.js";
import { AestheticField } from "./aesthetic-field.js";

export interface ActionResult {
  success: boolean;
  principle: number; // TRIZ principle number (1-40)
  category: ActionCategory;
  description: string;
  coherenceBefore: number;
  coherenceAfter: number;
  delta: number; // reward signal
  objectsAffected: string[];
}

export type ActionCategory =
  | "spatial_structure" // P1-P7
  | "force_and_field" // P8-P13
  | "geometry_and_motion" // P14-P17
  | "temporal_dynamics" // P18-P21
  | "material_and_substance" // P22-P27
  | "system_transformation" // P28-P34
  | "environmental_interaction"; // P35-P40

let idCounter = 0;
function nextId(): string {
  return `obj_${++idCounter}_${Date.now().toString(36)}`;
}

export class ArenaActions {
  constructor(
    private grid: HexGrid,
    private field: AestheticField,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // Category I: SPATIAL STRUCTURE (Principles 1-7)
  // ═══════════════════════════════════════════════════════════════

  /** P1: Segmentation — divide object into independent sub-parts */
  segment(objId: string, nParts: number): ActionResult {
    return this.withCoherenceDelta(1, "spatial_structure", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj || nParts < 2) return false;

      const neighbors = hexNeighbors(obj.position);
      const parts = Math.min(nParts, neighbors.length + 1);

      // Reduce original size
      obj.simplex.volume /= parts;
      obj.simplex.surface /= Math.sqrt(parts);
      obj.name = `${obj.name}_segment_0`;

      // Create sub-parts in neighboring cells
      for (let i = 1; i < parts; i++) {
        const pos = neighbors[i - 1] || obj.position;
        const part: ArenaObject = {
          ...structuredClone(obj),
          id: nextId(),
          name: `${obj.name.replace("_segment_0", "")}_segment_${i}`,
          position: pos,
        };
        this.grid.placeObject(part);
      }
      return true;
    });
  }

  /** P2: Taking Out — extract a harmful/unwanted property from an object */
  extract(objId: string, property: keyof MaterialProperties): ActionResult {
    return this.withCoherenceDelta(2, "spatial_structure", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj) return false;

      // Create extracted property as a new object
      const extracted: ArenaObject = {
        id: nextId(),
        name: `${obj.name}_extracted_${property}`,
        position: hexNeighbors(obj.position)[0] || obj.position,
        simplex: {
          level: 1,
          volume: 0.1,
          surface: 0.2,
          edge: 0.5,
          vertex: 0.1,
        },
        aesthetic: {
          centrality: 0.2,
          radiance: 0.3,
          patina: obj.aesthetic.patina,
          scaleRelative: 0.05,
          semanticWeight: "satellite",
        },
        material: { ...obj.material },
        color: obj.color,
        orientation: 0,
        symmetry: 0.5,
        force_vectors: [],
        metadata: { extractedFrom: objId, property },
      };

      // Neutralize the property in the original
      (obj.material as unknown as Record<string, unknown>)[property] = 0;
      this.grid.placeObject(extracted);
      return true;
    });
  }

  /** P3: Local Quality — make different parts serve different functions */
  differentiate(objId: string): ActionResult {
    return this.withCoherenceDelta(3, "spatial_structure", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj) return false;

      // Break symmetry by creating a gradient
      obj.symmetry = Math.max(0, obj.symmetry - 0.4);
      obj.simplex.surface = Math.min(1, obj.simplex.surface + 0.2);
      obj.aesthetic.semanticWeight = "anchor";
      return true;
    });
  }

  /** P4: Asymmetry — break symmetry to create new function */
  breakSymmetry(objId: string): ActionResult {
    return this.withCoherenceDelta(4, "spatial_structure", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj) return false;

      obj.symmetry = 0;
      obj.orientation += 15 + Math.random() * 30; // Tilt
      obj.aesthetic.radiance = Math.min(1, obj.aesthetic.radiance + 0.1);
      return true;
    });
  }

  /** P5: Merging — combine similar objects for parallel operation */
  merge(objIdA: string, objIdB: string): ActionResult {
    return this.withCoherenceDelta(
      5,
      "spatial_structure",
      [objIdA, objIdB],
      () => {
        const a = this.grid.getObject(objIdA);
        const b = this.grid.getObject(objIdB);
        if (!a || !b) return false;

        // Merge B into A
        a.simplex.volume = Math.min(1, a.simplex.volume + b.simplex.volume);
        a.simplex.surface = Math.min(
          1,
          a.simplex.surface + b.simplex.surface * 0.5,
        );
        a.aesthetic.radiance = Math.min(
          1,
          (a.aesthetic.radiance + b.aesthetic.radiance) / 1.5,
        );
        a.name = `${a.name}+${b.name}`;

        this.grid.removeObject(objIdB);
        return true;
      },
    );
  }

  /** P6: Universality — make one object perform multiple functions */
  multiPurpose(objId: string): ActionResult {
    return this.withCoherenceDelta(6, "spatial_structure", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj) return false;

      obj.simplex.level = Math.min(3, obj.simplex.level + 1) as 0 | 1 | 2 | 3;
      obj.aesthetic.semanticWeight = "anchor";
      obj.aesthetic.centrality = Math.min(1, obj.aesthetic.centrality + 0.2);
      obj.metadata.functions = ((obj.metadata.functions as number) || 1) + 1;
      return true;
    });
  }

  /** P7: Nesting — place objects inside each other */
  nest(outerId: string, innerId: string): ActionResult {
    return this.withCoherenceDelta(
      7,
      "spatial_structure",
      [outerId, innerId],
      () => {
        const outer = this.grid.getObject(outerId);
        const inner = this.grid.getObject(innerId);
        if (!outer || !inner) return false;
        if (outer.simplex.volume <= inner.simplex.volume) return false;

        inner.nested_in = outerId;
        outer.contains = outer.contains || [];
        outer.contains.push(innerId);
        inner.position = outer.position; // Move inside
        return true;
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Category II: FORCE AND FIELD (Principles 8-13)
  // ═══════════════════════════════════════════════════════════════

  /** P8: Anti-weight — add opposing force to counterbalance */
  counterbalance(objId: string, force: Vector2): ActionResult {
    return this.withCoherenceDelta(8, "force_and_field", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj) return false;

      obj.force_vectors.push({ x: -force.x, y: -force.y });
      return true;
    });
  }

  /** P9: Preliminary Anti-action — pre-stress before harmful load */
  preStress(objId: string): ActionResult {
    return this.withCoherenceDelta(9, "force_and_field", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj) return false;

      obj.material.durability = Math.min(1, obj.material.durability + 0.3);
      obj.metadata.preStressed = true;
      return true;
    });
  }

  /** P10: Preliminary Action — pre-position before need */
  prePosition(objId: string, target: HexCoord): ActionResult {
    return this.withCoherenceDelta(10, "force_and_field", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj) return false;

      this.grid.moveObject(objId, target);
      obj.metadata.prePositioned = true;
      return true;
    });
  }

  /** P11: Beforehand Cushioning — add backup/redundancy */
  addBackup(objId: string): ActionResult {
    return this.withCoherenceDelta(11, "force_and_field", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj) return false;

      const backup: ArenaObject = {
        ...structuredClone(obj),
        id: nextId(),
        name: `${obj.name}_backup`,
        position: hexNeighbors(obj.position)[3] || obj.position,
        aesthetic: {
          ...obj.aesthetic,
          radiance: obj.aesthetic.radiance * 0.5,
          semanticWeight: "satellite",
        },
      };
      this.grid.placeObject(backup);
      return true;
    });
  }

  /** P12: Equipotentiality — flatten the force field in a region */
  flattenField(center: HexCoord, radius: number): ActionResult {
    const affected = this.grid.objectsInRange(center, radius).map((o) => o.id);
    return this.withCoherenceDelta(12, "force_and_field", affected, () => {
      const objects = this.grid.objectsInRange(center, radius);
      if (objects.length === 0) return false;

      for (const obj of objects) {
        obj.force_vectors = []; // Remove all forces
      }
      return true;
    });
  }

  /** P13: Inversion — do the opposite of the obvious */
  invert(objId: string): ActionResult {
    return this.withCoherenceDelta(13, "force_and_field", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj) return false;

      obj.orientation = (obj.orientation + 180) % 360;
      obj.force_vectors = obj.force_vectors.map((f) => ({ x: -f.x, y: -f.y }));
      obj.material.temperature = -obj.material.temperature;
      return true;
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Category III: GEOMETRY AND MOTION (Principles 14-17)
  // ═══════════════════════════════════════════════════════════════

  /** P14: Spheroidality — curve straight edges */
  curve(objId: string): ActionResult {
    return this.withCoherenceDelta(14, "geometry_and_motion", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj) return false;

      obj.simplex.edge = Math.max(0, obj.simplex.edge - 0.3);
      obj.simplex.surface = Math.min(1, obj.simplex.surface + 0.2);
      obj.symmetry = Math.min(1, obj.symmetry + 0.2);
      return true;
    });
  }

  /** P15: Dynamics — make rigid objects flexible */
  makeFlexible(objId: string): ActionResult {
    return this.withCoherenceDelta(15, "geometry_and_motion", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj) return false;

      obj.material.flexibility = Math.min(1, obj.material.flexibility + 0.4);
      return true;
    });
  }

  /** P16: Partial/Excessive — deliberately overshoot then correct */
  overshoot(objId: string, amount: number): ActionResult {
    return this.withCoherenceDelta(16, "geometry_and_motion", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj) return false;

      obj.simplex.volume = Math.min(1, obj.simplex.volume * (1 + amount));
      obj.metadata.overshoot = amount;
      return true;
    });
  }

  /** P17: Another Dimension — move into a higher dimension */
  addDimension(objId: string): ActionResult {
    return this.withCoherenceDelta(17, "geometry_and_motion", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj) return false;

      const cell = this.grid.getCell(obj.position);
      if (cell) cell.zLevel += 1;
      obj.simplex.level = Math.min(3, obj.simplex.level + 1) as 0 | 1 | 2 | 3;
      return true;
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Category IV: TEMPORAL DYNAMICS (Principles 18-21)
  // ═══════════════════════════════════════════════════════════════

  /** P18: Vibration — oscillate an object at a frequency */
  vibrate(objId: string, freq: number): ActionResult {
    return this.withCoherenceDelta(18, "temporal_dynamics", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj) return false;

      obj.metadata.vibrating = true;
      obj.metadata.frequency = freq;
      obj.material.flexibility = Math.min(1, obj.material.flexibility + 0.1);
      return true;
    });
  }

  /** P19: Periodic Action — pulse instead of sustain */
  pulse(objId: string, period: number): ActionResult {
    return this.withCoherenceDelta(19, "temporal_dynamics", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj) return false;

      obj.metadata.pulsing = true;
      obj.metadata.period = period;
      obj.aesthetic.radiance = Math.min(1, obj.aesthetic.radiance + 0.15);
      return true;
    });
  }

  /** P20: Continuity of Useful Action — eliminate idle time */
  sustain(objId: string): ActionResult {
    return this.withCoherenceDelta(20, "temporal_dynamics", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj) return false;

      obj.metadata.sustained = true;
      obj.metadata.pulsing = false;
      obj.aesthetic.centrality = Math.min(1, obj.aesthetic.centrality + 0.1);
      return true;
    });
  }

  /** P21: Skipping — fast traversal through harmful zone */
  skipThrough(objId: string, target: HexCoord): ActionResult {
    return this.withCoherenceDelta(21, "temporal_dynamics", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj) return false;

      // Teleport directly (skip intermediate cells)
      this.grid.moveObject(objId, target);
      obj.metadata.skipped = true;
      return true;
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Category V: MATERIAL AND SUBSTANCE (Principles 22-27)
  // ═══════════════════════════════════════════════════════════════

  /** P22: Blessing in Disguise — use harmful property for benefit */
  reframeHarm(objId: string): ActionResult {
    return this.withCoherenceDelta(
      22,
      "material_and_substance",
      [objId],
      () => {
        const obj = this.grid.getObject(objId);
        if (!obj) return false;

        // Convert high reactivity into useful energy
        if (obj.material.reactivity > 0.5) {
          obj.aesthetic.radiance = Math.min(
            1,
            obj.aesthetic.radiance + obj.material.reactivity * 0.5,
          );
          obj.material.reactivity *= 0.3; // Consumed
          return true;
        }
        return false;
      },
    );
  }

  /** P23: Feedback — connect output back to input */
  addFeedback(outputId: string, inputId: string): ActionResult {
    return this.withCoherenceDelta(
      23,
      "material_and_substance",
      [outputId, inputId],
      () => {
        const output = this.grid.getObject(outputId);
        const input = this.grid.getObject(inputId);
        if (!output || !input) return false;

        this.grid.addRelationship({
          source: outputId,
          target: inputId,
          distance: hexDistance(output.position, input.position),
          angle: 0,
          scaleRatio: 1,
          colorHarmony: 0.8,
          type: "feeds",
          meaning: "feedback_loop",
        });
        return true;
      },
    );
  }

  /** P24: Intermediary — place a mediator between conflicting objects */
  mediate(aId: string, bId: string): ActionResult {
    return this.withCoherenceDelta(
      24,
      "material_and_substance",
      [aId, bId],
      () => {
        const a = this.grid.getObject(aId);
        const b = this.grid.getObject(bId);
        if (!a || !b) return false;

        // Create mediator at midpoint
        const midQ = Math.round((a.position.q + b.position.q) / 2);
        const midR = Math.round((a.position.r + b.position.r) / 2);
        const mediator: ArenaObject = {
          id: nextId(),
          name: `mediator_${a.name}_${b.name}`,
          position: { q: midQ, r: midR },
          simplex: {
            level: 1,
            volume: 0.2,
            surface: 0.4,
            edge: 0.3,
            vertex: 0.1,
          },
          aesthetic: {
            centrality: 0.5,
            radiance: 0.4,
            patina: 0,
            scaleRelative: 0.1,
            semanticWeight: "connector",
          },
          material: {
            cost: 0.2,
            durability: 0.8,
            replaceability: 0.9,
            flexibility: 0.7,
            porosity: 0.5,
            reactivity: 0,
            temperature: 0,
            phase: "membrane",
          },
          color: [(a.color[0] + b.color[0]) / 2, 0.5, 0.6],
          orientation: 0,
          symmetry: 1,
          force_vectors: [],
          metadata: { mediates: [aId, bId] },
        };
        this.grid.placeObject(mediator);
        return true;
      },
    );
  }

  /** P25: Self-Service — make object serve itself */
  selfServe(objId: string): ActionResult {
    return this.withCoherenceDelta(
      25,
      "material_and_substance",
      [objId],
      () => {
        const obj = this.grid.getObject(objId);
        if (!obj) return false;

        // Self-feedback loop
        this.grid.addRelationship({
          source: objId,
          target: objId,
          distance: 0,
          angle: 0,
          scaleRatio: 1,
          colorHarmony: 1,
          type: "feeds",
          meaning: "self_service",
        });
        obj.metadata.selfServing = true;
        return true;
      },
    );
  }

  /** P26: Copying — create a cheap replica */
  copy(objId: string): ActionResult {
    return this.withCoherenceDelta(
      26,
      "material_and_substance",
      [objId],
      () => {
        const obj = this.grid.getObject(objId);
        if (!obj) return false;

        const replica: ArenaObject = {
          ...structuredClone(obj),
          id: nextId(),
          name: `${obj.name}_copy`,
          position: hexNeighbors(obj.position)[0] || obj.position,
          material: {
            ...obj.material,
            cost: obj.material.cost * 0.3,
            durability: obj.material.durability * 0.5,
          },
          aesthetic: {
            ...obj.aesthetic,
            patina: 0,
            radiance: obj.aesthetic.radiance * 0.6,
          },
        };
        this.grid.placeObject(replica);
        return true;
      },
    );
  }

  /** P27: Cheap Short-Living — replace durable with disposable */
  makeDisposable(objId: string): ActionResult {
    return this.withCoherenceDelta(
      27,
      "material_and_substance",
      [objId],
      () => {
        const obj = this.grid.getObject(objId);
        if (!obj) return false;

        obj.material.cost *= 0.2;
        obj.material.durability *= 0.3;
        obj.material.replaceability = 1;
        obj.metadata.disposable = true;
        return true;
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Category VI: SYSTEM TRANSFORMATION (Principles 28-34)
  // ═══════════════════════════════════════════════════════════════

  /** P28: Replace Mechanical — replace physical contact with field */
  replaceWithField(objId: string): ActionResult {
    return this.withCoherenceDelta(28, "system_transformation", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj) return false;

      obj.material.phase = "field";
      obj.simplex.volume = 0;
      obj.simplex.surface = 0;
      obj.simplex.edge = 0;
      obj.aesthetic.radiance = Math.min(1, obj.aesthetic.radiance + 0.3);
      return true;
    });
  }

  /** P29: Pneumatics/Hydraulics — replace solid with fluid */
  fluidize(objId: string): ActionResult {
    return this.withCoherenceDelta(29, "system_transformation", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj) return false;

      obj.material.phase = "fluid";
      obj.material.flexibility = 1;
      obj.simplex.edge = 0;
      obj.symmetry = 1; // Fluids are symmetric
      return true;
    });
  }

  /** P30: Flexible Shells — replace solid wall with thin membrane */
  makeMembrane(objId: string): ActionResult {
    return this.withCoherenceDelta(30, "system_transformation", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj) return false;

      obj.material.phase = "membrane";
      obj.simplex.volume *= 0.1;
      obj.simplex.surface = Math.min(1, obj.simplex.surface + 0.4);
      obj.material.flexibility = Math.min(1, obj.material.flexibility + 0.5);
      return true;
    });
  }

  /** P31: Porous Materials — introduce voids into solid */
  makePorous(objId: string): ActionResult {
    return this.withCoherenceDelta(31, "system_transformation", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj) return false;

      obj.material.porosity = Math.min(1, obj.material.porosity + 0.5);
      obj.simplex.volume *= 0.7; // Less dense
      return true;
    });
  }

  /** P32: Color Changes — change appearance to carry information */
  changeColor(objId: string, hue: number): ActionResult {
    return this.withCoherenceDelta(32, "system_transformation", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj) return false;

      obj.color[0] = hue % 360;
      obj.aesthetic.radiance = Math.min(1, obj.aesthetic.radiance + 0.1);
      return true;
    });
  }

  /** P33: Homogeneity — make interacting objects from same material */
  homogenize(center: HexCoord, radius: number): ActionResult {
    const affected = this.grid.objectsInRange(center, radius).map((o) => o.id);
    return this.withCoherenceDelta(
      33,
      "system_transformation",
      affected,
      () => {
        const objects = this.grid.objectsInRange(center, radius);
        if (objects.length < 2) return false;

        const refMaterial = objects[0].material;
        for (let i = 1; i < objects.length; i++) {
          objects[i].material.phase = refMaterial.phase;
          objects[i].material.flexibility = refMaterial.flexibility;
        }
        return true;
      },
    );
  }

  /** P34: Discarding and Recovering — recycle waste into resource */
  recycle(objId: string): ActionResult {
    return this.withCoherenceDelta(34, "system_transformation", [objId], () => {
      const obj = this.grid.getObject(objId);
      if (!obj) return false;

      // Transform "waste" into useful resource
      obj.material.cost = 0.1;
      obj.material.durability = 0.5;
      obj.aesthetic.patina = 0; // Renewed
      obj.name = `recycled_${obj.name}`;
      obj.metadata.recycled = true;
      return true;
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Category VII: ENVIRONMENTAL INTERACTION (Principles 35-40)
  // ═══════════════════════════════════════════════════════════════

  /** P35: Parameter Changes — change physical state */
  changeParameter(
    objId: string,
    param: "temperature" | "pressure" | "reactivity",
    value: number,
  ): ActionResult {
    return this.withCoherenceDelta(
      35,
      "environmental_interaction",
      [objId],
      () => {
        const obj = this.grid.getObject(objId);
        if (!obj) return false;

        const cell = this.grid.getCell(obj.position);
        if (cell) {
          (cell as unknown as Record<string, unknown>)[param] = value;
        }
        if (param === "temperature") obj.material.temperature = value;
        if (param === "reactivity") obj.material.reactivity = value;
        return true;
      },
    );
  }

  /** P36: Phase Transitions — exploit the transition boundary itself */
  exploitTransition(objId: string): ActionResult {
    return this.withCoherenceDelta(
      36,
      "environmental_interaction",
      [objId],
      () => {
        const obj = this.grid.getObject(objId);
        if (!obj) return false;

        // Phase transition releases energy
        const phases: MaterialProperties["phase"][] = [
          "solid",
          "fluid",
          "membrane",
          "field",
        ];
        const currentIdx = phases.indexOf(obj.material.phase);
        obj.material.phase = phases[(currentIdx + 1) % phases.length];
        obj.aesthetic.radiance = Math.min(1, obj.aesthetic.radiance + 0.25);
        obj.metadata.transitioning = true;
        return true;
      },
    );
  }

  /** P37: Thermal Expansion — use differential expansion */
  expandDifferentially(objId: string): ActionResult {
    return this.withCoherenceDelta(
      37,
      "environmental_interaction",
      [objId],
      () => {
        const obj = this.grid.getObject(objId);
        if (!obj) return false;

        if (obj.material.temperature > 0) {
          obj.simplex.volume = Math.min(
            1,
            obj.simplex.volume * (1 + obj.material.temperature * 0.3),
          );
          obj.symmetry = Math.max(0, obj.symmetry - 0.2); // Differential = asymmetric
        }
        return true;
      },
    );
  }

  /** P38: Strong Oxidants — introduce a catalyst */
  catalyze(objId: string, catalystStrength: number): ActionResult {
    return this.withCoherenceDelta(
      38,
      "environmental_interaction",
      [objId],
      () => {
        const obj = this.grid.getObject(objId);
        if (!obj) return false;

        obj.material.reactivity = Math.min(
          1,
          obj.material.reactivity + catalystStrength,
        );
        obj.aesthetic.radiance = Math.min(
          1,
          obj.aesthetic.radiance + catalystStrength * 0.3,
        );
        obj.metadata.catalyzed = true;
        return true;
      },
    );
  }

  /** P39: Inert Atmosphere — protect by removing reactivity */
  protect(objId: string): ActionResult {
    return this.withCoherenceDelta(
      39,
      "environmental_interaction",
      [objId],
      () => {
        const obj = this.grid.getObject(objId);
        if (!obj) return false;

        obj.material.reactivity = 0;
        obj.material.durability = Math.min(1, obj.material.durability + 0.3);
        const cell = this.grid.getCell(obj.position);
        if (cell) cell.reactivity = 0;
        return true;
      },
    );
  }

  /** P40: Composite Materials — combine materials with different properties */
  compose(objIdA: string, objIdB: string): ActionResult {
    return this.withCoherenceDelta(
      40,
      "environmental_interaction",
      [objIdA, objIdB],
      () => {
        const a = this.grid.getObject(objIdA);
        const b = this.grid.getObject(objIdB);
        if (!a || !b) return false;

        // Composite takes best properties of both
        a.material.phase = "composite";
        a.material.durability = Math.max(
          a.material.durability,
          b.material.durability,
        );
        a.material.flexibility = Math.max(
          a.material.flexibility,
          b.material.flexibility,
        );
        a.material.cost = (a.material.cost + b.material.cost) * 0.7; // Synergy discount
        a.name = `composite_${a.name}_${b.name}`;

        this.grid.removeObject(objIdB);
        return true;
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Coherence Delta Wrapper — the universal reward signal
  // ═══════════════════════════════════════════════════════════════

  private withCoherenceDelta(
    principle: number,
    category: ActionCategory,
    objectIds: string[],
    action: () => boolean,
  ): ActionResult {
    // Measure coherence before
    const coherenceBefore = this.measureGlobalCoherence();

    // Execute the action
    const success = action();

    // Invalidate field cache and measure after
    this.field.invalidate();
    const coherenceAfter = success
      ? this.measureGlobalCoherence()
      : coherenceBefore;

    return {
      success,
      principle,
      category,
      description: `P${principle}`,
      coherenceBefore,
      coherenceAfter,
      delta: coherenceAfter - coherenceBefore,
      objectsAffected: objectIds,
    };
  }

  private measureGlobalCoherence(): number {
    const gestalt = this.field.perceiveGestalt();
    return gestalt.overallCoherence;
  }
}

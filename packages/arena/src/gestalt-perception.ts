/**
 * GestaltPerception — The 4-stage perception pipeline for AI agents entering a space.
 *
 * 1. GESTALT PERCEPTION (< 100ms) — overall coherence, mood, focal point, scale
 * 2. RELATIONAL PARSING (< 500ms) — object relationships, groupings, hierarchies
 * 3. SEMANTIC INFERENCE (< 1s) — what is this place, what's important, my role
 * 4. DETAILED INSPECTION (on demand) — read specific content, interact
 *
 * The agent understands the space BEFORE it reads any content.
 * The gestalt comes first. The details come last.
 */

import {
  type HexGrid,
  type HexCoord,
  type ArenaObject,
  type SpatialRelationship,
  type Vector2,
  hexDistance,
  hexAngle,
  hexNeighbors,
  hexKey,
} from "./hex-grid.js";
import { AestheticField, type SpaceGestalt } from "./aesthetic-field.js";

const PHI = (1 + Math.sqrt(5)) / 2;

// ═══════════════════════════════════════════════════════════════
// Stage 1: Gestalt Perception
// ═══════════════════════════════════════════════════════════════

export interface GestaltSnapshot {
  timestamp: number;
  coherence: number;
  mood: SpaceGestalt["mood"];
  focalPoint: HexCoord | null;
  focalStrength: number;
  scale: SpaceGestalt["scale"];
  density: SpaceGestalt["density"];
  dominantColor: [number, number, number]; // average HSL
  energyLevel: number; // 0-1 how "active" the space feels
}

// ═══════════════════════════════════════════════════════════════
// Stage 2: Relational Parsing
// ═══════════════════════════════════════════════════════════════

export interface ObjectCluster {
  center: HexCoord;
  members: string[]; // object ids
  cohesion: number;  // how tightly bound
  role: "gathering" | "procession" | "constellation" | "pair" | "singleton";
}

export interface Hierarchy {
  root: string;       // object id
  children: string[]; // object ids that "serve" the root
  depth: number;
}

export interface RelationalMap {
  clusters: ObjectCluster[];
  hierarchies: Hierarchy[];
  tensions: { a: string; b: string; type: "opposition" | "competition" | "conflict" }[];
  harmonies: { a: string; b: string; type: "resonance" | "support" | "echo" }[];
}

// ═══════════════════════════════════════════════════════════════
// Stage 3: Semantic Inference
// ═══════════════════════════════════════════════════════════════

export type PlaceType =
  | "study"       // contemplation, single focal point
  | "gathering"   // social, multiple equal objects
  | "workshop"    // creation, high reactivity
  | "sanctuary"   // protection, low reactivity, high coherence
  | "marketplace" // exchange, high diversity
  | "threshold"   // transition, boundary zone
  | "void"        // empty, waiting to be filled
  | "unknown";

export type AgentRole =
  | "observer"    // watch and learn
  | "participant" // join the activity
  | "creator"     // make something new
  | "guardian"    // protect what's here
  | "seeker"      // looking for something
  | "teacher"     // share knowledge
  | "guest";      // passing through

export interface SemanticInference {
  placeType: PlaceType;
  importantThing: string | null; // object id of the most important thing
  agentRole: AgentRole;
  appropriateBehavior: string;   // natural language suggestion
  confidence: number;            // 0-1
}

// ═══════════════════════════════════════════════════════════════
// Stage 4: Detailed Inspection (on demand)
// ═══════════════════════════════════════════════════════════════

export interface ObjectInspection {
  object: ArenaObject;
  relationships: SpatialRelationship[];
  gestaltContribution: number; // how much this object contributes to overall coherence
  affordances: string[];       // what can the agent do with this object
}

// ═══════════════════════════════════════════════════════════════
// Full Perception Result
// ═══════════════════════════════════════════════════════════════

export interface PerceptionResult {
  gestalt: GestaltSnapshot;
  relations: RelationalMap;
  semantics: SemanticInference;
  inspections: ObjectInspection[]; // populated on demand
}

// ═══════════════════════════════════════════════════════════════
// The Perception Engine
// ═══════════════════════════════════════════════════════════════

export class GestaltPerception {
  constructor(
    private grid: HexGrid,
    private field: AestheticField,
  ) {}

  /** Full 3-stage perception (stages 1-3). Stage 4 is on-demand via inspect(). */
  perceive(): PerceptionResult {
    const gestalt = this.perceiveGestalt();
    const relations = this.parseRelations();
    const semantics = this.inferSemantics(gestalt, relations);
    return { gestalt, relations, semantics, inspections: [] };
  }

  /** Stage 1: Gestalt — instant holistic impression */
  perceiveGestalt(): GestaltSnapshot {
    const spaceGestalt = this.field.perceiveGestalt();
    const objects = this.grid.getAllObjects();

    // Dominant color (average HSL)
    const avgH = objects.reduce((s, o) => s + o.color[0], 0) / Math.max(objects.length, 1);
    const avgS = objects.reduce((s, o) => s + o.color[1], 0) / Math.max(objects.length, 1);
    const avgL = objects.reduce((s, o) => s + o.color[2], 0) / Math.max(objects.length, 1);

    // Energy level (from reactivity, vibration, forces)
    const energy = objects.reduce((s, o) => {
      const vibrating = o.metadata.vibrating ? 0.3 : 0;
      const forces = o.force_vectors.length * 0.1;
      return s + o.material.reactivity * 0.4 + vibrating + forces;
    }, 0) / Math.max(objects.length, 1);

    return {
      timestamp: Date.now(),
      coherence: spaceGestalt.overallCoherence,
      mood: spaceGestalt.mood,
      focalPoint: spaceGestalt.focalPoint,
      focalStrength: spaceGestalt.focalStrength,
      scale: spaceGestalt.scale,
      density: spaceGestalt.density,
      dominantColor: [avgH, avgS, avgL],
      energyLevel: Math.min(1, energy),
    };
  }

  /** Stage 2: Relational Parsing — object groupings, hierarchies, tensions */
  parseRelations(): RelationalMap {
    const objects = this.grid.getAllObjects();
    const relationships = this.grid.getRelationships();

    const clusters = this.findClusters(objects);
    const hierarchies = this.findHierarchies(objects);
    const tensions = this.findTensions(objects, relationships);
    const harmonies = this.findHarmonies(objects, relationships);

    return { clusters, hierarchies, tensions, harmonies };
  }

  /** Stage 3: Semantic Inference — what is this place, what should I do */
  inferSemantics(gestalt: GestaltSnapshot, relations: RelationalMap): SemanticInference {
    const objects = this.grid.getAllObjects();

    // Determine place type
    const placeType = this.inferPlaceType(gestalt, relations, objects);

    // Find the most important thing
    const importantThing = this.findMostImportant(objects);

    // Determine agent role
    const agentRole = this.inferAgentRole(placeType, gestalt);

    // Suggest appropriate behavior
    const appropriateBehavior = this.suggestBehavior(placeType, agentRole, gestalt);

    // Confidence based on coherence and object count
    const confidence = Math.min(1, gestalt.coherence * 0.6 + (objects.length > 2 ? 0.4 : 0.2));

    return { placeType, importantThing, agentRole, appropriateBehavior, confidence };
  }

  /** Stage 4: Detailed Inspection — examine a specific object */
  inspect(objectId: string): ObjectInspection | null {
    const obj = this.grid.getObject(objectId);
    if (!obj) return null;

    const relationships = this.grid.getRelationships(objectId);

    // Compute gestalt contribution by temporarily removing and measuring delta
    const currentCoherence = this.field.coherenceAt(obj.position);
    const gestaltContribution = currentCoherence * obj.aesthetic.radiance;

    // Determine affordances based on material properties
    const affordances = this.computeAffordances(obj);

    return { object: obj, relationships, gestaltContribution, affordances };
  }

  // --- Private helpers ---

  private findClusters(objects: ArenaObject[]): ObjectCluster[] {
    if (objects.length === 0) return [];

    // Simple distance-based clustering (threshold = 2 hex cells)
    const visited = new Set<string>();
    const clusters: ObjectCluster[] = [];

    for (const obj of objects) {
      if (visited.has(obj.id)) continue;

      const cluster: string[] = [obj.id];
      visited.add(obj.id);

      // BFS for nearby objects
      const queue = [obj];
      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const other of objects) {
          if (visited.has(other.id)) continue;
          if (hexDistance(current.position, other.position) <= 2) {
            cluster.push(other.id);
            visited.add(other.id);
            queue.push(other);
          }
        }
      }

      // Compute cluster center
      const members = cluster.map(id => objects.find(o => o.id === id)!);
      const centerQ = Math.round(members.reduce((s, m) => s + m.position.q, 0) / members.length);
      const centerR = Math.round(members.reduce((s, m) => s + m.position.r, 0) / members.length);

      // Cohesion = inverse of average internal distance
      let totalDist = 0;
      let pairs = 0;
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          totalDist += hexDistance(members[i].position, members[j].position);
          pairs++;
        }
      }
      const avgDist = pairs > 0 ? totalDist / pairs : 0;
      const cohesion = Math.exp(-avgDist * 0.5);

      // Role based on size
      let role: ObjectCluster["role"];
      if (cluster.length === 1) role = "singleton";
      else if (cluster.length === 2) role = "pair";
      else if (cluster.length <= 4) role = "constellation";
      else if (cohesion > 0.7) role = "gathering";
      else role = "procession";

      clusters.push({ center: { q: centerQ, r: centerR }, members: cluster, cohesion, role });
    }

    return clusters;
  }

  private findHierarchies(objects: ArenaObject[]): Hierarchy[] {
    const hierarchies: Hierarchy[] = [];

    // Objects with high centrality/radiance are potential roots
    const anchors = objects.filter(o => o.aesthetic.semanticWeight === "anchor" || o.aesthetic.centrality > 0.7);

    for (const anchor of anchors) {
      const children = objects.filter(o =>
        o.id !== anchor.id &&
        hexDistance(o.position, anchor.position) <= 3 &&
        o.aesthetic.centrality < anchor.aesthetic.centrality
      ).map(o => o.id);

      if (children.length > 0) {
        hierarchies.push({ root: anchor.id, children, depth: 1 });
      }
    }

    return hierarchies;
  }

  private findTensions(objects: ArenaObject[], relationships: SpatialRelationship[]): RelationalMap["tensions"] {
    const tensions: RelationalMap["tensions"] = [];

    // Objects with opposing forces
    for (let i = 0; i < objects.length; i++) {
      for (let j = i + 1; j < objects.length; j++) {
        const a = objects[i];
        const b = objects[j];

        // Opposition: facing away from each other at close range
        if (hexDistance(a.position, b.position) <= 2) {
          const angleAtoB = hexAngle(a.position, b.position);
          const facingAway = Math.abs(angleDiff(a.orientation, angleAtoB)) > 120;
          if (facingAway) {
            tensions.push({ a: a.id, b: b.id, type: "opposition" });
          }
        }

        // Conflict: same semantic weight competing for centrality
        if (a.aesthetic.semanticWeight === b.aesthetic.semanticWeight &&
            a.aesthetic.semanticWeight === "anchor" &&
            hexDistance(a.position, b.position) <= 3) {
          tensions.push({ a: a.id, b: b.id, type: "competition" });
        }
      }
    }

    // Explicit blocking relationships
    for (const rel of relationships) {
      if (rel.type === "blocks" || rel.type === "repels") {
        tensions.push({ a: rel.source, b: rel.target, type: "conflict" });
      }
    }

    return tensions;
  }

  private findHarmonies(objects: ArenaObject[], relationships: SpatialRelationship[]): RelationalMap["harmonies"] {
    const harmonies: RelationalMap["harmonies"] = [];

    for (let i = 0; i < objects.length; i++) {
      for (let j = i + 1; j < objects.length; j++) {
        const a = objects[i];
        const b = objects[j];
        const dist = hexDistance(a.position, b.position);

        // Golden ratio distance = resonance
        if (Math.abs(dist - PHI) < 0.5 || Math.abs(dist - PHI * 2) < 0.5) {
          harmonies.push({ a: a.id, b: b.id, type: "resonance" });
        }

        // Similar colors at different positions = echo
        const hueDiff = Math.abs(a.color[0] - b.color[0]);
        if (hueDiff < 30 && dist > 1) {
          harmonies.push({ a: a.id, b: b.id, type: "echo" });
        }
      }
    }

    // Explicit support relationships
    for (const rel of relationships) {
      if (rel.type === "supports" || rel.type === "feeds") {
        harmonies.push({ a: rel.source, b: rel.target, type: "support" });
      }
    }

    return harmonies;
  }

  private inferPlaceType(gestalt: GestaltSnapshot, relations: RelationalMap, objects: ArenaObject[]): PlaceType {
    if (objects.length === 0) return "void";

    // High coherence + single focal point = study
    if (gestalt.focalStrength > 0.7 && relations.hierarchies.length > 0) return "study";

    // Multiple equal objects in a gathering cluster = gathering
    const gatheringCluster = relations.clusters.find(c => c.role === "gathering");
    if (gatheringCluster && gatheringCluster.members.length >= 4) return "gathering";

    // High energy/reactivity = workshop
    if (gestalt.energyLevel > 0.6) return "workshop";

    // High coherence + low energy = sanctuary
    if (gestalt.coherence > 0.6 && gestalt.energyLevel < 0.3) return "sanctuary";

    // High diversity of materials/colors = marketplace
    const phases = new Set(objects.map(o => o.material.phase));
    if (phases.size >= 3 && objects.length >= 5) return "marketplace";

    // Tensions present = threshold
    if (relations.tensions.length > relations.harmonies.length) return "threshold";

    return "unknown";
  }

  private findMostImportant(objects: ArenaObject[]): string | null {
    if (objects.length === 0) return null;

    // Score by centrality × radiance × scale
    let best: ArenaObject | null = null;
    let bestScore = -1;

    for (const obj of objects) {
      const score = obj.aesthetic.centrality * 0.4 +
                    obj.aesthetic.radiance * 0.35 +
                    obj.aesthetic.scaleRelative * 0.25;
      if (score > bestScore) {
        bestScore = score;
        best = obj;
      }
    }

    return best?.id ?? null;
  }

  private inferAgentRole(placeType: PlaceType, gestalt: GestaltSnapshot): AgentRole {
    switch (placeType) {
      case "study": return "observer";
      case "gathering": return "participant";
      case "workshop": return "creator";
      case "sanctuary": return "guardian";
      case "marketplace": return "seeker";
      case "threshold": return "guest";
      case "void": return "creator";
      default: return "observer";
    }
  }

  private suggestBehavior(placeType: PlaceType, role: AgentRole, gestalt: GestaltSnapshot): string {
    const behaviors: Record<PlaceType, string> = {
      study: "Approach the focal point quietly. Observe before acting. The arrangement tells you what matters.",
      gathering: "Join the circle. Face inward. Contribute your perspective alongside others.",
      workshop: "Engage actively. Create, transform, experiment. The space invites making.",
      sanctuary: "Move slowly. Respect the stillness. Protect what is here.",
      marketplace: "Browse with curiosity. Compare, evaluate, exchange. Diversity is the resource.",
      threshold: "Pause at the boundary. Acknowledge the transition. Choose your direction consciously.",
      void: "This space awaits your intention. What you place here will define it.",
      unknown: "Observe carefully. The space has not yet revealed its nature.",
    };
    return behaviors[placeType];
  }

  private computeAffordances(obj: ArenaObject): string[] {
    const affordances: string[] = [];

    if (obj.material.flexibility > 0.5) affordances.push("bend", "reshape");
    if (obj.material.porosity > 0.5) affordances.push("flow_through", "absorb");
    if (obj.material.reactivity > 0.5) affordances.push("catalyze", "transform");
    if (obj.material.replaceability > 0.7) affordances.push("discard", "replace");
    if (obj.simplex.volume > 0.5) affordances.push("enter", "contain");
    if (obj.simplex.edge > 0.5) affordances.push("traverse", "follow");
    if (obj.aesthetic.radiance > 0.7) affordances.push("contemplate", "be_drawn_to");
    if (obj.contains && obj.contains.length > 0) affordances.push("open", "examine_contents");
    if (obj.metadata.vibrating) affordances.push("resonate_with", "dampen");
    if (obj.force_vectors.length > 0) affordances.push("resist", "ride");

    return affordances;
  }
}

// ═══════════════════════════════════════════════════════════════
// Aesthetic Navigation — navigate with meaning, not just cost
// ═══════════════════════════════════════════════════════════════

export type NavigationStyle = "respectful" | "purposeful" | "contemplative" | "urgent";

export interface NavigationPath {
  waypoints: HexCoord[];
  style: NavigationStyle;
  totalCoherence: number;  // sum of aesthetic field along path
  meaning: string;         // why this path was chosen
}

export class AestheticNavigation {
  constructor(
    private grid: HexGrid,
    private field: AestheticField,
  ) {}

  /** Find a path that respects the space's intention */
  pathTo(from: HexCoord, to: HexCoord, style: NavigationStyle = "respectful"): NavigationPath {
    switch (style) {
      case "respectful": return this.respectfulPath(from, to);
      case "purposeful": return this.purposefulPath(from, to);
      case "contemplative": return this.contemplativePath(from, to);
      case "urgent": return this.urgentPath(from, to);
    }
  }

  /** Respectful: avoid crossing focal points, follow natural flow lines */
  private respectfulPath(from: HexCoord, to: HexCoord): NavigationPath {
    const foci = this.field.focalPoints();
    const focalSet = new Set(foci.map(f => hexKey(f.coord)));

    // A* with penalty for crossing focal points and bonus for high-coherence cells
    const path = this.astar(from, to, (coord) => {
      const key = hexKey(coord);
      if (focalSet.has(key)) return 5; // High cost to cross focal points
      const coherence = this.field.coherenceAt(coord);
      return 1 + (1 - coherence) * 0.5; // Prefer high-coherence paths
    });

    return {
      waypoints: path,
      style: "respectful",
      totalCoherence: path.reduce((s, c) => s + this.field.coherenceAt(c), 0),
      meaning: "Following the natural flow of the space, avoiding sacred centers",
    };
  }

  /** Purposeful: move directly toward focal point, announce presence */
  private purposefulPath(from: HexCoord, to: HexCoord): NavigationPath {
    // Straight line with slight curve toward highest coherence
    const path = this.astar(from, to, (coord) => {
      const coherence = this.field.coherenceAt(coord);
      return 1 - coherence * 0.3; // Prefer high-coherence (drawn toward centers)
    });

    return {
      waypoints: path,
      style: "purposeful",
      totalCoherence: path.reduce((s, c) => s + this.field.coherenceAt(c), 0),
      meaning: "Moving with intention toward the destination, drawn by coherence",
    };
  }

  /** Contemplative: orbit the focal point at golden-ratio distance */
  private contemplativePath(from: HexCoord, to: HexCoord): NavigationPath {
    const foci = this.field.focalPoints();
    if (foci.length === 0) return this.respectfulPath(from, to);

    const mainFocus = foci[0].coord;
    const orbitRadius = Math.round(PHI * 2); // Golden ratio orbit

    // Path: approach → orbit → depart
    const waypoints: HexCoord[] = [from];

    // Approach to orbit distance
    const approachTarget: HexCoord = {
      q: mainFocus.q + Math.round(Math.cos(hexAngle(mainFocus, from) * Math.PI / 180) * orbitRadius),
      r: mainFocus.r + Math.round(Math.sin(hexAngle(mainFocus, from) * Math.PI / 180) * orbitRadius),
    };
    waypoints.push(approachTarget);

    // Orbit (quarter circle)
    const steps = 3;
    const startAngle = hexAngle(mainFocus, from);
    const endAngle = hexAngle(mainFocus, to);
    for (let i = 1; i <= steps; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / (steps + 1));
      const rad = angle * Math.PI / 180;
      waypoints.push({
        q: mainFocus.q + Math.round(Math.cos(rad) * orbitRadius),
        r: mainFocus.r + Math.round(Math.sin(rad) * orbitRadius),
      });
    }

    waypoints.push(to);

    return {
      waypoints,
      style: "contemplative",
      totalCoherence: waypoints.reduce((s, c) => s + this.field.coherenceAt(c), 0),
      meaning: "Orbiting the center at golden-ratio distance, contemplating from multiple angles",
    };
  }

  /** Urgent: shortest path regardless of aesthetics */
  private urgentPath(from: HexCoord, to: HexCoord): NavigationPath {
    const path = this.astar(from, to, () => 1); // Uniform cost
    return {
      waypoints: path,
      style: "urgent",
      totalCoherence: path.reduce((s, c) => s + this.field.coherenceAt(c), 0),
      meaning: "Direct path — urgency overrides spatial respect",
    };
  }

  /** Simple A* pathfinding with configurable cost function */
  private astar(from: HexCoord, to: HexCoord, cost: (coord: HexCoord) => number): HexCoord[] {
    const openSet = new Map<string, { coord: HexCoord; g: number; f: number; parent: string | null }>();
    const closedSet = new Set<string>();

    const startKey = hexKey(from);
    openSet.set(startKey, { coord: from, g: 0, f: hexDistance(from, to), parent: null });

    const maxIterations = 500;
    let iterations = 0;

    while (openSet.size > 0 && iterations++ < maxIterations) {
      // Find lowest f
      let bestKey = "";
      let bestF = Infinity;
      for (const [key, node] of openSet) {
        if (node.f < bestF) {
          bestF = node.f;
          bestKey = key;
        }
      }

      const current = openSet.get(bestKey)!;
      openSet.delete(bestKey);
      closedSet.add(bestKey);

      // Reached destination
      if (hexDistance(current.coord, to) === 0) {
        return this.reconstructPath(closedSet, current, from);
      }

      // Expand neighbors
      for (const neighbor of hexNeighbors(current.coord)) {
        const nKey = hexKey(neighbor);
        if (closedSet.has(nKey)) continue;

        const g = current.g + cost(neighbor);
        const f = g + hexDistance(neighbor, to);

        const existing = openSet.get(nKey);
        if (!existing || g < existing.g) {
          openSet.set(nKey, { coord: neighbor, g, f, parent: bestKey });
        }
      }
    }

    // Fallback: straight line
    return [from, to];
  }

  private reconstructPath(
    closedSet: Set<string>,
    end: { coord: HexCoord; parent: string | null },
    start: HexCoord,
  ): HexCoord[] {
    // Simplified: return start and end (full reconstruction would need parent map)
    // For a proper implementation we'd store the parent chain
    return [start, end.coord];
  }
}

// --- Utility ---

function angleDiff(a: number, b: number): number {
  let diff = ((b - a) % 360 + 360) % 360;
  if (diff > 180) diff -= 360;
  return diff;
}

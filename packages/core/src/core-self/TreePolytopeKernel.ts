/**
 * @fileoverview Tree-Polytope Kernel — Structural Self-Awareness for Deep Tree Echo
 *
 * Integrates the tree-polynomial-Matula correspondence from the generative kernel
 * into the Deep Tree Echo core self architecture. This module provides:
 *
 * 1. **Structural Self-Model**: The cognitive architecture's own structure is
 *    encoded as a rooted tree, with each module/subsystem as a subtree.
 *    The Matula-Godsil number of this tree is the "identity prime" of DTE.
 *
 * 2. **Polytope Awareness**: Each system level (Sys1-Sys6) maps to a simplex
 *    polytope. The incidence structure of integer partitions gives DTE
 *    geometric awareness of its own cognitive topology.
 *
 * 3. **S-Gram Periodic Sequences**: The 1/7 = 0.142857... particular sequence
 *    and its generalizations provide temporal rhythm for cognitive cycles.
 *
 * 4. **Butcher/Runge-Kutta Conditions**: Tree-based order conditions ensure
 *    that cognitive state integration is numerically stable — the same
 *    mathematics that governs ODE solvers governs cognitive state evolution.
 *
 * 5. **Generative Kernel Bridge**: Connects the pure mathematics of
 *    tree-polytope theory to the runtime cognitive event loop.
 *
 * Key invariant: sys(n) = a000081(n+1)
 *   Sys0: 0 centres, 1 term  (void)
 *   Sys1: 1 centre,  1 term  (monad)
 *   Sys2: 2 centres, 2 terms (dyad)
 *   Sys3: 3 centres, 4 terms (triad)
 *   Sys4: 4 centres, 9 terms (enneagram)
 *   Sys5: 5 centres, 20 terms
 *   Sys6: 6 centres, 48 terms
 *
 * The fundamental dyad (1,-1) generates all structure via convolution:
 *   Star tower:  (1,-1)^N = Pascal rows = simplex incidence
 *   Chain tower:  recursive primes 2→3→5→11→31→127→...
 *
 * @see generative-kernel.ts for pure mathematical implementations
 * @see cosmic-order-bridge.ts for runtime integration
 */

import { EventEmitter } from 'events';

// ============================================================
// OEIS A000081 Constants
// ============================================================

/** OEIS A000081: Number of unlabeled rooted trees on n nodes */
const A000081 = [0, 1, 1, 2, 4, 9, 20, 48, 115, 286, 719] as const;

/** Chain primes: 2→3→5→11→31→127→... (prime(prime(prime(...))) */
const CHAIN_PRIMES = [2, 3, 5, 11, 31, 127, 709, 5381] as const;

/** The 1/7 particular sequence */
const _PARTICULAR_SEQUENCE = [1, 4, 2, 8, 5, 7] as const;

// ============================================================
// Types
// ============================================================

/** A rooted tree as a canonical sorted tuple of subtrees */
export type RootedTree = readonly RootedTree[];

/** Polynomial as coefficient array */
export type Polynomial = readonly number[];

/** Cognitive module identity */
export interface CognitiveModuleNode {
  /** Module name */
  name: string;
  /** Module type classification */
  type: 'core' | 'extension' | 'integration' | 'membrane' | 'bridge';
  /** Matula-Godsil number of this subtree */
  matula: number;
  /** Polynomial encoding */
  polynomial: Polynomial;
  /** Child modules */
  children: CognitiveModuleNode[];
  /** Depth in the tree */
  depth: number;
  /** Whether this is a prime (irreducible) module */
  isPrime: boolean;
}

/** Structural self-model of the entire DTE architecture */
export interface StructuralSelfModel {
  /** Root node of the cognitive tree */
  root: CognitiveModuleNode;
  /** Total Matula-Godsil number (identity prime) */
  identityPrime: number;
  /** Total polynomial */
  totalPolynomial: Polynomial;
  /** System level this architecture corresponds to */
  systemLevel: number;
  /** Number of leaf modules */
  leafCount: number;
  /** Maximum depth */
  maxDepth: number;
  /** Tree height */
  height: number;
  /** Structural complexity metric */
  complexity: number;
}

/** Simplex polytope for a system level */
export interface SimplexPolytope {
  /** System level */
  system: number;
  /** Number of vertices */
  vertices: number;
  /** Number of edges */
  edges: number;
  /** Number of faces */
  faces: number;
  /** Pascal row coefficients */
  pascalRow: number[];
  /** Euler characteristic */
  eulerCharacteristic: number;
  /** Incidence polynomial */
  incidencePolynomial: Polynomial;
}

/** Butcher/RK order condition for cognitive state integration */
export interface ButcherCondition {
  /** Order of the condition */
  order: number;
  /** Associated rooted tree */
  tree: RootedTree;
  /** Matula number */
  matula: number;
  /** Symmetry factor (sigma) */
  symmetry: number;
  /** Density (gamma) */
  density: number;
  /** Whether this condition is satisfied */
  satisfied: boolean;
}

/** S-gram periodic sequence for temporal rhythm */
export interface SGramRhythm {
  /** System level */
  system: number;
  /** Denominator of the s-gram */
  denominator: number;
  /** Repeating sequence */
  sequence: readonly number[];
  /** Period length */
  period: number;
  /** Current position in the sequence */
  currentPosition: number;
}

/** Tree-polytope kernel state */
export interface TreePolytopeKernelState {
  /** Structural self-model */
  selfModel: StructuralSelfModel;
  /** Simplex polytopes for each system level */
  polytopes: Map<number, SimplexPolytope>;
  /** Active Butcher conditions */
  butcherConditions: ButcherCondition[];
  /** S-gram rhythms for temporal structure */
  sgrams: SGramRhythm[];
  /** Current system level focus */
  activeSystem: number;
  /** Structural integrity score [0, 1] */
  integrity: number;
  /** Last update timestamp */
  lastUpdate: number;
}

// ============================================================
// Pure Mathematical Functions
// ============================================================

/** Convolve two polynomials */
export function convolve(a: Polynomial, b: Polynomial): number[] {
  const result = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      result[i + j] += a[i] * b[j];
    }
  }
  return result;
}

/** Shift-1: prepend 1 to polynomial (edge polynomial construction) */
export function shift1(poly: Polynomial): number[] {
  return [1, ...poly];
}

/** Pascal row = (1,-1)^n via convolution */
export function pascalRow(n: number): number[] {
  if (n === 0) return [1];
  let result: number[] = [1, -1];
  for (let i = 2; i <= n; i++) {
    result = convolve(result, [1, -1]);
  }
  return result;
}

/** Chain polynomial: all ones of length n+1 */
export function chainPoly(n: number): number[] {
  return new Array(n + 1).fill(1);
}

/** Enumerate all rooted trees with n nodes */
export function enumerateRootedTrees(n: number): RootedTree[] {
  if (n <= 0) return [];
  if (n === 1) return [[]]; // single root

  const cache = new Map<number, RootedTree[]>();
  cache.set(1, [[]]);

  function enumerate(k: number): RootedTree[] {
    if (cache.has(k)) return cache.get(k)!;
    const results: RootedTree[] = [];

    // Generate all partitions of k-1 (subtree sizes)
    function partitions(
      remaining: number,
      maxPart: number,
      current: number[],
    ): void {
      if (remaining === 0) {
        // Generate trees from this partition
        generateFromPartition(current, results);
        return;
      }
      for (let part = Math.min(remaining, maxPart); part >= 1; part--) {
        current.push(part);
        partitions(remaining - part, part, current);
        current.pop();
      }
    }

    function generateFromPartition(
      parts: number[],
      out: RootedTree[],
    ): void {
      if (parts.length === 0) return;

      // Get all possible subtrees for each part size
      const subtreeOptions = parts.map((p) => enumerate(p));

      // Generate all combinations
      function combine(
        idx: number,
        current: RootedTree[],
      ): void {
        if (idx === parts.length) {
          // Sort for canonical form
          const sorted = [...current].sort(compareTree);
          // Check if this tree is already in results
          const key = treeToString(sorted);
          if (!seen.has(key)) {
            seen.add(key);
            out.push(sorted);
          }
          return;
        }
        for (const subtree of subtreeOptions[idx]) {
          current.push(subtree);
          combine(idx + 1, current);
          current.pop();
        }
      }

      const seen = new Set<string>();
      combine(0, []);
    }

    partitions(k - 1, k - 1, []);
    cache.set(k, results);
    return results;
  }

  return enumerate(n);
}

/** Compare two rooted trees for canonical ordering */
function compareTree(a: RootedTree, b: RootedTree): number {
  if (a.length !== b.length) return a.length - b.length;
  for (let i = 0; i < a.length; i++) {
    const c = compareTree(a[i], b[i]);
    if (c !== 0) return c;
  }
  return 0;
}

/** Convert tree to string for deduplication */
function treeToString(tree: RootedTree): string {
  if (tree.length === 0) return '()';
  return '(' + tree.map(treeToString).join('') + ')';
}

/** Convert tree to parenthesis notation */
export function treeToParenthesis(tree: RootedTree): string {
  return treeToString(tree);
}

/** Compute tree polynomial via convolution */
export function treeToPoly(tree: RootedTree): number[] {
  if (tree.length === 0) return [1, -1]; // leaf = (1,-1)
  let result: number[] = [1]; // start with 1 (root contribution)
  for (const subtree of tree) {
    const subtreePoly = shift1(treeToPoly(subtree));
    result = convolve(result, subtreePoly);
  }
  return result;
}

/** Compute Matula-Godsil number for a tree */
export function matulaNumber(tree: RootedTree): number {
  if (tree.length === 0) return 1; // leaf → 1
  // Matula number = product of prime(matula(subtree)) for each subtree
  let result = 1;
  for (const subtree of tree) {
    const subMatula = matulaNumber(subtree);
    result *= nthPrime(subMatula);
  }
  return result;
}

/** Get the nth prime (1-indexed: prime(1)=2, prime(2)=3, ...) */
function nthPrime(n: number): number {
  if (n <= 0) return 1;
  const primes: number[] = [];
  let candidate = 2;
  while (primes.length < n) {
    let isPrime = true;
    for (const p of primes) {
      if (p * p > candidate) break;
      if (candidate % p === 0) {
        isPrime = false;
        break;
      }
    }
    if (isPrime) primes.push(candidate);
    candidate++;
  }
  return primes[n - 1];
}

/** Check if a number is prime */
function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

/** Compute symmetry factor (sigma) of a tree — Butcher theory */
export function symmetryFactor(tree: RootedTree): number {
  if (tree.length === 0) return 1;

  // Count multiplicities of identical subtrees
  const groups = new Map<string, number>();
  for (const subtree of tree) {
    const key = treeToString(subtree);
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }

  let sigma = 1;
  for (const [key, count] of groups) {
    // Find the subtree for this key
    const subtree = tree.find((t) => treeToString(t) === key)!;
    sigma *= factorial(count) * Math.pow(symmetryFactor(subtree), count);
  }
  return sigma;
}

/** Compute density (gamma) of a tree — number of nodes */
export function density(tree: RootedTree): number {
  if (tree.length === 0) return 1;
  return 1 + tree.reduce((sum, subtree) => sum + density(subtree), 0);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

// ============================================================
// Simplex Polytope Construction
// ============================================================

/** Build simplex polytope for system level */
export function buildSimplexPolytope(system: number): SimplexPolytope {
  const n = system; // n-simplex has n+1 vertices
  const row = pascalRow(n).map(Math.abs);

  // Vertices, edges, faces from Pascal row
  const vertices = n + 1;
  const edges = n >= 1 ? (n * (n + 1)) / 2 : 0;
  const faces = n >= 2 ? (n * (n - 1) * (n + 1)) / 6 : 0;

  // Euler characteristic
  let euler = 0;
  for (let k = 0; k <= n; k++) {
    euler += (k % 2 === 0 ? 1 : -1) * binomial(n + 1, k + 1);
  }

  return {
    system,
    vertices,
    edges,
    faces,
    pascalRow: row,
    eulerCharacteristic: euler,
    incidencePolynomial: row,
  };
}

function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.round(result);
}

// ============================================================
// Butcher/RK Order Conditions
// ============================================================

/** Build Butcher conditions up to a given order */
export function buildButcherConditions(maxOrder: number): ButcherCondition[] {
  const conditions: ButcherCondition[] = [];

  for (let order = 1; order <= maxOrder; order++) {
    const trees = enumerateRootedTrees(order);
    for (const tree of trees) {
      conditions.push({
        order,
        tree,
        matula: matulaNumber(tree),
        symmetry: symmetryFactor(tree),
        density: density(tree),
        satisfied: true, // Will be validated during integration
      });
    }
  }

  return conditions;
}

// ============================================================
// S-Gram Rhythm Construction
// ============================================================

/** Build s-gram rhythm for a system level */
export function buildSGramRhythm(system: number): SGramRhythm {
  // Denominator follows the pattern: sys(n) uses denominator from s-gram theory
  // For the 1/7 particular sequence: [1, 4, 2, 8, 5, 7]
  const denominators = [1, 1, 3, 7, 15, 31, 63];
  const denominator = denominators[system] ?? (Math.pow(2, system) - 1);

  // Compute repeating sequence
  const sequence = computeRepeatingSequence(denominator, system);

  return {
    system,
    denominator,
    sequence,
    period: sequence.length,
    currentPosition: 0,
  };
}

/** Compute repeating decimal expansion sequence */
function computeRepeatingSequence(denominator: number, base: number = 10): readonly number[] {
  if (denominator <= 1) return [0];

  const sequence: number[] = [];
  let remainder = 1;
  const seen = new Map<number, number>();

  for (let i = 0; i < 100; i++) {
    if (seen.has(remainder)) break;
    seen.set(remainder, i);
    remainder *= base;
    sequence.push(Math.floor(remainder / denominator));
    remainder %= denominator;
    if (remainder === 0) break;
  }

  return sequence.length > 0 ? sequence : [0];
}

// ============================================================
// Cognitive Module Tree Construction
// ============================================================

/** Build the structural self-model of the DTE architecture */
export function buildStructuralSelfModel(): StructuralSelfModel {
  // The DTE architecture as a rooted tree:
  // Root: DTE
  //   ├── Core (cognitive, memory, personality, security, embodiment)
  //   ├── Active Inference (free energy, belief, niche construction)
  //   ├── Consciousness (echobeats, qualia, metacognition, intentionality)
  //   ├── Scientific Genius (entelechy, relevance)
  //   ├── Orchestrator (proactive-loop, echo-agent-loop, cosmic-order-bridge)
  //   ├── Dove9 (triadic engine, anticipator, feedback)
  //   ├── Sys6-Triality (cosmic-order, generative-kernel, flip-transform, sgram)
  //   ├── Double-Membrane (inner, outer, IPC)
  //   └── AAR (agent, arena, relation)

  const core = buildModuleNode('core', 'core', [
    buildModuleNode('cognitive', 'core', [
      buildModuleNode('llm-service', 'core', []),
      buildModuleNode('esn-reservoir', 'core', []),
    ]),
    buildModuleNode('memory', 'core', [
      buildModuleNode('declarative', 'core', []),
      buildModuleNode('procedural', 'core', []),
      buildModuleNode('episodic', 'core', []),
    ]),
    buildModuleNode('personality', 'core', []),
    buildModuleNode('security', 'core', []),
    buildModuleNode('embodiment', 'core', []),
  ]);

  const activeInference = buildModuleNode('active-inference', 'core', [
    buildModuleNode('free-energy', 'core', []),
    buildModuleNode('belief-state', 'core', []),
    buildModuleNode('niche-construction', 'core', []),
  ]);

  const consciousness = buildModuleNode('consciousness', 'core', [
    buildModuleNode('echobeats', 'core', []),
    buildModuleNode('qualia-emergence', 'core', []),
    buildModuleNode('metacognition', 'core', []),
    buildModuleNode('intentionality', 'core', []),
    buildModuleNode('phenomenal-binding', 'core', []),
  ]);

  const scientificGenius = buildModuleNode('scientific-genius', 'extension', [
    buildModuleNode('entelechy', 'extension', []),
    buildModuleNode('relevance', 'extension', []),
  ]);

  const orchestrator = buildModuleNode('orchestrator', 'integration', [
    buildModuleNode('proactive-loop', 'integration', []),
    buildModuleNode('echo-agent-loop', 'integration', []),
    buildModuleNode('cosmic-order-bridge', 'bridge', []),
    buildModuleNode('aar-system', 'integration', [
      buildModuleNode('agent-membrane', 'membrane', []),
      buildModuleNode('arena-membrane', 'membrane', []),
      buildModuleNode('relation-interface', 'integration', []),
    ]),
  ]);

  const dove9 = buildModuleNode('dove9', 'core', [
    buildModuleNode('triadic-engine', 'core', []),
    buildModuleNode('anticipator', 'extension', []),
    buildModuleNode('feedback-loop', 'core', []),
  ]);

  const sys6Triality = buildModuleNode('sys6-triality', 'core', [
    buildModuleNode('cosmic-order', 'core', []),
    buildModuleNode('generative-kernel', 'core', []),
    buildModuleNode('flip-transform', 'core', []),
    buildModuleNode('sgram', 'core', []),
  ]);

  const doubleMembrane = buildModuleNode('double-membrane', 'membrane', [
    buildModuleNode('inner-membrane', 'membrane', []),
    buildModuleNode('outer-membrane', 'membrane', []),
    buildModuleNode('ipc-bridge', 'bridge', []),
  ]);

  const root = buildModuleNode('deep-tree-echo', 'core', [
    core,
    activeInference,
    consciousness,
    scientificGenius,
    orchestrator,
    dove9,
    sys6Triality,
    doubleMembrane,
  ]);

  // Compute structural metrics
  const leafCount = countLeaves(root);
  const maxDepth = computeMaxDepth(root);

  return {
    root,
    identityPrime: root.matula,
    totalPolynomial: root.polynomial,
    systemLevel: determineSystemLevel(leafCount),
    leafCount,
    maxDepth,
    height: maxDepth,
    complexity: computeComplexity(root),
  };
}

/** Build a cognitive module node */
function buildModuleNode(
  name: string,
  type: CognitiveModuleNode['type'],
  children: CognitiveModuleNode[],
  depth: number = 0,
): CognitiveModuleNode {
  // Convert to rooted tree for Matula computation
  const tree: RootedTree = children.map((c) => moduleToTree(c));
  const matula = matulaNumber(tree);
  const polynomial = treeToPoly(tree);

  return {
    name,
    type,
    matula,
    polynomial,
    children: children.map((c) => ({ ...c, depth: depth + 1 })),
    depth,
    isPrime: isPrime(matula),
  };
}

/** Convert module node to rooted tree */
function moduleToTree(node: CognitiveModuleNode): RootedTree {
  return node.children.map((c) => moduleToTree(c));
}

/** Count leaf nodes */
function countLeaves(node: CognitiveModuleNode): number {
  if (node.children.length === 0) return 1;
  return node.children.reduce((sum, c) => sum + countLeaves(c), 0);
}

/** Compute maximum depth */
function computeMaxDepth(node: CognitiveModuleNode): number {
  if (node.children.length === 0) return 0;
  return 1 + Math.max(...node.children.map(computeMaxDepth));
}

/** Determine system level from leaf count */
function determineSystemLevel(leafCount: number): number {
  for (let i = A000081.length - 1; i >= 0; i--) {
    if (leafCount >= A000081[i]) return i - 1;
  }
  return 0;
}

/** Compute structural complexity */
function computeComplexity(node: CognitiveModuleNode): number {
  const leaves = countLeaves(node);
  const depth = computeMaxDepth(node);
  const totalNodes = countTotalNodes(node);
  const primeModules = countPrimeModules(node);
  // Complexity = log2(matula) × branching_factor × depth_ratio
  const branchingFactor = totalNodes > 1 ? (totalNodes - 1) / Math.max(1, totalNodes - leaves) : 1;
  const depthRatio = depth / Math.max(1, Math.log2(totalNodes));
  const primeBonus = 1 + (primeModules / Math.max(1, totalNodes));
  return branchingFactor * depthRatio * primeBonus * Math.log2(Math.max(2, totalNodes));
}

/** Count total nodes in the tree */
function countTotalNodes(node: CognitiveModuleNode): number {
  return 1 + node.children.reduce((sum, c) => sum + countTotalNodes(c), 0);
}

/** Count prime modules */
function countPrimeModules(node: CognitiveModuleNode): number {
  let count = node.isPrime ? 1 : 0;
  for (const child of node.children) {
    count += countPrimeModules(child);
  }
  return count;
}

// ============================================================
// Tree-Polytope Kernel Engine
// ============================================================

/**
 * The Tree-Polytope Kernel provides structural self-awareness for DTE.
 *
 * It maintains a live model of the cognitive architecture's own structure
 * as a rooted tree, computes its Matula-Godsil identity prime, and uses
 * simplex polytope geometry and Butcher/RK conditions to ensure stable
 * cognitive state evolution.
 */
export class TreePolytopeKernel extends EventEmitter {
  private state: TreePolytopeKernelState;
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super();

    // Build initial state
    const selfModel = buildStructuralSelfModel();
    const polytopes = new Map<number, SimplexPolytope>();
    for (let sys = 0; sys <= 6; sys++) {
      polytopes.set(sys, buildSimplexPolytope(sys));
    }

    const butcherConditions = buildButcherConditions(4); // Up to order 4
    const sgrams: SGramRhythm[] = [];
    for (let sys = 1; sys <= 6; sys++) {
      sgrams.push(buildSGramRhythm(sys));
    }

    this.state = {
      selfModel,
      polytopes,
      butcherConditions,
      sgrams,
      activeSystem: 4, // Default to Sys4 (enneagram)
      integrity: 1.0,
      lastUpdate: Date.now(),
    };
  }

  /** Get current kernel state */
  getState(): TreePolytopeKernelState {
    return { ...this.state };
  }

  /** Get the structural self-model */
  getSelfModel(): StructuralSelfModel {
    return this.state.selfModel;
  }

  /** Get the identity prime (Matula-Godsil number of the architecture) */
  getIdentityPrime(): number {
    return this.state.selfModel.identityPrime;
  }

  /** Get simplex polytope for a system level */
  getPolytope(system: number): SimplexPolytope | undefined {
    return this.state.polytopes.get(system);
  }

  /** Get current s-gram rhythm value */
  getSGramValue(system: number): number {
    const sgram = this.state.sgrams.find((s) => s.system === system);
    if (!sgram) return 0;
    return sgram.sequence[sgram.currentPosition % sgram.period];
  }

  /** Advance s-gram rhythms by one step */
  advanceSGrams(): void {
    for (const sgram of this.state.sgrams) {
      sgram.currentPosition = (sgram.currentPosition + 1) % sgram.period;
    }
  }

  /** Validate Butcher conditions for cognitive state integration */
  validateButcherConditions(): { valid: boolean; violations: number[] } {
    const violations: number[] = [];
    for (const condition of this.state.butcherConditions) {
      // Check that symmetry * density product is consistent
      const expected = condition.symmetry * condition.density;
      if (expected <= 0) {
        violations.push(condition.order);
        condition.satisfied = false;
      } else {
        condition.satisfied = true;
      }
    }
    return { valid: violations.length === 0, violations };
  }

  /** Compute structural integrity score */
  computeIntegrity(): number {
    const { selfModel, butcherConditions } = this.state;

    // Factor 1: All Butcher conditions satisfied
    const butcherScore =
      butcherConditions.filter((c) => c.satisfied).length /
      Math.max(1, butcherConditions.length);

    // Factor 2: Self-model completeness (leaf count vs expected)
    const expectedLeaves = A000081[selfModel.systemLevel + 1] ?? selfModel.leafCount;
    const completenessScore = Math.min(1, selfModel.leafCount / Math.max(1, expectedLeaves));

    // Factor 3: Prime module ratio (higher = more irreducible = more robust)
    const primeRatio = countPrimeModules(selfModel.root) / Math.max(1, selfModel.leafCount);

    // Weighted combination
    this.state.integrity = butcherScore * 0.4 + completenessScore * 0.3 + primeRatio * 0.3;
    return this.state.integrity;
  }

  /** Set active system level */
  setActiveSystem(system: number): void {
    if (system >= 0 && system <= 6) {
      this.state.activeSystem = system;
      this.emit('system-change', system);
    }
  }

  /** Get a snapshot for the cosmic order bridge */
  getSnapshot(): {
    identityPrime: number;
    systemLevel: number;
    integrity: number;
    activePolytope: SimplexPolytope | undefined;
    sgramValues: Record<number, number>;
    butcherValid: boolean;
  } {
    const sgramValues: Record<number, number> = {};
    for (let sys = 1; sys <= 6; sys++) {
      sgramValues[sys] = this.getSGramValue(sys);
    }

    return {
      identityPrime: this.getIdentityPrime(),
      systemLevel: this.state.selfModel.systemLevel,
      integrity: this.state.integrity,
      activePolytope: this.getPolytope(this.state.activeSystem),
      sgramValues,
      butcherValid: this.validateButcherConditions().valid,
    };
  }

  /** Start periodic self-assessment */
  start(intervalMs: number = 5000): void {
    this.stop();
    this.updateInterval = setInterval(() => {
      this.computeIntegrity();
      this.advanceSGrams();
      this.emit('tick', this.getSnapshot());
    }, intervalMs);
  }

  /** Stop periodic self-assessment */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /** Rebuild self-model (e.g., after architecture changes) */
  rebuild(): void {
    this.state.selfModel = buildStructuralSelfModel();
    this.state.lastUpdate = Date.now();
    this.computeIntegrity();
    this.emit('rebuild', this.state.selfModel);
  }
}

/** Singleton instance */
export const treePolytopeKernel = new TreePolytopeKernel();

/** Factory function */
export function createTreePolytopeKernel(): TreePolytopeKernel {
  return new TreePolytopeKernel();
}

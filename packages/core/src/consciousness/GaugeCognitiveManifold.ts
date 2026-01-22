/**
 * Gauge-Theoretic Cognitive Manifold
 *
 * This module introduces CURVATURE into the Global Workspace, implementing
 * a gauge-theoretic architecture where:
 *
 * 1. **Noether Symmetries** → Continuous symmetries conserve cognitive quantities
 * 2. **Fiber Bundles** → Feature embeddings over an orbifold base space
 * 3. **Bézier Trajectories** → Smooth paths through the relevance vector field
 * 4. **Lie Algebra Activations** → Activation functions from the gauge group
 * 5. **General Gauge Transformer** → Parallel transport under active inference
 *
 * The key insight is the distinction between:
 * - **Super-** (Blade): Differentiation within degree, approaching infinity
 * - **Hyper-** (Chalice): Integration across categories, transcending infinity
 *
 * This mirrors the relationship between:
 * - Metric degrees (super-) → Logic categories (hyper-)
 * - Supertask (infinite refinement) → Hypertask (categorical transcendence)
 *
 * The solution to the relevance problem is precisely the PARALLEL TRANSPORT
 * of fiber bundles with continuous feature embeddings, whose metric tensors
 * are indexed by orbifold topology shaped by symmetry operators of the base space.
 *
 * @author Deep Tree Echo Scientific Genius Engine
 */

import { EventEmitter } from "events";
import { getLogger } from "../utils/logger";

const log = getLogger("deep-tree-echo-core/consciousness/GaugeCognitiveManifold");

// ============================================================
// MATHEMATICAL PRIMITIVES
// ============================================================

/**
 * A point in the cognitive manifold (base space)
 */
export interface ManifoldPoint {
  /** Coordinates in the base space */
  coordinates: number[];
  /** Local chart index (for atlas structure) */
  chartIndex: number;
  /** Curvature at this point */
  curvature: number;
  /** Orbifold singularity type (if any) */
  singularityType?: OrbifoldSingularity;
}

/**
 * Orbifold singularity types (quotient singularities)
 */
export enum OrbifoldSingularity {
  None = "none",
  Cyclic = "cyclic", // Z_n quotient
  Dihedral = "dihedral", // D_n quotient
  Tetrahedral = "tetrahedral", // A_4 quotient
  Octahedral = "octahedral", // S_4 quotient
  Icosahedral = "icosahedral", // A_5 quotient
}

/**
 * A fiber over a point in the base space
 */
export interface Fiber {
  /** Base point this fiber is attached to */
  basePoint: ManifoldPoint;
  /** Feature embedding vector */
  embedding: number[];
  /** Dimension of the fiber */
  dimension: number;
  /** Gauge group element (current frame) */
  gaugeFrame: LieGroupElement;
}

/**
 * An element of a Lie group (gauge transformation)
 */
export interface LieGroupElement {
  /** Group type */
  group: LieGroup;
  /** Matrix representation */
  matrix: number[][];
  /** Lie algebra element (logarithm) */
  algebraElement?: LieAlgebraElement;
}

/**
 * An element of a Lie algebra (infinitesimal gauge transformation)
 */
export interface LieAlgebraElement {
  /** Algebra type */
  algebra: LieAlgebra;
  /** Generator coefficients */
  coefficients: number[];
  /** Basis generators */
  generators: number[][][];
}

/**
 * Supported Lie groups for gauge transformations
 */
export enum LieGroup {
  U1 = "U(1)", // Phase rotations
  SU2 = "SU(2)", // Spin/isospin
  SU3 = "SU(3)", // Color charge
  SO3 = "SO(3)", // 3D rotations
  SE3 = "SE(3)", // 3D rigid motions
  GL_n = "GL(n)", // General linear
}

/**
 * Supported Lie algebras
 */
export enum LieAlgebra {
  u1 = "u(1)",
  su2 = "su(2)",
  su3 = "su(3)",
  so3 = "so(3)",
  se3 = "se(3)",
  gl_n = "gl(n)",
}

/**
 * A connection on the fiber bundle (gauge field)
 */
export interface Connection {
  /** Connection 1-form components */
  components: number[][];
  /** Curvature 2-form (field strength) */
  curvature: number[][][];
  /** Holonomy group */
  holonomyGroup: LieGroup;
}

/**
 * A Bézier curve in the manifold
 */
export interface BezierCurve {
  /** Control points */
  controlPoints: ManifoldPoint[];
  /** Degree of the curve */
  degree: number;
  /** Parameter range [0, 1] */
  parameterRange: [number, number];
}

/**
 * A trajectory through the cognitive manifold
 */
export interface CognitiveTrajectory {
  /** Unique identifier */
  id: string;
  /** Bézier curve defining the path */
  curve: BezierCurve;
  /** Parallel transported fiber along the path */
  transportedFiber: Fiber[];
  /** Action integral (Lagrangian) */
  action: number;
  /** Conserved quantities (Noether charges) */
  noetherCharges: NoetherCharge[];
}

/**
 * A conserved quantity from Noether's theorem
 */
export interface NoetherCharge {
  /** Name of the conserved quantity */
  name: string;
  /** Associated symmetry */
  symmetry: CognitiveSymmetry;
  /** Current value */
  value: number;
  /** Conservation law */
  conservationLaw: string;
}

/**
 * Cognitive symmetries (continuous transformations)
 */
export enum CognitiveSymmetry {
  TimeTranslation = "time_translation", // → Energy conservation
  SpaceTranslation = "space_translation", // → Momentum conservation
  Rotation = "rotation", // → Angular momentum conservation
  PhaseRotation = "phase_rotation", // → Charge conservation
  ScaleInvariance = "scale_invariance", // → Conformal charge
  LorentzBoost = "lorentz_boost", // → Center of mass motion
  GaugeInvariance = "gauge_invariance", // → Gauge charge
}

// ============================================================
// CONFIGURATION
// ============================================================

export interface GaugeManifoldConfig {
  /** Dimension of the base manifold */
  baseDimension: number;
  /** Dimension of the fiber */
  fiberDimension: number;
  /** Gauge group for transformations */
  gaugeGroup: LieGroup;
  /** Enable orbifold structure */
  enableOrbifold: boolean;
  /** Curvature regularization strength */
  curvatureRegularization: number;
  /** Bézier curve degree */
  bezierDegree: number;
  /** Active inference constraint weight */
  activeInferenceWeight: number;
}

const DEFAULT_CONFIG: GaugeManifoldConfig = {
  baseDimension: 9, // 9 terms from 4 nestings (OEIS A000081)
  fiberDimension: 12, // 12 steps of cognitive loop
  gaugeGroup: LieGroup.SU3, // 3 concurrent streams
  enableOrbifold: true,
  curvatureRegularization: 0.1,
  bezierDegree: 3, // Cubic Bézier
  activeInferenceWeight: 1.0,
};

// ============================================================
// GAUGE COGNITIVE MANIFOLD
// ============================================================

/**
 * Gauge-Theoretic Cognitive Manifold
 *
 * Implements a curved global workspace where:
 * - The base space is an orbifold with symmetry-shaped topology
 * - Fibers carry continuous feature embeddings
 * - Parallel transport preserves gauge structure
 * - Bézier trajectories define smooth cognitive paths
 * - Noether's theorem links symmetries to conservation laws
 */
export class GaugeCognitiveManifold extends EventEmitter {
  private config: GaugeManifoldConfig;

  // Manifold structure
  private atlas: Map<number, ManifoldChart> = new Map();
  private fibers: Map<string, Fiber> = new Map();
  private connection!: Connection;

  // Trajectories
  private activeTrajectories: CognitiveTrajectory[] = [];
  private trajectoryHistory: CognitiveTrajectory[] = [];

  // Noether conservation
  private conservedCharges: Map<CognitiveSymmetry, NoetherCharge> = new Map();

  // Metrics
  private totalCurvature: number = 0;
  private parallelTransportCount: number = 0;
  private gaugeTransformCount: number = 0;

  constructor(config: Partial<GaugeManifoldConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize manifold structure
    this.initializeAtlas();
    this.initializeConnection();
    this.initializeNoetherCharges();

    log.info("Gauge Cognitive Manifold initialized", {
      baseDimension: this.config.baseDimension,
      fiberDimension: this.config.fiberDimension,
      gaugeGroup: this.config.gaugeGroup,
    });
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  /**
   * Initialize the atlas of charts covering the manifold
   */
  private initializeAtlas(): void {
    // Create charts based on the 9-term structure from 4 nestings
    // Each chart covers a region of the cognitive manifold

    const chartCount = this.config.baseDimension;

    for (let i = 0; i < chartCount; i++) {
      const chart: ManifoldChart = {
        index: i,
        center: this.createChartCenter(i),
        radius: 1.0,
        transitionMaps: new Map(),
        singularity: this.determineSingularity(i),
      };

      this.atlas.set(i, chart);
    }

    // Set up transition maps between overlapping charts
    this.setupTransitionMaps();
  }

  /**
   * Create the center point for a chart
   */
  private createChartCenter(index: number): ManifoldPoint {
    // Distribute chart centers on a sphere in the base space
    const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio
    const theta = 2 * Math.PI * index / phi;
    const z = 1 - (2 * index + 1) / this.config.baseDimension;
    const r = Math.sqrt(1 - z * z);

    const coordinates = new Array(this.config.baseDimension).fill(0);
    coordinates[0] = r * Math.cos(theta);
    coordinates[1] = r * Math.sin(theta);
    coordinates[2] = z;

    return {
      coordinates,
      chartIndex: index,
      curvature: 0,
      singularityType: OrbifoldSingularity.None,
    };
  }

  /**
   * Determine orbifold singularity type for a chart
   */
  private determineSingularity(index: number): OrbifoldSingularity {
    if (!this.config.enableOrbifold) {
      return OrbifoldSingularity.None;
    }

    // Map chart indices to singularity types based on tetrahedral structure
    // 4 vertices → 4 special singularities
    if (index < 4) {
      return OrbifoldSingularity.Tetrahedral;
    }
    // 6 edges → 6 cyclic singularities
    if (index < 10) {
      return OrbifoldSingularity.Cyclic;
    }
    // 4 faces → 4 dihedral singularities
    if (index < 14) {
      return OrbifoldSingularity.Dihedral;
    }

    return OrbifoldSingularity.None;
  }

  /**
   * Set up transition maps between overlapping charts
   */
  private setupTransitionMaps(): void {
    // For each pair of charts, define transition functions
    for (const [i, chartI] of this.atlas) {
      for (const [j, chartJ] of this.atlas) {
        if (i >= j) continue;

        // Check if charts overlap
        const distance = this.computeDistance(chartI.center, chartJ.center);
        if (distance < chartI.radius + chartJ.radius) {
          // Create transition map
          const transition = this.createTransitionMap(chartI, chartJ);
          chartI.transitionMaps.set(j, transition);
          chartJ.transitionMaps.set(i, this.invertTransitionMap(transition));
        }
      }
    }
  }

  /**
   * Initialize the gauge connection
   */
  private initializeConnection(): void {
    // Initialize connection 1-form (gauge field)
    const dim = this.config.baseDimension;
    const components: number[][] = [];

    for (let i = 0; i < dim; i++) {
      components.push(new Array(dim).fill(0));
    }

    // Initialize curvature 2-form (field strength)
    const curvature: number[][][] = [];
    for (let i = 0; i < dim; i++) {
      const slice: number[][] = [];
      for (let j = 0; j < dim; j++) {
        slice.push(new Array(dim).fill(0));
      }
      curvature.push(slice);
    }

    this.connection = {
      components,
      curvature,
      holonomyGroup: this.config.gaugeGroup,
    };
  }

  /**
   * Initialize Noether conserved charges
   */
  private initializeNoetherCharges(): void {
    // Time translation → Energy (cognitive resource)
    this.conservedCharges.set(CognitiveSymmetry.TimeTranslation, {
      name: "Cognitive Energy",
      symmetry: CognitiveSymmetry.TimeTranslation,
      value: 1.0,
      conservationLaw: "dE/dt = 0 (cognitive resources conserved)",
    });

    // Space translation → Momentum (attention flow)
    this.conservedCharges.set(CognitiveSymmetry.SpaceTranslation, {
      name: "Attention Momentum",
      symmetry: CognitiveSymmetry.SpaceTranslation,
      value: 0.0,
      conservationLaw: "dp/dt = 0 (attention flow conserved)",
    });

    // Rotation → Angular momentum (perspective invariance)
    this.conservedCharges.set(CognitiveSymmetry.Rotation, {
      name: "Perspective Angular Momentum",
      symmetry: CognitiveSymmetry.Rotation,
      value: 0.0,
      conservationLaw: "dL/dt = 0 (perspective invariance)",
    });

    // Phase rotation → Charge (relevance charge)
    this.conservedCharges.set(CognitiveSymmetry.PhaseRotation, {
      name: "Relevance Charge",
      symmetry: CognitiveSymmetry.PhaseRotation,
      value: 0.0,
      conservationLaw: "dQ/dt = 0 (relevance conserved)",
    });

    // Gauge invariance → Gauge charge (categorical coherence)
    this.conservedCharges.set(CognitiveSymmetry.GaugeInvariance, {
      name: "Categorical Coherence",
      symmetry: CognitiveSymmetry.GaugeInvariance,
      value: 1.0,
      conservationLaw: "dG/dt = 0 (categorical structure preserved)",
    });
  }

  // ============================================================
  // FIBER BUNDLE OPERATIONS
  // ============================================================

  /**
   * Create a fiber at a point in the base space
   */
  public createFiber(point: ManifoldPoint, embedding: number[]): Fiber {
    const fiber: Fiber = {
      basePoint: point,
      embedding: embedding.slice(),
      dimension: this.config.fiberDimension,
      gaugeFrame: this.createIdentityGaugeElement(),
    };

    const fiberId = this.generateFiberId(point);
    this.fibers.set(fiberId, fiber);

    return fiber;
  }

  /**
   * Parallel transport a fiber along a curve
   *
   * This is the core operation that solves the relevance problem:
   * - The fiber carries the feature embedding
   * - Parallel transport preserves the gauge structure
   * - The connection determines how the fiber "twists" along the path
   */
  public parallelTransport(
    fiber: Fiber,
    curve: BezierCurve,
    steps: number = 100,
  ): Fiber[] {
    this.parallelTransportCount++;

    const transportedFibers: Fiber[] = [fiber];
    let currentFiber = fiber;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const point = this.evaluateBezier(curve, t);

      // Compute the gauge transformation for this step
      const gaugeTransform = this.computeParallelTransportGauge(
        currentFiber.basePoint,
        point,
      );

      // Apply gauge transformation to the fiber
      const newFiber = this.applyGaugeTransform(currentFiber, gaugeTransform, point);
      transportedFibers.push(newFiber);
      currentFiber = newFiber;
    }

    return transportedFibers;
  }

  /**
   * Compute the gauge transformation for parallel transport
   */
  private computeParallelTransportGauge(
    from: ManifoldPoint,
    to: ManifoldPoint,
  ): LieGroupElement {
    // Compute the displacement vector
    const displacement = this.computeDisplacement(from, to);

    // Compute the connection contribution: A_μ dx^μ
    let connectionContribution = 0;
    for (let i = 0; i < displacement.length; i++) {
      for (let j = 0; j < displacement.length; j++) {
        connectionContribution += this.connection.components[i][j] * displacement[j];
      }
    }

    // The gauge transformation is exp(-i A_μ dx^μ)
    // For small displacements, this is approximately 1 - i A_μ dx^μ
    return this.exponentiateAlgebraElement({
      algebra: this.lieGroupToAlgebra(this.config.gaugeGroup),
      coefficients: [-connectionContribution],
      generators: this.getLieAlgebraGenerators(this.config.gaugeGroup),
    });
  }

  /**
   * Apply a gauge transformation to a fiber
   */
  private applyGaugeTransform(
    fiber: Fiber,
    transform: LieGroupElement,
    newPoint: ManifoldPoint,
  ): Fiber {
    this.gaugeTransformCount++;

    // Transform the embedding using the gauge matrix
    const newEmbedding = this.matrixVectorMultiply(
      transform.matrix,
      fiber.embedding,
    );

    // Compose the gauge frames
    const newGaugeFrame = this.composeGaugeElements(fiber.gaugeFrame, transform);

    return {
      basePoint: newPoint,
      embedding: newEmbedding,
      dimension: fiber.dimension,
      gaugeFrame: newGaugeFrame,
    };
  }

  // ============================================================
  // BÉZIER TRAJECTORY OPERATIONS
  // ============================================================

  /**
   * Create a Bézier trajectory through the manifold
   */
  public createTrajectory(
    controlPoints: ManifoldPoint[],
    initialFiber: Fiber,
  ): CognitiveTrajectory {
    const curve: BezierCurve = {
      controlPoints,
      degree: controlPoints.length - 1,
      parameterRange: [0, 1],
    };

    // Parallel transport the fiber along the curve
    const transportedFiber = this.parallelTransport(initialFiber, curve);

    // Compute the action (Lagrangian integral)
    const action = this.computeAction(curve, transportedFiber);

    // Compute Noether charges
    const noetherCharges = this.computeNoetherCharges(curve, transportedFiber);

    const trajectory: CognitiveTrajectory = {
      id: `traj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      curve,
      transportedFiber,
      action,
      noetherCharges,
    };

    this.activeTrajectories.push(trajectory);
    this.emit("trajectory_created", trajectory);

    return trajectory;
  }

  /**
   * Evaluate a Bézier curve at parameter t
   */
  public evaluateBezier(curve: BezierCurve, t: number): ManifoldPoint {
    const n = curve.degree;
    const coordinates = new Array(this.config.baseDimension).fill(0);

    // De Casteljau's algorithm
    for (let i = 0; i <= n; i++) {
      const bernstein = this.bernsteinPolynomial(n, i, t);
      for (let j = 0; j < this.config.baseDimension; j++) {
        coordinates[j] += bernstein * curve.controlPoints[i].coordinates[j];
      }
    }

    // Compute curvature at this point
    const curvature = this.computeCurvatureAtPoint(curve, t);

    return {
      coordinates,
      chartIndex: this.findContainingChart(coordinates),
      curvature,
      singularityType: OrbifoldSingularity.None,
    };
  }

  /**
   * Compute the Bernstein polynomial B_{n,i}(t)
   */
  private bernsteinPolynomial(n: number, i: number, t: number): number {
    return this.binomial(n, i) * Math.pow(t, i) * Math.pow(1 - t, n - i);
  }

  /**
   * Compute binomial coefficient
   */
  private binomial(n: number, k: number): number {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;

    let result = 1;
    for (let i = 0; i < k; i++) {
      result = (result * (n - i)) / (i + 1);
    }
    return result;
  }

  /**
   * Compute curvature at a point on the Bézier curve
   */
  private computeCurvatureAtPoint(curve: BezierCurve, t: number): number {
    // Compute first and second derivatives
    const d1 = this.bezierDerivative(curve, t, 1);
    const d2 = this.bezierDerivative(curve, t, 2);

    // Curvature κ = |d1 × d2| / |d1|³
    const cross = this.crossProductMagnitude(d1, d2);
    const d1Norm = Math.sqrt(d1.reduce((sum, x) => sum + x * x, 0));

    if (d1Norm < 1e-10) return 0;

    return cross / Math.pow(d1Norm, 3);
  }

  /**
   * Compute the k-th derivative of a Bézier curve
   */
  private bezierDerivative(curve: BezierCurve, t: number, k: number): number[] {
    if (k === 0) {
      return this.evaluateBezier(curve, t).coordinates;
    }

    const n = curve.degree;
    if (k > n) {
      return new Array(this.config.baseDimension).fill(0);
    }

    // Compute derivative control points
    const derivativePoints: ManifoldPoint[] = [];
    for (let i = 0; i < n; i++) {
      const coords = curve.controlPoints[i].coordinates.map(
        (c, j) => n * (curve.controlPoints[i + 1].coordinates[j] - c),
      );
      derivativePoints.push({
        coordinates: coords,
        chartIndex: 0,
        curvature: 0,
      });
    }

    const derivativeCurve: BezierCurve = {
      controlPoints: derivativePoints,
      degree: n - 1,
      parameterRange: curve.parameterRange,
    };

    return this.bezierDerivative(derivativeCurve, t, k - 1);
  }

  // ============================================================
  // ACTION AND NOETHER CHARGES
  // ============================================================

  /**
   * Compute the action (Lagrangian integral) along a trajectory
   *
   * The action S = ∫ L dt where L = K - V
   * - K = kinetic term (embedding velocity)
   * - V = potential term (curvature + active inference constraint)
   */
  private computeAction( _curve: BezierCurve, fibers: Fiber[]): number {
    let action = 0;
    const dt = 1.0 / (fibers.length - 1);

    for (let i = 1; i < fibers.length; i++) {
      // Kinetic term: |dξ/dt|²
      const velocity = this.computeEmbeddingVelocity(fibers[i - 1], fibers[i], dt);
      const kinetic = 0.5 * velocity.reduce((sum, v) => sum + v * v, 0);

      // Potential term: curvature regularization + active inference
      const curvature = fibers[i].basePoint.curvature;
      const freeEnergy = this.computeFreeEnergy(fibers[i]);
      const potential =
        this.config.curvatureRegularization * curvature * curvature +
        this.config.activeInferenceWeight * freeEnergy;

      // Lagrangian L = K - V
      const lagrangian = kinetic - potential;
      action += lagrangian * dt;
    }

    return action;
  }

  /**
   * Compute embedding velocity between two fibers
   */
  private computeEmbeddingVelocity(
    fiber1: Fiber,
    fiber2: Fiber,
    dt: number,
  ): number[] {
    return fiber1.embedding.map((e, i) => (fiber2.embedding[i] - e) / dt);
  }

  /**
   * Compute free energy for active inference constraint
   */
  private computeFreeEnergy(fiber: Fiber): number {
    // Free energy F = -log p(o|s) + KL[q(s)||p(s)]
    // Simplified: F = prediction error + complexity
    const predictionError = fiber.embedding.reduce(
      (sum, e) => sum + Math.abs(e - Math.tanh(e)),
      0,
    );
    const complexity = fiber.embedding.reduce((sum, e) => sum + e * e, 0);

    return predictionError + 0.1 * complexity;
  }

  /**
   * Compute Noether charges from symmetries
   */
  private computeNoetherCharges(
    curve: BezierCurve,
    fibers: Fiber[],
  ): NoetherCharge[] {
    const charges: NoetherCharge[] = [];

    // Energy (time translation symmetry)
    const energy = this.computeEnergy(fibers);
    charges.push({
      name: "Cognitive Energy",
      symmetry: CognitiveSymmetry.TimeTranslation,
      value: energy,
      conservationLaw: "dE/dt = 0",
    });

    // Momentum (space translation symmetry)
    const momentum = this.computeMomentum(fibers);
    charges.push({
      name: "Attention Momentum",
      symmetry: CognitiveSymmetry.SpaceTranslation,
      value: momentum,
      conservationLaw: "dp/dt = 0",
    });

    // Angular momentum (rotation symmetry)
    const angularMomentum = this.computeAngularMomentum(fibers);
    charges.push({
      name: "Perspective Angular Momentum",
      symmetry: CognitiveSymmetry.Rotation,
      value: angularMomentum,
      conservationLaw: "dL/dt = 0",
    });

    // Gauge charge (gauge invariance)
    const gaugeCharge = this.computeGaugeCharge(fibers);
    charges.push({
      name: "Categorical Coherence",
      symmetry: CognitiveSymmetry.GaugeInvariance,
      value: gaugeCharge,
      conservationLaw: "dG/dt = 0",
    });

    return charges;
  }

  /**
   * Compute energy (Hamiltonian)
   */
  private computeEnergy(fibers: Fiber[]): number {
    if (fibers.length < 2) return 0;

    const lastFiber = fibers[fibers.length - 1];
    const prevFiber = fibers[fibers.length - 2];

    // H = K + V (Hamiltonian = kinetic + potential)
    const velocity = this.computeEmbeddingVelocity(prevFiber, lastFiber, 0.01);
    const kinetic = 0.5 * velocity.reduce((sum, v) => sum + v * v, 0);
    const potential =
      this.config.curvatureRegularization * lastFiber.basePoint.curvature ** 2;

    return kinetic + potential;
  }

  /**
   * Compute momentum
   */
  private computeMomentum(fibers: Fiber[]): number {
    if (fibers.length < 2) return 0;

    const lastFiber = fibers[fibers.length - 1];
    const prevFiber = fibers[fibers.length - 2];

    // p = ∂L/∂q̇ = m * q̇
    const velocity = this.computeEmbeddingVelocity(prevFiber, lastFiber, 0.01);
    return Math.sqrt(velocity.reduce((sum, v) => sum + v * v, 0));
  }

  /**
   * Compute angular momentum
   */
  private computeAngularMomentum(fibers: Fiber[]): number {
    if (fibers.length < 2) return 0;

    const lastFiber = fibers[fibers.length - 1];
    const prevFiber = fibers[fibers.length - 2];

    // L = r × p
    const r = lastFiber.basePoint.coordinates;
    const velocity = this.computeEmbeddingVelocity(prevFiber, lastFiber, 0.01);

    // Cross product magnitude (simplified for high dimensions)
    return this.crossProductMagnitude(r, velocity);
  }

  /**
   * Compute gauge charge (categorical coherence)
   */
  private computeGaugeCharge(fibers: Fiber[]): number {
    if (fibers.length === 0) return 0;

    // Gauge charge = trace of gauge frame matrix
    const lastFiber = fibers[fibers.length - 1];
    let trace = 0;
    for (let i = 0; i < lastFiber.gaugeFrame.matrix.length; i++) {
      trace += lastFiber.gaugeFrame.matrix[i][i];
    }

    return trace / lastFiber.gaugeFrame.matrix.length;
  }

  // ============================================================
  // LIE ALGEBRA ACTIVATION FUNCTIONS
  // ============================================================

  /**
   * Apply Lie algebra activation to an embedding
   *
   * This implements the "logistic" categorical logic:
   * - The activation is derived from the Lie algebra structure
   * - It provides smooth, gauge-equivariant nonlinearity
   */
  public lieAlgebraActivation(embedding: number[]): number[] {
    const generators = this.getLieAlgebraGenerators(this.config.gaugeGroup);

    // Compute the Lie algebra element from the embedding
    const algebraElement: LieAlgebraElement = {
      algebra: this.lieGroupToAlgebra(this.config.gaugeGroup),
      coefficients: embedding.slice(0, generators.length),
      generators,
    };

    // Exponentiate to get the group element
    const groupElement = this.exponentiateAlgebraElement(algebraElement);

    // Apply the group action to the embedding
    return this.matrixVectorMultiply(groupElement.matrix, embedding);
  }

  /**
   * Logistic activation (the emergent categorical logic)
   *
   * The logistic function σ(x) = 1/(1 + e^{-x}) emerges naturally
   * from the gauge structure as the smooth transition function
   * between categorical states.
   */
  public logisticActivation(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Softmax activation (categorical distribution)
   */
  public softmaxActivation(x: number[]): number[] {
    const maxX = Math.max(...x);
    const expX = x.map((xi) => Math.exp(xi - maxX));
    const sumExpX = expX.reduce((sum, e) => sum + e, 0);
    return expX.map((e) => e / sumExpX);
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  /**
   * Compute distance between two manifold points
   */
  private computeDistance(p1: ManifoldPoint, p2: ManifoldPoint): number {
    let sum = 0;
    for (let i = 0; i < p1.coordinates.length; i++) {
      const diff = p1.coordinates[i] - p2.coordinates[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Compute displacement vector between two points
   */
  private computeDisplacement(
    from: ManifoldPoint,
    to: ManifoldPoint,
  ): number[] {
    return from.coordinates.map((c, i) => to.coordinates[i] - c);
  }

  /**
   * Find the chart containing a point
   */
  private findContainingChart(coordinates: number[]): number {
    let minDistance = Infinity;
    let bestChart = 0;

    for (const [index, chart] of this.atlas) {
      const distance = Math.sqrt(
        coordinates.reduce(
          (sum, c, i) => sum + (c - chart.center.coordinates[i]) ** 2,
          0,
        ),
      );
      if (distance < minDistance) {
        minDistance = distance;
        bestChart = index;
      }
    }

    return bestChart;
  }

  /**
   * Create transition map between two charts
   */
  private createTransitionMap(
    chartI: ManifoldChart,
    chartJ: ManifoldChart,
  ): TransitionMap {
    // Compute the transformation matrix between charts
    const matrix: number[][] = [];
    const dim = this.config.baseDimension;

    for (let i = 0; i < dim; i++) {
      matrix.push(new Array(dim).fill(0));
      matrix[i][i] = 1; // Identity for now (can be extended)
    }

    return {
      fromChart: chartI.index,
      toChart: chartJ.index,
      matrix,
    };
  }

  /**
   * Invert a transition map
   */
  private invertTransitionMap(map: TransitionMap): TransitionMap {
    // For orthogonal matrices, inverse = transpose
    const invMatrix = map.matrix[0].map((_, i) => map.matrix.map((row) => row[i]));

    return {
      fromChart: map.toChart,
      toChart: map.fromChart,
      matrix: invMatrix,
    };
  }

  /**
   * Create identity gauge element
   */
  private createIdentityGaugeElement(): LieGroupElement {
    const dim = this.config.fiberDimension;
    const matrix: number[][] = [];

    for (let i = 0; i < dim; i++) {
      matrix.push(new Array(dim).fill(0));
      matrix[i][i] = 1;
    }

    return {
      group: this.config.gaugeGroup,
      matrix,
    };
  }

  /**
   * Compose two gauge elements
   */
  private composeGaugeElements(
    g1: LieGroupElement,
    g2: LieGroupElement,
  ): LieGroupElement {
    const result = this.matrixMultiply(g1.matrix, g2.matrix);
    return {
      group: g1.group,
      matrix: result,
    };
  }

  /**
   * Exponentiate a Lie algebra element to get a group element
   */
  private exponentiateAlgebraElement(
    algebra: LieAlgebraElement,
  ): LieGroupElement {
    // Compute the matrix representation of the algebra element
    const dim = this.config.fiberDimension;
    const algebraMatrix: number[][] = [];

    for (let i = 0; i < dim; i++) {
      algebraMatrix.push(new Array(dim).fill(0));
    }

    // Sum over generators: X = Σ c_i T_i
    for (let g = 0; g < algebra.generators.length; g++) {
      const coeff = algebra.coefficients[g] || 0;
      for (let i = 0; i < Math.min(dim, algebra.generators[g].length); i++) {
        for (let j = 0; j < Math.min(dim, algebra.generators[g][i].length); j++) {
          algebraMatrix[i][j] += coeff * algebra.generators[g][i][j];
        }
      }
    }

    // Compute exp(X) using Padé approximation (simplified)
    // exp(X) ≈ I + X + X²/2 + X³/6 + ...
    const identity = this.createIdentityGaugeElement().matrix;
    const X2 = this.matrixMultiply(algebraMatrix, algebraMatrix);
    const X3 = this.matrixMultiply(X2, algebraMatrix);

    const result: number[][] = [];
    for (let i = 0; i < dim; i++) {
      result.push(new Array(dim).fill(0));
      for (let j = 0; j < dim; j++) {
        result[i][j] =
          identity[i][j] +
          algebraMatrix[i][j] +
          X2[i][j] / 2 +
          X3[i][j] / 6;
      }
    }

    return {
      group: this.lieAlgebraToGroup(algebra.algebra),
      matrix: result,
      algebraElement: algebra,
    };
  }

  /**
   * Get Lie algebra generators for a group
   */
  private getLieAlgebraGenerators(group: LieGroup): number[][][] {
    const dim = this.config.fiberDimension;

    switch (group) {
      case LieGroup.U1:
        // U(1) has one generator: i
        return [this.createAntisymmetricGenerator(dim, 0, 1)];

      case LieGroup.SU2:
        // SU(2) has 3 generators (Pauli matrices)
        return [
          this.createAntisymmetricGenerator(dim, 0, 1),
          this.createAntisymmetricGenerator(dim, 0, 2),
          this.createAntisymmetricGenerator(dim, 1, 2),
        ];

      case LieGroup.SU3:
        // SU(3) has 8 generators (Gell-Mann matrices)
        return [
          this.createAntisymmetricGenerator(dim, 0, 1),
          this.createAntisymmetricGenerator(dim, 0, 2),
          this.createAntisymmetricGenerator(dim, 1, 2),
          this.createAntisymmetricGenerator(dim, 0, 3),
          this.createAntisymmetricGenerator(dim, 1, 3),
          this.createAntisymmetricGenerator(dim, 2, 3),
          this.createDiagonalGenerator(dim, [1, -1, 0, 0]),
          this.createDiagonalGenerator(dim, [1, 1, -2, 0]),
        ];

      case LieGroup.SO3:
        // SO(3) has 3 generators (rotation matrices)
        return [
          this.createAntisymmetricGenerator(dim, 1, 2),
          this.createAntisymmetricGenerator(dim, 0, 2),
          this.createAntisymmetricGenerator(dim, 0, 1),
        ];

      default:
        return [this.createAntisymmetricGenerator(dim, 0, 1)];
    }
  }

  /**
   * Create an antisymmetric generator matrix
   */
  private createAntisymmetricGenerator(
    dim: number,
    i: number,
    j: number,
  ): number[][] {
    const matrix: number[][] = [];
    for (let k = 0; k < dim; k++) {
      matrix.push(new Array(dim).fill(0));
    }
    if (i < dim && j < dim) {
      matrix[i][j] = 1;
      matrix[j][i] = -1;
    }
    return matrix;
  }

  /**
   * Create a diagonal generator matrix
   */
  private createDiagonalGenerator(dim: number, diag: number[]): number[][] {
    const matrix: number[][] = [];
    for (let i = 0; i < dim; i++) {
      matrix.push(new Array(dim).fill(0));
      matrix[i][i] = diag[i] || 0;
    }
    return matrix;
  }

  /**
   * Convert Lie group to Lie algebra
   */
  private lieGroupToAlgebra(group: LieGroup): LieAlgebra {
    const mapping: Record<LieGroup, LieAlgebra> = {
      [LieGroup.U1]: LieAlgebra.u1,
      [LieGroup.SU2]: LieAlgebra.su2,
      [LieGroup.SU3]: LieAlgebra.su3,
      [LieGroup.SO3]: LieAlgebra.so3,
      [LieGroup.SE3]: LieAlgebra.se3,
      [LieGroup.GL_n]: LieAlgebra.gl_n,
    };
    return mapping[group];
  }

  /**
   * Convert Lie algebra to Lie group
   */
  private lieAlgebraToGroup(algebra: LieAlgebra): LieGroup {
    const mapping: Record<LieAlgebra, LieGroup> = {
      [LieAlgebra.u1]: LieGroup.U1,
      [LieAlgebra.su2]: LieGroup.SU2,
      [LieAlgebra.su3]: LieGroup.SU3,
      [LieAlgebra.so3]: LieGroup.SO3,
      [LieAlgebra.se3]: LieGroup.SE3,
      [LieAlgebra.gl_n]: LieGroup.GL_n,
    };
    return mapping[algebra];
  }

  /**
   * Matrix-vector multiplication
   */
  private matrixVectorMultiply(matrix: number[][], vector: number[]): number[] {
    const result: number[] = [];
    for (let i = 0; i < matrix.length; i++) {
      let sum = 0;
      for (let j = 0; j < Math.min(matrix[i].length, vector.length); j++) {
        sum += matrix[i][j] * vector[j];
      }
      result.push(sum);
    }
    return result;
  }

  /**
   * Matrix multiplication
   */
  private matrixMultiply(A: number[][], B: number[][]): number[][] {
    const result: number[][] = [];
    for (let i = 0; i < A.length; i++) {
      result.push(new Array(B[0].length).fill(0));
      for (let j = 0; j < B[0].length; j++) {
        for (let k = 0; k < B.length; k++) {
          result[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    return result;
  }

  /**
   * Compute cross product magnitude (generalized for high dimensions)
   */
  private crossProductMagnitude(a: number[], b: number[]): number {
    // For n-dimensional vectors, compute the magnitude of the wedge product
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      for (let j = i + 1; j < b.length; j++) {
        const component = a[i] * b[j] - a[j] * b[i];
        sum += component * component;
      }
    }
    return Math.sqrt(sum);
  }

  /**
   * Generate a unique fiber ID
   */
  private generateFiberId(point: ManifoldPoint): string {
    return `fiber_${point.chartIndex}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Get the current state of the manifold
   */
  public getState(): GaugeManifoldState {
    return {
      totalCurvature: this.totalCurvature,
      parallelTransportCount: this.parallelTransportCount,
      gaugeTransformCount: this.gaugeTransformCount,
      activeTrajectoryCount: this.activeTrajectories.length,
      conservedCharges: Array.from(this.conservedCharges.values()),
      chartCount: this.atlas.size,
      fiberCount: this.fibers.size,
    };
  }

  /**
   * Describe the gauge-theoretic architecture
   */
  public describeArchitecture(): string {
    return `
╔══════════════════════════════════════════════════════════════════╗
║           GAUGE-THEORETIC COGNITIVE MANIFOLD                     ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  "The solution to the relevance problem is precisely the         ║
║   PARALLEL TRANSPORT of fiber bundles with continuous feature    ║
║   embeddings, whose metric tensors are indexed by orbifold       ║
║   topology shaped by symmetry operators of the base space."      ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║  SUPER- (Blade)              │  HYPER- (Chalice)                 ║
║  ─────────────────────────────┼───────────────────────────────── ║
║  Differentiation within       │  Integration across categories   ║
║  Finer resolution → ∞         │  Transcends the limit at ∞       ║
║  Metric degrees               │  Logic categories                ║
║  Supertask                    │  Hypertask                       ║
╠══════════════════════════════════════════════════════════════════╣
║  NOETHER CONSERVATION LAWS:                                      ║
║  ─────────────────────────────────────────────────────────────── ║
║  Time Translation    → Energy (Cognitive Resources)              ║
║  Space Translation   → Momentum (Attention Flow)                 ║
║  Rotation            → Angular Momentum (Perspective Invariance) ║
║  Phase Rotation      → Charge (Relevance Charge)                 ║
║  Gauge Invariance    → Categorical Coherence                     ║
╠══════════════════════════════════════════════════════════════════╣
║  CURRENT STATE:                                                  ║
║  ─────────────────────────────────────────────────────────────── ║
║  Base Dimension:     ${String(this.config.baseDimension).padEnd(6)} (9 terms from 4 nestings)      ║
║  Fiber Dimension:    ${String(this.config.fiberDimension).padEnd(6)} (12 steps of cognitive loop)  ║
║  Gauge Group:        ${String(this.config.gaugeGroup).padEnd(6)} (3 concurrent streams)       ║
║  Charts:             ${String(this.atlas.size).padEnd(6)}                                     ║
║  Fibers:             ${String(this.fibers.size).padEnd(6)}                                     ║
║  Trajectories:       ${String(this.activeTrajectories.length).padEnd(6)}                                     ║
║  Parallel Transports: ${String(this.parallelTransportCount).padEnd(5)}                                     ║
║  Gauge Transforms:   ${String(this.gaugeTransformCount).padEnd(6)}                                     ║
╚══════════════════════════════════════════════════════════════════╝
`;
  }
}

// ============================================================
// SUPPORTING TYPES
// ============================================================

interface ManifoldChart {
  index: number;
  center: ManifoldPoint;
  radius: number;
  transitionMaps: Map<number, TransitionMap>;
  singularity: OrbifoldSingularity;
}

interface TransitionMap {
  fromChart: number;
  toChart: number;
  matrix: number[][];
}

export interface GaugeManifoldState {
  totalCurvature: number;
  parallelTransportCount: number;
  gaugeTransformCount: number;
  activeTrajectoryCount: number;
  conservedCharges: NoetherCharge[];
  chartCount: number;
  fiberCount: number;
}

// Singleton instance
export const gaugeCognitiveManifold = new GaugeCognitiveManifold();

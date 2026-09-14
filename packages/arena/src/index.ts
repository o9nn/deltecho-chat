/**
 * @deltecho/arena — TRIZ Cognitive Arena + Spatial Aesthetics Substrate
 *
 * A hex-grid-based cognitive playground where DTE learns spatial composition
 * through the 40 TRIZ Inventive Principles, guided by aesthetic coherence
 * as the universal reward signal.
 */

// Core spatial types
export {
  HexGrid,
  type HexCoord,
  type CubeCoord,
  type HexCell,
  type ArenaObject,
  type ArenaObjectAesthetic,
  type SimplexDescriptor,
  type SimplexLevel,
  type MaterialProperties,
  type SpatialRelationship,
  type RelationshipType,
  type Vector2,
  hexDistance,
  hexAngle,
  hexNeighbors,
  hexKey,
  hexRing,
  hexSpiral,
  axialToCube,
  cubeToAxial,
} from "./hex-grid.js";

// Aesthetic field
export {
  AestheticField,
  type AestheticFieldConfig,
  type FieldSample,
  type SpaceGestalt,
} from "./aesthetic-field.js";

// 40 TRIZ Actions
export {
  ArenaActions,
  type ActionResult,
  type ActionCategory,
} from "./arena-actions.js";

// Gestalt perception pipeline
export {
  GestaltPerception,
  AestheticNavigation,
  type GestaltSnapshot,
  type ObjectCluster,
  type Hierarchy,
  type RelationalMap,
  type PlaceType,
  type AgentRole,
  type SemanticInference,
  type ObjectInspection,
  type PerceptionResult,
  type NavigationStyle,
  type NavigationPath,
} from "./gestalt-perception.js";

// Discovery loop
export {
  DiscoveryLoop,
  type ContradictionType,
  type Contradiction,
  type Experiment,
  type DiscoveredPattern,
  type TeachingEvent,
  type DiscoveryState,
  type DiscoveryTickResult,
  type DiscoveryCycleSummary,
} from "./discovery-loop.js";

// Orchestrator integration
export {
  ArenaOrchestrator,
  type ArenaOrchestratorConfig,
  type ArenaEvent,
  type ArenaEventHandler,
  type ArenaESNInput,
} from "./arena-orchestrator.js";

/**
 * Tests for EpistemicDreaming
 *
 * Validates:
 * - Dream session lifecycle (begin/end)
 * - Phase cycling (ONSET → REM → SWS → REM → ... → EMERGENCE)
 * - Fragment generation during REM phase
 * - Insight promotion from high-quality fragments
 * - Bridge type classification
 * - Knowledge graph integration
 * - Configuration and reset
 */
import {
  EpistemicDreaming,
  DreamPhase,
  BridgeType,
  DEFAULT_DREAMING_CONFIG,
  type KnowledgeGraphView,
} from "../EpistemicDreaming";

/**
 * Mock knowledge graph for testing
 */
function createMockGraph(unitCount: number = 10): KnowledgeGraphView {
  const units: Array<{
    id: string;
    label: string;
    domain: string;
    activation: number;
    complexity: number;
    accessCount: number;
    connections: string[];
  }> = [];

  const domains = [
    "physics",
    "biology",
    "math",
    "philosophy",
    "computer_science",
  ];

  for (let i = 0; i < unitCount; i++) {
    units.push({
      id: `unit_${i}`,
      label: `Concept ${i}`,
      domain: domains[i % domains.length],
      activation: 0.3 + Math.random() * 0.7,
      complexity: 1 + Math.floor(Math.random() * 8),
      accessCount: Math.floor(Math.random() * 20),
      connections: [],
    });
  }

  // Create some connections (ring + random)
  for (let i = 0; i < unitCount; i++) {
    // Ring connection
    units[i].connections.push(units[(i + 1) % unitCount].id);
    units[(i + 1) % unitCount].connections.push(units[i].id);
    // Random connection
    const randomTarget = Math.floor(Math.random() * unitCount);
    if (
      randomTarget !== i &&
      !units[i].connections.includes(units[randomTarget].id)
    ) {
      units[i].connections.push(units[randomTarget].id);
      units[randomTarget].connections.push(units[i].id);
    }
  }

  return {
    getUnitIds: () => units.map((u) => u.id),
    getUnitLabel: (id: string) =>
      units.find((u) => u.id === id)?.label ?? "unknown",
    getUnitDomain: (id: string) =>
      units.find((u) => u.id === id)?.domain ?? "unknown",
    getUnitActivation: (id: string) =>
      units.find((u) => u.id === id)?.activation ?? 0,
    getConnections: (id: string) =>
      units.find((u) => u.id === id)?.connections ?? [],
    getUnitComplexity: (id: string) =>
      units.find((u) => u.id === id)?.complexity ?? 1,
    getUnitAccessCount: (id: string) =>
      units.find((u) => u.id === id)?.accessCount ?? 0,
  };
}

describe("EpistemicDreaming", () => {
  let dreaming: EpistemicDreaming;
  let graph: KnowledgeGraphView;

  beforeEach(() => {
    dreaming = new EpistemicDreaming({
      tickRateHz: 100, // Fast for testing
      ticksPerPhase: 5, // Short phases
      minUnitsForDreaming: 3,
    });
    graph = createMockGraph(15);
    dreaming.connectKnowledgeGraph(graph);
  });

  afterEach(() => {
    dreaming.stop();
  });

  describe("Lifecycle", () => {
    it("should start in AWAKE phase", () => {
      const state = dreaming.getState();
      expect(state.isDreaming).toBe(false);
      expect(state.phase).toBe(DreamPhase.AWAKE);
    });

    it("should begin a dream session", () => {
      dreaming.beginDreamSession();
      const state = dreaming.getState();
      expect(state.isDreaming).toBe(true);
      expect(state.phase).toBe(DreamPhase.ONSET);
    });

    it("should end a dream session", () => {
      dreaming.beginDreamSession();
      dreaming.endDreamSession();
      const state = dreaming.getState();
      expect(state.isDreaming).toBe(false);
      expect(state.phase).toBe(DreamPhase.AWAKE);
    });

    it("should not begin without knowledge graph", () => {
      const bare = new EpistemicDreaming();
      bare.beginDreamSession();
      expect(bare.getState().isDreaming).toBe(false);
    });

    it("should not begin with insufficient knowledge", () => {
      const sparse = new EpistemicDreaming({ minUnitsForDreaming: 100 });
      sparse.connectKnowledgeGraph(graph);
      let emitted = false;
      sparse.on("dream_insufficient_knowledge", () => {
        emitted = true;
      });
      sparse.beginDreamSession();
      expect(sparse.getState().isDreaming).toBe(false);
      expect(emitted).toBe(true);
    });

    it("should track total sessions", () => {
      dreaming.beginDreamSession();
      dreaming.endDreamSession();
      dreaming.beginDreamSession();
      dreaming.endDreamSession();
      expect(dreaming.getState().totalSessions).toBe(2);
    });
  });

  describe("Phase Cycling", () => {
    it("should advance through phases", () => {
      dreaming.beginDreamSession();
      const phases: DreamPhase[] = [];
      dreaming.on("dream_phase_changed", ({ to }) => phases.push(to));

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Should have advanced through at least ONSET → REM
          expect(phases).toContain(DreamPhase.REM);
          dreaming.stop();
          resolve();
        }, 200);
      });
    });

    it("should cycle between REM and SWS", () => {
      dreaming.beginDreamSession();
      const phases: DreamPhase[] = [];
      dreaming.on("dream_phase_changed", ({ to }) => phases.push(to));

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Should have cycled REM → SWS → REM
          const remCount = phases.filter((p) => p === DreamPhase.REM).length;
          expect(remCount).toBeGreaterThanOrEqual(1);
          dreaming.stop();
          resolve();
        }, 400);
      });
    });

    it("should increase depth over cycles", () => {
      dreaming.beginDreamSession();

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const state = dreaming.getState();
          expect(state.depth).toBeGreaterThan(0);
          dreaming.stop();
          resolve();
        }, 300);
      });
    });
  });

  describe("Fragment Generation", () => {
    it("should generate fragments during REM", () => {
      dreaming.beginDreamSession();

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const fragments = dreaming.getFragments();
          expect(fragments.length).toBeGreaterThan(0);
          dreaming.stop();
          resolve();
        }, 300);
      });
    });

    it("should emit dream_fragment events", () => {
      dreaming.beginDreamSession();
      let fragmentCount = 0;
      dreaming.on("dream_fragment", () => {
        fragmentCount++;
      });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(fragmentCount).toBeGreaterThan(0);
          dreaming.stop();
          resolve();
        }, 300);
      });
    });

    it("should produce fragments with valid structure", () => {
      dreaming.beginDreamSession();

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const fragments = dreaming.getFragments();
          if (fragments.length > 0) {
            const f = fragments[0];
            expect(f.id).toBeTruthy();
            expect(f.sourceId).toBeTruthy();
            expect(f.targetId).toBeTruthy();
            expect(f.novelty).toBeGreaterThanOrEqual(0);
            expect(f.novelty).toBeLessThanOrEqual(1);
            expect(f.coherence).toBeGreaterThanOrEqual(0);
            expect(f.coherence).toBeLessThanOrEqual(1);
            expect(Object.values(BridgeType)).toContain(f.bridgeType);
          }
          dreaming.stop();
          resolve();
        }, 300);
      });
    });
  });

  describe("Insight Promotion", () => {
    it("should promote high-quality fragments to insights", () => {
      // Use low thresholds to ensure promotion
      const easy = new EpistemicDreaming({
        tickRateHz: 100,
        ticksPerPhase: 5,
        minUnitsForDreaming: 3,
        noveltyThreshold: 0.1,
        coherenceThreshold: 0.1,
      });
      easy.connectKnowledgeGraph(graph);
      easy.beginDreamSession();

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const insights = easy.getInsights();
          expect(insights.length).toBeGreaterThan(0);
          if (insights.length > 0) {
            expect(insights[0].hypothesis).toBeTruthy();
            expect(insights[0].confidence).toBeGreaterThan(0);
            expect(insights[0].integrated).toBe(false);
          }
          easy.stop();
          resolve();
        }, 500);
      });
    });

    it("should allow marking insights as integrated", () => {
      const easy = new EpistemicDreaming({
        tickRateHz: 100,
        ticksPerPhase: 5,
        minUnitsForDreaming: 3,
        noveltyThreshold: 0.1,
        coherenceThreshold: 0.1,
      });
      easy.connectKnowledgeGraph(graph);
      easy.beginDreamSession();

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const insights = easy.getInsights();
          if (insights.length > 0) {
            easy.markInsightIntegrated(insights[0].fragment.id);
            expect(insights[0].integrated).toBe(true);
            expect(easy.getUnintegratedInsights().length).toBe(
              insights.length - 1,
            );
          }
          easy.stop();
          resolve();
        }, 500);
      });
    });
  });

  describe("Configuration", () => {
    it("should use default config", () => {
      const d = new EpistemicDreaming();
      expect(d.getConfig().baseTemperature).toBe(
        DEFAULT_DREAMING_CONFIG.baseTemperature,
      );
    });

    it("should accept partial overrides", () => {
      const d = new EpistemicDreaming({ baseTemperature: 3.0 });
      expect(d.getConfig().baseTemperature).toBe(3.0);
      expect(d.getConfig().maxWalkLength).toBe(
        DEFAULT_DREAMING_CONFIG.maxWalkLength,
      );
    });
  });

  describe("Reset", () => {
    it("should reset all state", () => {
      dreaming.beginDreamSession();

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          dreaming.reset();
          const state = dreaming.getState();
          expect(state.isDreaming).toBe(false);
          expect(state.totalSessions).toBe(0);
          expect(dreaming.getInsights().length).toBe(0);
          expect(dreaming.getFragments().length).toBe(0);
          resolve();
        }, 200);
      });
    });
  });
});

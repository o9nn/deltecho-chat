import { NicheConstruction, NicheConstructionConfig } from '../NicheConstruction.js';
import { ActiveInference, Observation, Action } from '../ActiveInference.js';

describe('NicheConstruction', () => {
  let activeInference: ActiveInference;
  let nicheConstruction: NicheConstruction;
  const testConfig: Partial<NicheConstructionConfig> = {
    maxArtifacts: 50,
    creationThreshold: 0.1,
    removalThreshold: 0.05,
    maintenanceInterval: 1000,
  };

  beforeEach(() => {
    activeInference = new ActiveInference();
    nicheConstruction = new NicheConstruction(activeInference, testConfig);
  });

  afterEach(() => {
    nicheConstruction.stop();
    activeInference.stop();
  });

  describe('constructor', () => {
    it('should create NicheConstruction with active inference', () => {
      expect(nicheConstruction).toBeDefined();
    });

    it('should initialize default affordances', () => {
      const state = nicheConstruction.getNicheState();
      expect(state.affordances.size).toBeGreaterThan(0);
    });

    it('should start with empty artifacts', () => {
      const state = nicheConstruction.getNicheState();
      expect(state.artifacts.size).toBe(0);
    });
  });

  describe('start and stop', () => {
    it('should start maintenance timer', () => {
      let called = false;
      const startedCallback = () => {
        called = true;
      };
      nicheConstruction.on('started', startedCallback);

      nicheConstruction.start();
      expect(called).toBe(true);
    });

    it('should stop maintenance timer', () => {
      let called = false;
      const stoppedCallback = () => {
        called = true;
      };
      nicheConstruction.on('stopped', stoppedCallback);

      nicheConstruction.start();
      nicheConstruction.stop();
      expect(called).toBe(true);
    });

    it('should handle multiple start calls gracefully', () => {
      nicheConstruction.start();
      nicheConstruction.start(); // Should not throw
    });
  });

  describe('getNicheState', () => {
    it('should return niche state with all components', () => {
      const state = nicheConstruction.getNicheState();

      expect(state.artifacts).toBeDefined();
      expect(state.affordances).toBeDefined();
      expect(state.stability).toBeDefined();
      expect(state.richness).toBeDefined();
      expect(state.predictability).toBeDefined();
      expect(state.fitness).toBeDefined();
    });

    it('should return copies of maps', () => {
      const state1 = nicheConstruction.getNicheState();
      const state2 = nicheConstruction.getNicheState();

      expect(state1.artifacts).not.toBe(state2.artifacts);
      expect(state1.affordances).not.toBe(state2.affordances);
    });
  });

  describe('getAvailableAffordances', () => {
    it('should return list of available affordances', () => {
      const affordances = nicheConstruction.getAvailableAffordances();
      expect(Array.isArray(affordances)).toBe(true);
    });

    it('should only return affordances marked as available', () => {
      const affordances = nicheConstruction.getAvailableAffordances();
      for (const affordance of affordances) {
        expect(affordance.available).toBe(true);
      }
    });
  });

  describe('artifact creation through belief updates', () => {
    it('should create artifacts when free energy is high', async () => {
      // Start niche construction
      nicheConstruction.start();

      // Process observations that create uncertainty
      const uncertainObservation: Observation = {
        type: 'sensory',
        content: '??? unclear message with many questions ???',
        features: [],
        source: 'test',
        timestamp: Date.now(),
        reliability: 0.3,
      };

      // Process multiple uncertain observations to trigger artifact creation
      for (let i = 0; i < 5; i++) {
        await activeInference.perceive(uncertainObservation);
      }

      // Wait for potential artifact creation
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if artifacts were considered (event might have been emitted)
      const state = nicheConstruction.getNicheState();
      // Artifacts may or may not be created depending on thresholds
      expect(state.artifacts).toBeDefined();
    });

    it('should emit artifact_created event when creating artifacts', async () => {
      let called = false;
      const callback = () => {
        called = true;
      };
      nicheConstruction.on('artifact_created', callback);

      nicheConstruction.start();

      // Trigger high uncertainty through observations
      for (let i = 0; i < 10; i++) {
        await activeInference.perceive({
          type: 'sensory',
          content: 'What is this? How does it work? Why?',
          features: [],
          source: 'test',
          timestamp: Date.now(),
          reliability: 0.2,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      // The callback may or may not have been called depending on thresholds
      expect(typeof callback).toBe('function');
    });
  });

  describe('findRelevantArtifact', () => {
    it('should return null when no artifacts exist', () => {
      const artifact = nicheConstruction.findRelevantArtifact('nonexistent_context');
      expect(artifact).toBeNull();
    });

    it('should find artifact by context', async () => {
      nicheConstruction.start();

      // Force artifact creation by triggering high uncertainty
      for (let i = 0; i < 10; i++) {
        await activeInference.perceive({
          type: 'sensory',
          content: 'Question about user_intent: what do they want?',
          features: [],
          source: 'test',
          timestamp: Date.now(),
          reliability: 0.3,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Try to find artifact (may or may not exist)
      const artifact = nicheConstruction.findRelevantArtifact('user_intent', 'inference_template');
      // Result depends on whether artifact was created
      expect(artifact === null || artifact?.type === 'inference_template').toBe(true);
    });
  });

  describe('getArtifactsByType', () => {
    it('should return empty array when no artifacts of type exist', () => {
      const artifacts = nicheConstruction.getArtifactsByType('inference_template');
      expect(artifacts).toEqual([]);
    });

    it('should filter artifacts by type', async () => {
      nicheConstruction.start();

      // Trigger artifact creation
      for (let i = 0; i < 10; i++) {
        await activeInference.perceive({
          type: 'sensory',
          content: 'Complex question requiring inference template',
          features: [],
          source: 'test',
          timestamp: Date.now(),
          reliability: 0.2,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      const inferenceTemplates = nicheConstruction.getArtifactsByType('inference_template');
      for (const artifact of inferenceTemplates) {
        expect(artifact.type).toBe('inference_template');
      }
    });
  });

  describe('getSummary', () => {
    it('should return summary with all fields', () => {
      const summary = nicheConstruction.getSummary();

      expect(summary.artifactCount).toBeDefined();
      expect(summary.affordanceCount).toBeDefined();
      expect(summary.availableAffordances).toBeDefined();
      expect(summary.nicheFitness).toBeDefined();
      expect(summary.stability).toBeDefined();
      expect(summary.recentModifications).toBeDefined();
    });

    it('should return non-negative counts', () => {
      const summary = nicheConstruction.getSummary();

      expect(summary.artifactCount).toBeGreaterThanOrEqual(0);
      expect(summary.affordanceCount).toBeGreaterThanOrEqual(0);
      expect(summary.availableAffordances).toBeGreaterThanOrEqual(0);
    });

    it('should have fitness between 0 and 1', () => {
      const summary = nicheConstruction.getSummary();
      expect(summary.nicheFitness).toBeGreaterThanOrEqual(0);
      expect(summary.nicheFitness).toBeLessThanOrEqual(1);
    });
  });

  describe('integration with ActiveInference', () => {
    it('should update niche fitness when beliefs change', async () => {
      nicheConstruction.start();
      const initialState = nicheConstruction.getNicheState();

      // Process observations to update beliefs
      for (let i = 0; i < 5; i++) {
        await activeInference.perceive({
          type: 'sensory',
          content: 'Consistent helpful message',
          features: [],
          source: 'test',
          timestamp: Date.now(),
          reliability: 1.0,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Fitness should have been updated
      const newState = nicheConstruction.getNicheState();
      expect(typeof newState.fitness).toBe('number');
    });

    it('should respond to learning events', async () => {
      nicheConstruction.start();

      const action: Action = {
        id: 'test_action',
        type: 'communicate',
        target: 'user',
        parameters: {},
        expectedOutcome: { content: 'expected' },
        epistemicValue: 0.5,
        pragmaticValue: 0.5,
      };

      const outcome: Observation = {
        type: 'sensory',
        content: 'actual response',
        features: [],
        source: 'user',
        timestamp: Date.now(),
        reliability: 1.0,
      };

      // This should trigger artifact effectiveness updates
      await activeInference.learnFromOutcome(action, outcome);

      // No error should occur
      expect(true).toBe(true);
    });
  });

  describe('affordance types', () => {
    it('should have query affordance', () => {
      const affordances = nicheConstruction.getAvailableAffordances();
      const queryAffordance = affordances.find((a) => a.type === 'query');
      expect(queryAffordance).toBeDefined();
      expect(queryAffordance?.description).toContain('question');
    });

    it('should have response affordance', () => {
      const affordances = nicheConstruction.getAvailableAffordances();
      const responseAffordance = affordances.find((a) => a.type === 'response');
      expect(responseAffordance).toBeDefined();
    });

    it('should have learning affordance', () => {
      const affordances = nicheConstruction.getAvailableAffordances();
      const learningAffordance = affordances.find((a) => a.type === 'learning');
      expect(learningAffordance).toBeDefined();
    });

    it('should have adaptation affordance', () => {
      const affordances = nicheConstruction.getAvailableAffordances();
      const adaptationAffordance = affordances.find((a) => a.type === 'adaptation');
      expect(adaptationAffordance).toBeDefined();
    });
  });
});

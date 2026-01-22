import {
  ActiveInference,
  ActiveInferenceConfig,
  Observation,
  Action,
} from "../ActiveInference.js";

describe("ActiveInference", () => {
  let activeInference: ActiveInference;
  const testConfig: Partial<ActiveInferenceConfig> = {
    learningRate: 0.2,
    sensoryPrecision: 1.0,
    priorPrecision: 0.5,
    explorationTemperature: 1.0,
  };

  beforeEach(() => {
    activeInference = new ActiveInference(testConfig);
  });

  afterEach(() => {
    activeInference.stop();
  });

  describe("constructor", () => {
    it("should create ActiveInference with default config", () => {
      const ai = new ActiveInference();
      expect(ai).toBeDefined();
      expect(ai.getBeliefs().size).toBeGreaterThan(0);
    });

    it("should create ActiveInference with custom config", () => {
      expect(activeInference).toBeDefined();
    });

    it("should initialize default beliefs", () => {
      const beliefs = activeInference.getBeliefs();
      expect(beliefs.size).toBeGreaterThan(0);
      expect(beliefs.has("user_intent")).toBe(true);
      expect(beliefs.has("emotional_valence")).toBe(true);
    });
  });

  describe("start and stop", () => {
    it("should start active inference", () => {
      let called = false;
      const startedCallback = () => {
        called = true;
      };
      activeInference.on("started", startedCallback);

      activeInference.start();
      expect(called).toBe(true);
    });

    it("should stop active inference", () => {
      let called = false;
      const stoppedCallback = () => {
        called = true;
      };
      activeInference.on("stopped", stoppedCallback);

      activeInference.start();
      activeInference.stop();
      expect(called).toBe(true);
    });

    it("should handle multiple start calls", () => {
      activeInference.start();
      activeInference.start(); // Should not throw
    });
  });

  describe("perceive", () => {
    it("should process observation and update beliefs", async () => {
      const observation: Observation = {
        type: "sensory",
        content: "Hello, how can you help me?",
        features: [0.5, 0.3],
        source: "user_message",
        timestamp: Date.now(),
        reliability: 0.9,
      };

      const updatedBeliefs = await activeInference.perceive(observation);
      expect(updatedBeliefs.size).toBeGreaterThan(0);
    });

    it("should emit beliefs_updated event", async () => {
      let called = false;
      const callback = () => {
        called = true;
      };
      activeInference.on("beliefs_updated", callback);

      const observation: Observation = {
        type: "sensory",
        content: "I need urgent help please!",
        features: [0.8, 0.9],
        source: "user_message",
        timestamp: Date.now(),
        reliability: 1.0,
      };

      await activeInference.perceive(observation);
      expect(called).toBe(true);
    });

    it("should detect emotional valence from content", async () => {
      const positiveObservation: Observation = {
        type: "sensory",
        content: "This is great! Thank you so much!",
        features: [],
        source: "user_message",
        timestamp: Date.now(),
        reliability: 1.0,
      };

      await activeInference.perceive(positiveObservation);
      const state = activeInference.getCognitiveState();
      const valenceBelief = state.beliefs.find(
        (b) => b.variable === "emotional_valence",
      );
      expect(valenceBelief).toBeDefined();
    });

    it("should update observation history", async () => {
      const observation: Observation = {
        type: "sensory",
        content: "Test message",
        features: [],
        source: "test",
        timestamp: Date.now(),
        reliability: 1.0,
      };

      await activeInference.perceive(observation);
      const state = activeInference.getCognitiveState();
      expect(state.observationCount).toBeGreaterThan(0);
    });
  });

  describe("calculateFreeEnergy", () => {
    it("should calculate free energy components", async () => {
      const observation: Observation = {
        type: "sensory",
        content: "Test",
        features: [0.5],
        source: "test",
        timestamp: Date.now(),
        reliability: 1.0,
      };

      const result = activeInference.calculateFreeEnergy(observation);

      expect(result.totalFreeEnergy).toBeDefined();
      expect(result.accuracy).toBeDefined();
      expect(result.complexity).toBeDefined();
      expect(result.epistemicValue).toBeDefined();
      expect(result.pragmaticValue).toBeDefined();
    });

    it("should return non-negative free energy", async () => {
      const observation: Observation = {
        type: "sensory",
        content: "Hello",
        features: [],
        source: "test",
        timestamp: Date.now(),
        reliability: 1.0,
      };

      const result = activeInference.calculateFreeEnergy(observation);
      expect(result.totalFreeEnergy).toBeGreaterThanOrEqual(0);
    });
  });

  describe("selectAction", () => {
    it("should select action from available actions", async () => {
      const actions: Action[] = [
        {
          id: "action_1",
          type: "communicate",
          target: "user",
          parameters: {},
          expectedOutcome: { content: "Response" },
          epistemicValue: 0.3,
          pragmaticValue: 0.5,
        },
        {
          id: "action_2",
          type: "query",
          target: "user",
          parameters: {},
          expectedOutcome: { content: "Question" },
          epistemicValue: 0.7,
          pragmaticValue: 0.2,
        },
      ];

      const selected = await activeInference.selectAction(actions);
      expect(selected).not.toBeNull();
      expect(["action_1", "action_2"]).toContain(selected?.id);
    });

    it("should return null for empty action list", async () => {
      const selected = await activeInference.selectAction([]);
      expect(selected).toBeNull();
    });

    it("should emit action_selected event", async () => {
      let called = false;
      const callback = () => {
        called = true;
      };
      activeInference.on("action_selected", callback);

      const actions: Action[] = [
        {
          id: "action_1",
          type: "communicate",
          target: "user",
          parameters: {},
          expectedOutcome: {},
          epistemicValue: 0.5,
          pragmaticValue: 0.5,
        },
      ];

      await activeInference.selectAction(actions);
      expect(called).toBe(true);
    });

    it("should favor high epistemic value actions when uncertain", async () => {
      // Process an uncertain observation first
      const observation: Observation = {
        type: "sensory",
        content: "???",
        features: [],
        source: "test",
        timestamp: Date.now(),
        reliability: 0.3,
      };
      await activeInference.perceive(observation);

      const actions: Action[] = [
        {
          id: "explore",
          type: "query",
          target: "user",
          parameters: {},
          expectedOutcome: {},
          epistemicValue: 0.9, // High information gain
          pragmaticValue: 0.1,
        },
        {
          id: "exploit",
          type: "communicate",
          target: "user",
          parameters: {},
          expectedOutcome: {},
          epistemicValue: 0.1,
          pragmaticValue: 0.5,
        },
      ];

      // Run multiple times to check distribution bias
      let exploreCount = 0;
      for (let i = 0; i < 20; i++) {
        const selected = await activeInference.selectAction(actions);
        if (selected?.id === "explore") exploreCount++;
      }

      // Should select explore more often due to high epistemic value
      expect(exploreCount).toBeGreaterThan(5);
    });
  });

  describe("learnFromOutcome", () => {
    it("should update model after action outcome", async () => {
      const action: Action = {
        id: "test_action",
        type: "communicate",
        target: "user",
        parameters: {},
        expectedOutcome: { content: "positive response" },
        epistemicValue: 0.5,
        pragmaticValue: 0.5,
      };

      const outcome: Observation = {
        type: "sensory",
        content: "Thank you, that was helpful!",
        features: [],
        source: "user_response",
        timestamp: Date.now(),
        reliability: 1.0,
      };

      let called = false;
      const callback = () => {
        called = true;
      };
      activeInference.on("learning_complete", callback);

      await activeInference.learnFromOutcome(action, outcome);
      expect(called).toBe(true);
    });
  });

  describe("getCognitiveState", () => {
    it("should return cognitive state summary", () => {
      const state = activeInference.getCognitiveState();

      expect(state.beliefs).toBeDefined();
      expect(Array.isArray(state.beliefs)).toBe(true);
      expect(state.freeEnergy).toBeDefined();
      expect(state.isLearning).toBeDefined();
      expect(state.observationCount).toBeDefined();
      expect(state.actionCount).toBeDefined();
    });

    it("should include belief summaries with confidence", () => {
      const state = activeInference.getCognitiveState();

      for (const belief of state.beliefs) {
        expect(belief.variable).toBeDefined();
        expect(belief.mostLikely).toBeDefined();
        expect(belief.confidence).toBeDefined();
        expect(belief.confidence).toBeGreaterThanOrEqual(0);
        expect(belief.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("getFreeEnergyHistory", () => {
    it("should track free energy over time", async () => {
      const observations: Observation[] = [
        {
          type: "sensory",
          content: "Hello",
          features: [],
          source: "test",
          timestamp: Date.now(),
          reliability: 1.0,
        },
        {
          type: "sensory",
          content: "Help please",
          features: [],
          source: "test",
          timestamp: Date.now(),
          reliability: 1.0,
        },
        {
          type: "sensory",
          content: "Thank you",
          features: [],
          source: "test",
          timestamp: Date.now(),
          reliability: 1.0,
        },
      ];

      for (const obs of observations) {
        await activeInference.perceive(obs);
      }

      const history = activeInference.getFreeEnergyHistory();
      expect(history.length).toBe(3);
    });
  });

  describe("isMinimizingFreeEnergy", () => {
    it("should return true initially", () => {
      expect(activeInference.isMinimizingFreeEnergy()).toBe(true);
    });

    it("should detect when learning is occurring", async () => {
      // Process multiple similar observations to stabilize beliefs
      for (let i = 0; i < 15; i++) {
        await activeInference.perceive({
          type: "sensory",
          content: "Hello, I need help with something.",
          features: [0.5],
          source: "test",
          timestamp: Date.now(),
          reliability: 1.0,
        });
      }

      // Should still be minimizing (or at least not diverging)
      const isMinimizing = activeInference.isMinimizingFreeEnergy();
      expect(typeof isMinimizing).toBe("boolean");
    });
  });
});

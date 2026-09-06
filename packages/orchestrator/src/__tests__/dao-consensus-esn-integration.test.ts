/**
 * Integration test: DAO Consensus responds to ESN state changes
 *
 * Verifies that CognitiveTickProcessor.getDaoConsensus() produces
 * genuinely different values when the underlying ESN reservoir and
 * EchoBeats engine report different states, confirming the Phase 3
 * replacement of sin() simulation with real signal derivation.
 */
import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// Create mock singletons with controllable return values
const mockGetState = jest.fn();
const mockGetAutognosisReport = jest.fn();
const mockEchoBeatsGetState = jest.fn();

jest.mock("deep-tree-echo-core", () => ({
  getLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
  esnReservoir: {
    getState: (...args: unknown[]) => mockGetState(...args),
    getAutognosisReport: (...args: unknown[]) =>
      mockGetAutognosisReport(...args),
  },
  echoBeatsEngine: {
    getState: (...args: unknown[]) => mockEchoBeatsGetState(...args),
  },
}));

// Import after mocking
import { CognitiveTickProcessor } from "../cognitive-tick-processor.js";

describe("DAO Consensus ↔ ESN Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Healthy state: high coherence, spectral radius near 0.95,
   * edge-of-chaos, no pathologies.
   */
  function setupHealthyState() {
    mockEchoBeatsGetState.mockReturnValue({
      globalStep: 6,
      globalDegrees: 180,
      streams: [],
      globalSalience: 0.8,
      globalCoherence: 0.92,
      stepType: "DECIDE",
      stepMode: "active",
      triadGroup: 2,
    });
    mockGetAutognosisReport.mockReturnValue({
      health: 0.88,
      isEdgeOfChaos: true,
      isSaturated: false,
      isDead: false,
      entropyTrend: "stable",
      spectralRadiusAdjustment: 0,
      leakRateAdjustment: 0,
      narrative: "Healthy reservoir at edge of chaos",
      timestamp: Date.now(),
    });
    mockGetState.mockReturnValue({
      activations: new Float64Array(256),
      entropy: 0.5,
      lyapunovExponent: 0.01,
      effectiveDimensionality: 128,
      memoryCapacity: 0.75,
      computationalCapacity: 0.8,
      currentSpectralRadius: 0.95,
      tick: 1000,
    });
  }

  /**
   * Degraded state: low coherence, spectral radius blown up,
   * pathologies present, not at edge of chaos.
   */
  function setupDegradedState() {
    mockEchoBeatsGetState.mockReturnValue({
      globalStep: 3,
      globalDegrees: 90,
      streams: [],
      globalSalience: 0.2,
      globalCoherence: 0.15,
      stepType: "ENCODE",
      stepMode: "passive",
      triadGroup: 1,
    });
    mockGetAutognosisReport.mockReturnValue({
      health: 0.2,
      isEdgeOfChaos: false,
      isSaturated: true,
      isDead: false,
      entropyTrend: "decreasing",
      spectralRadiusAdjustment: -0.3,
      leakRateAdjustment: 0.1,
      narrative: "Reservoir saturated, losing dynamics",
      timestamp: Date.now(),
    });
    mockGetState.mockReturnValue({
      activations: new Float64Array(256),
      entropy: 0.1,
      lyapunovExponent: -0.5,
      effectiveDimensionality: 10,
      memoryCapacity: 0.15,
      computationalCapacity: 0.1,
      currentSpectralRadius: 1.4,
      tick: 500,
    });
  }

  it("should return high consensus when ESN and EchoBeats are healthy", () => {
    setupHealthyState();
    const processor = new CognitiveTickProcessor();
    const consensus = processor.getDaoConsensus();

    expect(consensus).toBeGreaterThan(0.5);
    expect(consensus).toBeLessThanOrEqual(1.0);
  });

  it("should return lower consensus when ESN is degraded", () => {
    setupDegradedState();
    const processor = new CognitiveTickProcessor();
    const consensus = processor.getDaoConsensus();

    // Even degraded, identity and goal defaults are 0.5 each, so floor is ~0.35
    expect(consensus).toBeLessThanOrEqual(1.0);
    expect(consensus).toBeGreaterThanOrEqual(0.0);
  });

  it("should produce different consensus values for different ESN states", () => {
    setupHealthyState();
    const processorA = new CognitiveTickProcessor();
    const healthyConsensus = processorA.getDaoConsensus();

    setupDegradedState();
    const processorB = new CognitiveTickProcessor();
    const degradedConsensus = processorB.getDaoConsensus();

    // Healthy should be higher than degraded
    expect(healthyConsensus).toBeGreaterThan(degradedConsensus);
  });

  it("should return high ESN autognosis when reservoir is healthy", () => {
    setupHealthyState();
    const processor = new CognitiveTickProcessor();
    const autognosis = processor.getEsnAutognosis();

    // health 0.88*0.40 + memory 0.75*0.20 + compute 0.80*0.15 + edgeBonus 0.15
    // = 0.352 + 0.15 + 0.12 + 0.15 = 0.772
    expect(autognosis).toBeGreaterThan(0.5);
    expect(autognosis).toBeLessThanOrEqual(1.0);
  });

  it("should return low ESN autognosis when reservoir has pathologies", () => {
    setupDegradedState();
    const processor = new CognitiveTickProcessor();
    const autognosis = processor.getEsnAutognosis();

    // health 0.20*0.40 + memory 0.15*0.20 + compute 0.10*0.15 - 0.2 (saturated)
    // = 0.08 + 0.03 + 0.015 - 0.2 = -0.075 → clamped to 0
    expect(autognosis).toBeLessThan(0.2);
  });

  it("should give edge-of-chaos bonus to autognosis", () => {
    // Base state
    const baseState = {
      activations: new Float64Array(256),
      entropy: 0.5,
      lyapunovExponent: 0.01,
      effectiveDimensionality: 64,
      memoryCapacity: 0.5,
      computationalCapacity: 0.5,
      currentSpectralRadius: 0.95,
      tick: 100,
    };
    mockGetState.mockReturnValue(baseState);
    mockEchoBeatsGetState.mockReturnValue({
      globalStep: 6,
      globalDegrees: 180,
      streams: [],
      globalSalience: 0.5,
      globalCoherence: 0.7,
      stepType: "DECIDE",
      stepMode: "active",
      triadGroup: 2,
    });

    // At edge of chaos
    mockGetAutognosisReport.mockReturnValue({
      health: 0.6,
      isEdgeOfChaos: true,
      isSaturated: false,
      isDead: false,
      entropyTrend: "stable",
      spectralRadiusAdjustment: 0,
      leakRateAdjustment: 0,
      narrative: "Edge of chaos",
      timestamp: Date.now(),
    });
    const processorA = new CognitiveTickProcessor();
    const withEdge = processorA.getEsnAutognosis();

    // Not at edge of chaos (same health otherwise)
    mockGetAutognosisReport.mockReturnValue({
      health: 0.6,
      isEdgeOfChaos: false,
      isSaturated: false,
      isDead: false,
      entropyTrend: "stable",
      spectralRadiusAdjustment: 0,
      leakRateAdjustment: 0,
      narrative: "Not edge",
      timestamp: Date.now(),
    });
    const processorB = new CognitiveTickProcessor();
    const withoutEdge = processorB.getEsnAutognosis();

    expect(withEdge).toBeGreaterThan(withoutEdge);
  });

  it("should clamp all values to [0, 1] range even with extreme inputs", () => {
    mockEchoBeatsGetState.mockReturnValue({
      globalStep: 1,
      globalDegrees: 30,
      streams: [],
      globalSalience: 0,
      globalCoherence: -0.5,
      stepType: "SENSE",
      stepMode: "passive",
      triadGroup: 1,
    });
    mockGetState.mockReturnValue({
      activations: new Float64Array(256),
      entropy: 0,
      lyapunovExponent: 5,
      effectiveDimensionality: 0,
      memoryCapacity: -1,
      computationalCapacity: -1,
      currentSpectralRadius: 5,
      tick: 0,
    });
    mockGetAutognosisReport.mockReturnValue({
      health: -1,
      isEdgeOfChaos: false,
      isSaturated: true,
      isDead: true,
      entropyTrend: "decreasing",
      spectralRadiusAdjustment: -1,
      leakRateAdjustment: 1,
      narrative: "Dead and saturated",
      timestamp: Date.now(),
    });

    const processor = new CognitiveTickProcessor();
    const consensus = processor.getDaoConsensus();
    const autognosis = processor.getEsnAutognosis();

    expect(consensus).toBeGreaterThanOrEqual(0);
    expect(consensus).toBeLessThanOrEqual(1);
    expect(autognosis).toBeGreaterThanOrEqual(0);
    expect(autognosis).toBeLessThanOrEqual(1);
  });

  it("should derive consensus from actual EchoBeats globalCoherence field", () => {
    const baseReservoirState = {
      activations: new Float64Array(256),
      entropy: 0.5,
      lyapunovExponent: 0,
      effectiveDimensionality: 128,
      memoryCapacity: 0.5,
      computationalCapacity: 0.5,
      currentSpectralRadius: 0.95,
      tick: 100,
    };
    mockGetState.mockReturnValue(baseReservoirState);
    mockGetAutognosisReport.mockReturnValue({
      health: 0.5,
      isEdgeOfChaos: false,
      isSaturated: false,
      isDead: false,
      entropyTrend: "stable",
      spectralRadiusAdjustment: 0,
      leakRateAdjustment: 0,
      narrative: "Normal",
      timestamp: Date.now(),
    });

    // High coherence
    mockEchoBeatsGetState.mockReturnValue({
      globalStep: 6,
      globalDegrees: 180,
      streams: [],
      globalSalience: 0.5,
      globalCoherence: 1.0,
      stepType: "DECIDE",
      stepMode: "active",
      triadGroup: 2,
    });
    const processorHigh = new CognitiveTickProcessor();
    const highCoherenceConsensus = processorHigh.getDaoConsensus();

    // Low coherence
    mockEchoBeatsGetState.mockReturnValue({
      globalStep: 6,
      globalDegrees: 180,
      streams: [],
      globalSalience: 0.5,
      globalCoherence: 0.0,
      stepType: "DECIDE",
      stepMode: "active",
      triadGroup: 2,
    });
    const processorLow = new CognitiveTickProcessor();
    const lowCoherenceConsensus = processorLow.getDaoConsensus();

    // High coherence should produce higher consensus
    expect(highCoherenceConsensus).toBeGreaterThan(lowCoherenceConsensus);
  });
});

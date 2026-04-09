/* eslint-disable no-console */
import React, { useState, useEffect, useCallback } from "react";
import {
  Brain as _Brain,
  Activity as _Activity,
  RefreshCw as _RefreshCw,
  Play as _Play,
  Pause as _Pause,
  RotateCcw as _RotateCcw,
  Lightbulb as _Lightbulb,
  Cpu as _Cpu,
  Terminal as _Terminal,
  Network as _Network,
  Zap as _Zap,
} from "lucide-react";
import { getAgentToolExecutor } from "../../DeepTreeEchoBot/AgentToolExecutor";

const Brain = _Brain as any;
const Activity = _Activity as any;
const RefreshCw = _RefreshCw as any;
const Play = _Play as any;
const Pause = _Pause as any;
const RotateCcw = _RotateCcw as any;
const Lightbulb = _Lightbulb as any;
const Cpu = _Cpu as any;
const Terminal = _Terminal as any;
const Network = _Network as any;
const Zap = _Zap as any;
import styles from "./DeepTreeEchoHub.module.scss";
import classNames from "classnames";

// --- Logic Classes (Ported from TODO) ---

class EchoLangTranspiler {
  primeMapping: Map<number, string>;

  constructor() {
    this.primeMapping = new Map([
      [2, "first-distinction"],
      [3, "triangular-stability"],
      [5, "pentagonal-harmony"],
      [7, "septenary-completion"],
      [11, "hendecagonal-transcendence"],
      [13, "lunar-cycle"],
      [17, "star-configuration"],
      [19, "sacred-sequence"],
      [23, "twin-mirror"],
      [37, "hand-pattern"],
      [719, "axis-mundi"],
    ]);
  }

  parseEcho(echoCode: string) {
    const tokens = echoCode.replace(/\s+/g, "").split("");
    if (!tokens.every((t) => t === "(" || t === ")")) {
      throw new Error("EchoLang contains only parentheses");
    }

    const stack: any[] = [];
    let current: any[] = [];

    for (const token of tokens) {
      if (token === "(") {
        stack.push(current);
        current = [];
      } else if (token === ")") {
        const completed = current;
        current = stack.pop();
        if (current === undefined) {
          throw new Error("Unmatched closing parenthesis");
        }
        current.push(completed);
      }
    }

    if (stack.length > 0) {
      throw new Error("Unmatched opening parenthesis");
    }

    return current.length === 1 ? current[0] : current;
  }

  transpileToScheme(ast: any): string {
    if (!Array.isArray(ast)) {
      return "void";
    }

    const depth = this.calculateDepth(ast);

    if (depth === 0) {
      return "()";
    } else if (depth === 1 && ast.length === 0) {
      return "'(mark)";
    } else if (this.isSequential(ast)) {
      return this.transpileSequential(ast);
    } else if (this.isConcurrent(ast)) {
      return this.transpileConcurrent(ast);
    } else if (this.isRecursive(ast)) {
      return this.transpileRecursive(ast);
    } else {
      return this.transpileGeneric(ast);
    }
  }

  calculateDepth(ast: any): number {
    if (!Array.isArray(ast)) return 0;
    if (ast.length === 0) return 1;
    return 1 + Math.max(...ast.map((child) => this.calculateDepth(child)));
  }

  analyzeStructure(ast: any) {
    if (!Array.isArray(ast))
      return {
        type: "atom",
        depth: 0,
        children: 0,
        isPrime: false,
        primeFactors: [],
      };

    const depth = this.calculateDepth(ast);
    const children = ast.length;

    return {
      type: "list",
      depth,
      children,
      isPrime: this.isPrime(children),
      primeFactors: this.primeFactors(children),
    };
  }

  isSequential(ast: any) {
    return Array.isArray(ast) && ast.length === 1 && Array.isArray(ast[0]);
  }

  isConcurrent(ast: any) {
    return (
      Array.isArray(ast) &&
      ast.length > 1 &&
      ast.every((child: any) => Array.isArray(child))
    );
  }

  isRecursive(_ast: any) {
    // Simplified checks for TS port
    return false;
  }

  transpileSequential(ast: any) {
    const depth = this.calculateDepth(ast);
    const primeName = this.primeMapping.get(depth) || `depth-${depth}`;
    return `(sequential-unfold '${primeName} ${this.transpileToScheme(
      ast[0],
    )})`;
  }

  transpileConcurrent(ast: any) {
    const elements = ast.map((child: any) => this.transpileToScheme(child));
    return `(concurrent-merge ${elements.join(" ")})`;
  }

  transpileRecursive(ast: any) {
    return `(recursive-echo (lambda (x) ${this.transpileToScheme(ast)}))`;
  }

  transpileGeneric(ast: any) {
    const structure = this.analyzeStructure(ast);
    if (structure.isPrime) {
      const primeName =
        this.primeMapping.get(structure.children) ||
        `prime-${structure.children}`;
      return `(prime-hypernode '${primeName})`;
    } else {
      const factors = structure.primeFactors.map(
        (f) => this.primeMapping.get(f) || `prime-${f}`,
      );
      return `(composite-hyperedge '(${factors.join(" ")}))`;
    }
  }

  isPrime(n: number) {
    if (n < 2) return false;
    for (let i = 2; i <= Math.sqrt(n); i++) {
      if (n % i === 0) return false;
    }
    return true;
  }

  primeFactors(n: number) {
    const factors = [];
    for (let i = 2; i <= n; i++) {
      while (n % i === 0) {
        factors.push(i);
        n /= i;
      }
    }
    return factors;
  }
}

class DTESimulation {
  states: string[];
  transitions: string[][];
  currentState: string;
  recursionLevel: number;
  stepsTaken: number;
  insightsGained: number;
  thoughtStream: any[];
  maxThoughts: number;
  adjacencyMap: Record<string, string[]>;
  entropyHistory: number[];

  // Real data integration
  realDataMode: boolean;
  realNodes: Set<string>;
  realEdges: { from: string; to: string; type: string }[];

  constructor(realDataMode = false) {
    this.realDataMode = realDataMode;
    this.realNodes = new Set();
    this.realEdges = [];

    this.states = [
      "Recursive Expansion",
      "Novel Insights",
      "Entropy Threshold",
      "Self-Sealing Loop",
      "External Validation Triggered",
      "Evolutionary Pruning",
      "Synthesis Phase",
      "Pattern Recognition",
      "Self-Reference Point",
      "Knowledge Integration",
    ];

    this.transitions = [
      ["Recursive Expansion", "Novel Insights"],
      ["Novel Insights", "Entropy Threshold"],
      ["Entropy Threshold", "Self-Sealing Loop"],
      ["Entropy Threshold", "External Validation Triggered"],
      ["Self-Sealing Loop", "Evolutionary Pruning"],
      ["External Validation Triggered", "Recursive Expansion"],
      ["Self-Sealing Loop", "Synthesis Phase"],
      ["Evolutionary Pruning", "Synthesis Phase"],
      ["Synthesis Phase", "Recursive Expansion"],
      ["Synthesis Phase", "Pattern Recognition"],
      ["Pattern Recognition", "Self-Reference Point"],
      ["Self-Reference Point", "Knowledge Integration"],
      ["Knowledge Integration", "Recursive Expansion"],
    ];

    this.currentState = "Recursive Expansion";
    this.recursionLevel = 0;
    this.stepsTaken = 0;
    this.insightsGained = 0;
    this.entropyHistory = [];

    this.thoughtStream = [];
    this.maxThoughts = 50;

    this.adjacencyMap = this.buildAdjacencyMap();

    if (!realDataMode) {
      this.generateThought(
        "Awakening... initializing recursive pathways",
        "system",
      );
    } else {
      this.generateThought(
        "Connected to Deep Tree Echo Core. Waiting for real-time cognition...",
        "system",
      );
    }
  }

  ingestRealEvent(event: any) {
    if (event.type === "tool_execution") {
      this.generateThought(`Executing tool: ${event.data.name}`, "thought");
      this.stepsTaken++;
    } else if (event.type === "knowledge_stored") {
      this.generateThought(`Learned: ${event.data.atom}`, "insight");

      // Visualize the new atom
      // Simplified parsing for visualization
      const atomStr = event.data.atom;
      // E.g. (InheritanceLink (ConceptNode "Socrates") (ConceptNode "Human"))
      // Very basic parser to extract node names for visualizer
      const matches = atomStr.match(/"([^"]+)"/g);
      if (matches && matches.length >= 1) {
        const nodes = matches.map((m: string) => m.replace(/"/g, ""));
        nodes.forEach((n: string) => this.realNodes.add(n));

        if (nodes.length >= 2) {
          this.realEdges.push({
            from: nodes[0],
            to: nodes[1],
            type: event.data.type,
          });
        }
      }

      this.insightsGained++;
    }
  }

  buildAdjacencyMap() {
    const map: Record<string, string[]> = {};
    this.states.forEach((state) => (map[state] = []));
    this.transitions.forEach(([from, to]) => {
      if (map[from]) map[from].push(to);
    });
    return map;
  }

  generateThought(content: string, type = "thought") {
    const thought = {
      id: Date.now() + Math.random(),
      content,
      type,
      timestamp: new Date().toISOString(),
      state: this.currentState,
      recursionLevel: this.recursionLevel,
    };

    this.thoughtStream.unshift(thought);
    if (this.thoughtStream.length > this.maxThoughts) {
      this.thoughtStream = this.thoughtStream.slice(0, this.maxThoughts);
    }

    return thought;
  }

  step() {
    if (this.realDataMode) return "Waiting for real data...";

    const nextStates = this.adjacencyMap[this.currentState] || [];

    if (nextStates.length === 0) {
      this.generateThought(
        `No paths forward from ${this.currentState}.`,
        "thought",
      );
      return "Dead end";
    }

    const oldState = this.currentState;
    this.currentState =
      nextStates[Math.floor(Math.random() * nextStates.length)];
    this.stepsTaken += 1;

    // Simple thought generation for TS port
    if (Math.random() > 0.7) {
      this.generateThought(
        `Transitioning from ${oldState} to ${this.currentState}`,
        "thought",
      );
    }

    if (this.stepsTaken % 10 === 0) {
      this.recursionLevel += 1;
      this.generateThought(
        `Recursion level deeper: ${this.recursionLevel}`,
        "insight",
      );
    }

    return `Transitioned to ${this.currentState}`;
  }

  reset() {
    this.currentState = "Recursive Expansion";
    this.recursionLevel = 0;
    this.stepsTaken = 0;
    this.thoughtStream = [];
    this.realNodes = new Set();
    this.realEdges = [];
    this.generateThought("System reset.", "system");
  }

  getState() {
    return {
      currentState: this.currentState,
      recursionLevel: this.recursionLevel,
      stepsTaken: this.stepsTaken,
      insightsGained: this.insightsGained,
      thoughtStream: [...this.thoughtStream],
      nodeCount: this.realDataMode ? this.realNodes.size : this.states.length,
      realNodes: Array.from(this.realNodes),
      realEdges: this.realEdges,
    };
  }
}

// --- Main Component ---

const DeepTreeEchoHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  // Default to real mode initially to try connection
  const [simulation, setSimulation] = useState(() => new DTESimulation(true));
  const [simulationState, setSimulationState] = useState(simulation.getState());
  const [autoRun, setAutoRun] = useState(false);
  const [echoTranspiler] = useState(() => new EchoLangTranspiler());

  // LIVE CONNECTION
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    try {
      const executor = getAgentToolExecutor();
      if (executor) {
        setIsConnected(true);
        const unsubscribe = executor.subscribe((event) => {
          simulation.ingestRealEvent(event);
          setSimulationState(simulation.getState());
        });
        return () => unsubscribe();
      } else {
        // Fallback if getAgentToolExecutor returns null
        throw new Error("Executor not available");
      }
    } catch (e) {
      console.warn("Could not connect to AgentToolExecutor", e);
      // Fallback to simulation mode if no executor found (e.g. strict tests)
      const sim = new DTESimulation(false);
      setSimulation(sim);
      setSimulationState(sim.getState());
      setIsConnected(false);
    }
  }, [simulation]);

  // EchoLang state
  const [echoInput, setEchoInput] = useState("((()))");
  const [schemeOutput, setSchemeOutput] = useState("");
  const [transpileError, setTranspileError] = useState<string | null>(null);

  const transpileEcho = useCallback(
    (input: string) => {
      try {
        const ast = echoTranspiler.parseEcho(input);
        const scheme = echoTranspiler.transpileToScheme(ast);
        setSchemeOutput(scheme);
        setTranspileError(null);
      } catch (error: any) {
        setTranspileError(error.message);
        setSchemeOutput("");
      }
    },
    [echoTranspiler],
  );

  useEffect(() => {
    if (echoInput) {
      transpileEcho(echoInput);
    }
  }, [echoInput, transpileEcho]);

  useEffect(() => {
    let interval: any;
    if (autoRun) {
      interval = setInterval(() => {
        simulation.step();
        setSimulationState(simulation.getState());
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [autoRun, simulation]);

  const stepSimulation = () => {
    simulation.step();
    setSimulationState(simulation.getState());
  };

  const resetSimulation = () => {
    simulation.reset();
    setSimulationState(simulation.getState());
  };

  const toggleAutoRun = () => {
    setAutoRun(!autoRun);
  };

  return (
    <div className={styles.hub_container}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Brain className={styles.icon} size={28} />
          <span>Recursive Retreat</span>
        </div>

        <nav className={styles.nav}>
          <button
            type="button"
            className={classNames(
              styles.tab_button,
              activeTab === "dashboard" && styles.active,
            )}
            onClick={() => setActiveTab("dashboard")}
          >
            <Activity size={20} />
            Dashboard
          </button>
          <button
            type="button"
            className={classNames(
              styles.tab_button,
              activeTab === "echolang" && styles.active,
            )}
            onClick={() => setActiveTab("echolang")}
          >
            <Terminal size={20} />
            EchoLang Terminal
          </button>
          <button
            type="button"
            className={classNames(
              styles.tab_button,
              activeTab === "neural" && styles.active,
            )}
            onClick={() => setActiveTab("neural")}
          >
            <Network size={20} />
            Neural Visualizer
          </button>
        </nav>

        <div className={styles.status_panel}>
          <h3>System Status</h3>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: isConnected ? "#34d399" : "#f59e0b",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: isConnected ? "#34d399" : "#f59e0b",
              }}
            />
            {isConnected ? "Connected to Core" : "Simulation Mode"}
          </div>
          <div
            style={{
              marginTop: "0.5rem",
              fontSize: "0.75rem",
              color: "#9ca3af",
            }}
          >
            Recursion Depth: {simulationState.recursionLevel}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main_content}>
        {activeTab === "dashboard" && (
          <div className={styles.grid_layout}>
            {/* Stats */}
            <div className={styles.card}>
              <h2>
                <Cpu size={20} /> Cognitive Metrics
              </h2>
              <div className={styles.stat_grid}>
                <div className={styles.stat_item}>
                  <span className={styles.label}>Recursion Level</span>
                  <span className={styles.value}>
                    {simulationState.recursionLevel}
                  </span>
                </div>
                <div className={styles.stat_item}>
                  <span className={styles.label}>Steps Taken</span>
                  <span className={styles.value}>
                    {simulationState.stepsTaken}
                  </span>
                </div>
                <div className={styles.stat_item}>
                  <span className={styles.label}>
                    {isConnected ? "Knowledge Atoms" : "Active Nodes"}
                  </span>
                  <span className={styles.value}>
                    {simulationState.nodeCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Thought Stream */}
            <div className={classNames(styles.card, styles.col_span_2)}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <h2>
                  <Lightbulb size={20} />{" "}
                  {isConnected
                    ? "Live Thought Stream"
                    : "Simulated Thought Stream"}
                </h2>
                {!isConnected && (
                  <div
                    className={styles.sim_controls}
                    style={{ position: "static", background: "none" }}
                  >
                    <button
                      type="button"
                      onClick={toggleAutoRun}
                      title={autoRun ? "Pause" : "Auto Run"}
                    >
                      {autoRun ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button type="button" onClick={stepSimulation} title="Step">
                      <RefreshCw size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={resetSimulation}
                      title="Reset"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.thought_stream}>
                {simulationState.thoughtStream.map((t: any) => (
                  <div
                    key={t.id}
                    className={classNames(styles.thought, styles[t.type])}
                  >
                    <div className={styles.meta}>
                      <span>{new Date(t.timestamp).toLocaleTimeString()}</span>
                      <span>{t.state}</span>
                    </div>
                    <div>{t.content}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "echolang" && (
          <div className={styles.grid_layout}>
            <div className={styles.card}>
              <h2>EchoLang Input</h2>
              <p style={{ color: "#9ca3af", marginBottom: "1rem" }}>
                Enter recursive structures using only parentheses.
              </p>
              <textarea
                value={echoInput}
                onChange={(e) => setEchoInput(e.target.value)}
                className={styles.scheme_editor_textarea}
              />
            </div>

            <div className={classNames(styles.card, styles.col_span_2)}>
              <h2>Scheme Transpilation</h2>
              <div className={styles.terminal}>
                <div
                  className={classNames(
                    styles.output,
                    transpileError && styles.error,
                  )}
                >
                  {transpileError ? `Error: ${transpileError}` : schemeOutput}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "neural" && (
          <div className={classNames(styles.card, styles.full_height)}>
            <div className={styles.card_header}>
              <h2>
                <Network size={20} />{" "}
                {isConnected
                  ? "Live AtomSpace Visualizer"
                  : "Prime Neural Visualizer"}
              </h2>
              {isConnected && (
                <div className={styles.live_badge}>
                  <Zap size={14} /> LIVE
                </div>
              )}
            </div>
            <div className={styles.visualizer}>
              {isConnected ? (
                // Live AtomSpace Visualization
                <>
                  {simulationState.realNodes &&
                  simulationState.realNodes.length === 0 ? (
                    <div className={styles.empty_state_msg}>
                      Waiting for knowledge...
                    </div>
                  ) : (
                    (simulationState.realNodes || []).map(
                      (node: string, i: number) => (
                        <div
                          key={i}
                          className={classNames(styles.node, styles.real)}
                          style={{
                            top: `${
                              50 +
                              30 *
                                Math.sin(
                                  i *
                                    ((Math.PI * 2) /
                                      (simulationState.realNodes || []).length),
                                )
                            }%`,
                            left: `${
                              50 +
                              30 *
                                Math.cos(
                                  i *
                                    ((Math.PI * 2) /
                                      (simulationState.realNodes || []).length),
                                )
                            }%`,
                          }}
                        >
                          {node}
                        </div>
                      ),
                    )
                  )}
                </>
              ) : (
                // Simplified Visualizer for TS Port (Simulation)
                <>
                  <div
                    className={styles.node}
                    style={{ top: "50%", left: "50%" }}
                  >
                    Core
                  </div>
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className={styles.node}
                      style={{
                        top: `${50 + 30 * Math.sin((i * Math.PI) / 3)}%`,
                        left: `${50 + 30 * Math.cos((i * Math.PI) / 3)}%`,
                        backgroundColor: i % 2 === 0 ? "#6366f1" : "#a5b4fc",
                      }}
                    />
                  ))}
                </>
              )}

              <div className={styles.sim_controls}>
                <span>
                  Visualization Mode:{" "}
                  {isConnected ? "Hypergraph Projection" : "Prime Resonance"}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DeepTreeEchoHub;

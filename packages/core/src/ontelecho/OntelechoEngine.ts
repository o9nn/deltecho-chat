/**
 * OntelechoEngine.ts — Ontelecho Cosmic Order Cognitive Architecture Simulator
 *
 * Composition:
 *   ontelecho = /skill-creator( /dte-ksm-evo-autogenesis -> /system-sim )
 *   enriched with: triple enumeration (s0-s6, 85 models) + R⊕D⊗E algebra
 *
 * Maps DTE Autonomy Levels (L0–L5) onto Campbell's System N hierarchy (A000081),
 * drives the 12-step creative cycle as the evolution loop, and scores each
 * experimental commit against the three polar dimensions (Performance, Potential,
 * Commitment) and Alexander's 15 Properties of Living Structure.
 */

// ---------------------------------------------------------------------------
// A000081 — rooted tree counts (precomputed for n=0..9)
// ---------------------------------------------------------------------------
export const A000081: readonly number[] = [0, 1, 1, 2, 4, 9, 20, 48, 115, 286]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AutonomyLevel {
  level: string
  name: string
  system: number
  terms: number
  pd: string
  tree: string
}

export interface DTETerm {
  term: string
  type: 'Particular' | 'Universal'
  name: string
  business: string
  dimension: string
  dte: string
  mode: string
}

export interface TwelveStep {
  step: number
  dimension: 'Performance' | 'Potential' | 'Commitment'
  term: string
  mode: 'U' | 'E' | 'R'
  description: string
  property: string
}

export interface TripleModel {
  matula: string
  parens: string
  differential: string
  topology: 'ROOT' | 'NEST' | 'BRANCH' | 'BRIDGE'
  label: string
}

export interface ExperimentResult {
  experiment: number
  timestamp: string
  metricDelta: number
  coherenceScore: number
  status: 'keep' | 'discard'
  description: string
}

export interface EnergyState {
  T1: number
  T2: number
  T4: number
  T5: number
  T7: number
  T8: number
  T9: number
}

export interface CycleSnapshot {
  cycleNumber: number
  avgEnergy: number
  energy: EnergyState
  currentStep: TwelveStep
}

export interface OntelechoState {
  currentLevel: AutonomyLevel
  experiments: ExperimentResult[]
  energy: EnergyState
  cycleCount: number
  stepIndex: number
  lastCycleSnapshot: CycleSnapshot | null
}

// ---------------------------------------------------------------------------
// DTE Autonomy Level ↔ Campbell System mapping
// ---------------------------------------------------------------------------
export const AUTONOMY_LEVELS: readonly AutonomyLevel[] = [
  { level: 'L0', name: 'Void', system: 0, terms: 1, pd: 'Void', tree: '()' },
  {
    level: 'L1',
    name: 'Source',
    system: 1,
    terms: 1,
    pd: 'Source',
    tree: '(())',
  },
  {
    level: 'L2',
    name: 'Polarity',
    system: 2,
    terms: 2,
    pd: 'Polarity',
    tree: '((()))',
  },
  {
    level: 'L3',
    name: 'Structure',
    system: 3,
    terms: 4,
    pd: 'Structure',
    tree: '(((())))',
  },
  {
    level: 'L3.5',
    name: 'Exchange',
    system: 4,
    terms: 9,
    pd: 'Exchange',
    tree: '((((()))))',
  },
  {
    level: 'L4',
    name: 'Creativity',
    system: 5,
    terms: 20,
    pd: 'Creativity',
    tree: '(((((((())))))))',
  },
  {
    level: 'L4.5',
    name: 'Dynamics',
    system: 6,
    terms: 48,
    pd: 'Dynamics',
    tree: '((((((((()))))))))',
  },
  {
    level: 'L5',
    name: 'Rhythm',
    system: 7,
    terms: 115,
    pd: 'Rhythm',
    tree: '(()()()()()())',
  },
]

// ---------------------------------------------------------------------------
// System 4 — 9 Terms mapped to DTE subsystems
// ---------------------------------------------------------------------------
export const DTE_TERMS: readonly DTETerm[] = [
  {
    term: 'T1',
    type: 'Particular',
    name: 'Perception of Need',
    business: 'Sales',
    dimension: 'Performance',
    dte: 'Sensory Input / EchoBeats tick',
    mode: 'E/R',
  },
  {
    term: 'T2',
    type: 'Particular',
    name: 'Creation of Idea',
    business: 'Product Dev',
    dimension: 'Potential',
    dte: 'Hypothesis Generator / autoresearch',
    mode: 'E/R',
  },
  {
    term: 'T3',
    type: 'Universal',
    name: 'Transference',
    business: 'R&D',
    dimension: '(integrator)',
    dte: 'KSM Cycle Bridge',
    mode: 'U',
  },
  {
    term: 'T4',
    type: 'Particular',
    name: 'Ordered Input',
    business: 'Marketing',
    dimension: 'Performance',
    dte: 'Pattern Recognition / Memory Retrieval',
    mode: 'E/R',
  },
  {
    term: 'T5',
    type: 'Particular',
    name: 'Action Sequence',
    business: 'Production',
    dimension: 'Commitment',
    dte: 'Motor Output / git commit',
    mode: 'E/R',
  },
  {
    term: 'T6',
    type: 'Universal',
    name: 'Corporeal Body',
    business: 'Operations/HR',
    dimension: '(integrator)',
    dte: 'Reservoir ESN (embodied state)',
    mode: 'U',
  },
  {
    term: 'T7',
    type: 'Particular',
    name: 'Memory',
    business: 'Organization',
    dimension: 'Commitment',
    dte: 'echo-garden-of-memory / FAISS index',
    mode: 'E/R',
  },
  {
    term: 'T8',
    type: 'Particular',
    name: 'Balanced Response',
    business: 'Treasury',
    dimension: 'Potential',
    dte: 'Coherence Monitor / safety clamp',
    mode: 'E/R',
  },
  {
    term: 'T9',
    type: 'Universal',
    name: 'Universal Hierarchy',
    business: 'CEO/Board',
    dimension: '(integrator)',
    dte: 'CoreSelfEngine / T9 pivot',
    mode: 'U',
  },
]

// ---------------------------------------------------------------------------
// Alexander's 15 Properties of Living Structure
// ---------------------------------------------------------------------------
export const PROPERTIES: readonly string[] = [
  'Levels of Scale',
  'Strong Centres',
  'Boundaries',
  'Alternating Repetition',
  'Positive Space',
  'Good Shape',
  'Local Symmetries',
  'Deep Interlock',
  'Contrast',
  'Gradients',
  'Roughness',
  'Echoes',
  'The Void',
  'Simplicity and Inner Calm',
  'Not-Separateness',
]

// ---------------------------------------------------------------------------
// 12-step creative cycle
// ---------------------------------------------------------------------------
export const TWELVE_STEPS: readonly TwelveStep[] = [
  {
    step: 1,
    dimension: 'Performance',
    term: 'T9',
    mode: 'U',
    description: 'CoreSelf sets direction',
    property: PROPERTIES[0],
  },
  {
    step: 2,
    dimension: 'Performance',
    term: 'T1',
    mode: 'E',
    description: 'EchoBeats tick — sense need',
    property: PROPERTIES[1],
  },
  {
    step: 3,
    dimension: 'Performance',
    term: 'T8',
    mode: 'R',
    description: 'Coherence monitor budgets',
    property: PROPERTIES[2],
  },
  {
    step: 4,
    dimension: 'Performance',
    term: 'T4',
    mode: 'E',
    description: 'Memory retrieves patterns',
    property: PROPERTIES[3],
  },
  {
    step: 5,
    dimension: 'Potential',
    term: 'T9',
    mode: 'U',
    description: 'CoreSelf reviews hypothesis space',
    property: PROPERTIES[4],
  },
  {
    step: 6,
    dimension: 'Potential',
    term: 'T2',
    mode: 'E',
    description: 'autoresearch generates hypothesis',
    property: PROPERTIES[5],
  },
  {
    step: 7,
    dimension: 'Potential',
    term: 'T8',
    mode: 'R',
    description: 'Coherence monitor allocates',
    property: PROPERTIES[6],
  },
  {
    step: 8,
    dimension: 'Potential',
    term: 'T8',
    mode: 'E',
    description: 'Coherence monitor balances',
    property: PROPERTIES[7],
  },
  {
    step: 9,
    dimension: 'Commitment',
    term: 'T9',
    mode: 'U',
    description: 'CoreSelf commits to experiment',
    property: PROPERTIES[8],
  },
  {
    step: 10,
    dimension: 'Commitment',
    term: 'T5',
    mode: 'E',
    description: 'git commit — action sequence',
    property: PROPERTIES[9],
  },
  {
    step: 11,
    dimension: 'Commitment',
    term: 'T8',
    mode: 'R',
    description: 'Coherence monitor tracks',
    property: PROPERTIES[10],
  },
  {
    step: 12,
    dimension: 'Commitment',
    term: 'T7',
    mode: 'E',
    description: 'echo-garden encodes memory',
    property: PROPERTIES[11],
  },
]

// ---------------------------------------------------------------------------
// Triple Enumeration: s0–s6 (85 models)
// ---------------------------------------------------------------------------
export const TRIPLE_ENUM: Record<string, TripleModel[]> = {
  s0: [
    {
      matula: '1=p0',
      parens: '()',
      differential: 'f',
      topology: 'ROOT',
      label: 'Unit',
    },
  ],
  s1: [
    {
      matula: '2=p1',
      parens: '(())',
      differential: "f'f",
      topology: 'NEST',
      label: 'Distinct',
    },
  ],
  s2: [
    {
      matula: '4=p1p1',
      parens: '(()())',
      differential: "f''(f,f)",
      topology: 'BRANCH',
      label: 'Conjunct',
    },
    {
      matula: '3=p2',
      parens: '((()))',
      differential: "f'f'f",
      topology: 'NEST',
      label: 'Disjunct',
    },
  ],
  s3: [
    {
      matula: '8=p1p1p1',
      parens: '(()()())',
      differential: "f'''(f,f,f)",
      topology: 'BRANCH',
      label: 'Concurrent',
    },
    {
      matula: '7=p4',
      parens: '((()()))',
      differential: "f'f''(f,f)",
      topology: 'BRIDGE',
      label: 'Explicit',
    },
    {
      matula: '6=p2p1',
      parens: '((())())',
      differential: "f''(f'f,f)",
      topology: 'BRIDGE',
      label: 'Implicit',
    },
    {
      matula: '5=p3',
      parens: '(((())))',
      differential: "f'f'f'f",
      topology: 'NEST',
      label: 'Sequent',
    },
  ],
  s4: [
    {
      matula: '9=p2p2',
      parens: '((())(()))',
      differential: "f''(f'f,f'f)",
      topology: 'BRIDGE',
      label: 'T1-Perception',
    },
    {
      matula: '10=p3p1',
      parens: '(((()))())',
      differential: "f''(f'f'f,f)",
      topology: 'BRIDGE',
      label: 'T2-Idea',
    },
    {
      matula: '11=p5',
      parens: '((((()))))  ',
      differential: "f'f'f'f'f",
      topology: 'NEST',
      label: 'T3-Transference',
    },
    {
      matula: '12=p2p1p1',
      parens: '((())()())',
      differential: "f'''(f'f,f,f)",
      topology: 'BRIDGE',
      label: 'T4-Input',
    },
    {
      matula: '13=p6',
      parens: '(((())()))',
      differential: "f'f''(f'f,f)",
      topology: 'BRIDGE',
      label: 'T5-Action',
    },
    {
      matula: '14=p4p1',
      parens: '((()())())',
      differential: "f''(f''(f,f),f)",
      topology: 'BRIDGE',
      label: 'T6-Body',
    },
    {
      matula: '16=p1p1p1p1',
      parens: '(()()()())',
      differential: "f''''(f,f,f,f)",
      topology: 'BRANCH',
      label: 'T7-Memory',
    },
    {
      matula: '17=p7',
      parens: '(((()())))',
      differential: "f'f'f''(f,f)",
      topology: 'BRIDGE',
      label: 'T8-Balance',
    },
    {
      matula: '19=p8',
      parens: '((()()()))',
      differential: "f'f'''(f,f,f)",
      topology: 'BRIDGE',
      label: 'T9-Hierarchy',
    },
  ],
  s5: [
    {
      matula: '15=p3p2',
      parens: '(((()))(()))',
      differential: "f''(f'f'f,f'f)",
      topology: 'BRIDGE',
      label: 'ER-ABM',
    },
    {
      matula: '18=p2p2p1',
      parens: '((())(())())',
      differential: "f'''(f'f,f'f,f)",
      topology: 'BRIDGE',
      label: 'ET-DSM',
    },
    {
      matula: '20=p3p1p1',
      parens: '(((()))()())',
      differential: "f'''(f'f'f,f,f)",
      topology: 'BRIDGE',
      label: 'SF-SDM',
    },
    {
      matula: '21=p4p2',
      parens: '((()())(()))',
      differential: "f''(f''(f,f),f'f)",
      topology: 'BRIDGE',
      label: 'NS-FH',
    },
    {
      matula: '22=p5p1',
      parens: '((((())))())',
      differential: "f''(f'f'f'f,f)",
      topology: 'BRIDGE',
      label: 'MAFS',
    },
    {
      matula: '23=p9',
      parens: '(((())(())))',
      differential: "f'f''(f'f,f'f)",
      topology: 'BRIDGE',
      label: 'FKG-TR',
    },
    {
      matula: '24=p2p1p1p1',
      parens: '((())()()())',
      differential: "f''''(f'f,f,f,f)",
      topology: 'BRIDGE',
      label: 'FCIM',
    },
    {
      matula: '26=p6p1',
      parens: '(((())())())',
      differential: "f''(f''(f'f,f),f)",
      topology: 'BRIDGE',
      label: 'FSAA',
    },
    {
      matula: '28=p4p1p1',
      parens: '((()())()())',
      differential: "f'''(f''(f,f),f,f)",
      topology: 'BRIDGE',
      label: 'FADA',
    },
    {
      matula: '29=p10',
      parens: '((((()))()))',
      differential: "f'f''(f'f'f,f)",
      topology: 'BRIDGE',
      label: 'FFA',
    },
    {
      matula: '31=p11',
      parens: '(((((())))))',
      differential: "f'f'f'f'f'f",
      topology: 'NEST',
      label: 'FPOA',
    },
    {
      matula: '32=p1^5',
      parens: '(()()()()())',
      differential: "f'''''(f,f,f,f,f)",
      topology: 'BRANCH',
      label: 'FRCA',
    },
    {
      matula: '34=p7p1',
      parens: '(((()()))())',
      differential: "f''(f'f''(f,f),f)",
      topology: 'BRIDGE',
      label: 'FRAA',
    },
    {
      matula: '37=p12',
      parens: '(((())()()))',
      differential: "f'f'''(f'f,f,f)",
      topology: 'BRIDGE',
      label: 'FMSA',
    },
    {
      matula: '38=p8p1',
      parens: '((()()())())',
      differential: "f''(f'''(f,f,f),f)",
      topology: 'BRIDGE',
      label: 'FDIA',
    },
    {
      matula: '41=p13',
      parens: '((((())())) )',
      differential: "f'f'f''(f'f,f)",
      topology: 'BRIDGE',
      label: 'FDSA',
    },
    {
      matula: '43=p14',
      parens: '(((()())()))',
      differential: "f'f''(f''(f,f),f)",
      topology: 'BRIDGE',
      label: 'FFDA',
    },
    {
      matula: '53=p16',
      parens: '((()()()()))',
      differential: "f'f''''(f,f,f,f)",
      topology: 'BRIDGE',
      label: 'FCSA',
    },
    {
      matula: '59=p17',
      parens: '((((()())))',
      differential: "f'f'f'f''(f,f)",
      topology: 'BRIDGE',
      label: 'FMSAA',
    },
    {
      matula: '67=p19',
      parens: '(((()()())) )',
      differential: "f'f'f'''(f,f,f)",
      topology: 'BRIDGE',
      label: 'FTSA',
    },
  ],
}

// ---------------------------------------------------------------------------
// Wizardman 20 named models
// ---------------------------------------------------------------------------
export const WIZARDMAN_NAMES: Record<string, string> = {
  'ER-ABM': 'Entity-Relation Agent-Based Model',
  'ET-DSM': 'Event-Transition Discrete State Machine',
  'SF-SDM': 'Stock-Flow System Dynamics Model',
  'NS-FH': 'Neuro-Symbolic Financial Hypergraph',
  MAFS: 'Multi-Agent Financial Simulation',
  'FKG-TR': 'Financial Knowledge Graph & Transaction Reasoning',
  FCIM: 'Financial Causal Inference Model',
  FSAA: 'Financial Sentiment Analysis Agent',
  FADA: 'Financial Anomaly Detection Agent',
  FFA: 'Financial Forecasting Agent',
  FPOA: 'Financial Portfolio Optimization Agent',
  FRCA: 'Financial Risk & Compliance Agent',
  FRAA: 'Financial Regulatory Analysis Agent',
  FMSA: 'Financial Market Simulation Agent',
  FDIA: 'Financial Data Integration Agent',
  FDSA: 'Financial Decision Support Agent',
  FFDA: 'Financial Fraud Detection Agent',
  FCSA: 'Financial Customer Service Agent',
  FMSAA: 'Financial Market Sentiment Analysis Agent',
  FTSA: 'Financial Time Series Agent',
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class OntelechoEngine {
  private state: OntelechoState

  constructor(savedState?: Partial<OntelechoState>) {
    this.state = {
      currentLevel: savedState?.currentLevel ?? AUTONOMY_LEVELS[4], // L3.5 Exchange
      experiments: savedState?.experiments ?? [],
      energy: savedState?.energy ?? {
        T1: 0.5,
        T2: 0.5,
        T4: 0.5,
        T5: 0.5,
        T7: 0.5,
        T8: 0.8,
        T9: 1.0,
      },
      cycleCount: savedState?.cycleCount ?? 0,
      stepIndex: savedState?.stepIndex ?? 0,
      lastCycleSnapshot: savedState?.lastCycleSnapshot ?? null,
    }
  }

  // --- State accessors ---

  getState(): OntelechoState {
    return { ...this.state }
  }

  getCurrentLevel(): AutonomyLevel {
    return this.state.currentLevel
  }

  getEnergy(): EnergyState {
    return { ...this.state.energy }
  }

  getExperiments(): ExperimentResult[] {
    return [...this.state.experiments]
  }

  // --- Level computation ---

  computeLevel(): AutonomyLevel {
    const kept = this.state.experiments.filter(e => e.status === 'keep').length
    const thresholds = [0, 1, 2, 4, 9, 20, 48, 115]
    let levelIdx = 0
    for (let i = 0; i < thresholds.length; i++) {
      if (kept >= thresholds[i]) {
        levelIdx = i
      }
    }
    return AUTONOMY_LEVELS[Math.min(levelIdx, AUTONOMY_LEVELS.length - 1)]
  }

  // --- Coherence scoring ---

  computeCoherence(description: string, metricDelta: number): number {
    let base = 0.75
    if (metricDelta > 0) {
      base += Math.min(0.2, metricDelta * 0.1)
    } else if (metricDelta < 0) {
      base += Math.max(-0.3, metricDelta * 0.1)
    }
    const keywords = [
      'boundary',
      'scale',
      'centre',
      'interlock',
      'echo',
      'gradient',
      'void',
      'simplicity',
      'roughness',
    ]
    for (const kw of keywords) {
      if (description.toLowerCase().includes(kw)) {
        base += 0.01
      }
    }
    return Math.round(Math.min(1.0, Math.max(0.0, base)) * 1000) / 1000
  }

  // --- Experiment logging ---

  logExperiment(description: string, metricDelta: number): ExperimentResult {
    const score = this.computeCoherence(description, metricDelta)
    const status: 'keep' | 'discard' =
      metricDelta >= 0 && score >= 0.6 ? 'keep' : 'discard'
    const result: ExperimentResult = {
      experiment: this.state.experiments.length,
      timestamp: new Date().toISOString(),
      metricDelta,
      coherenceScore: score,
      status,
      description,
    }
    this.state.experiments.push(result)
    this.state.currentLevel = this.computeLevel()
    return result
  }

  // --- Energy flow simulation ---

  tickStep(): CycleSnapshot {
    const stepDef = TWELVE_STEPS[this.state.stepIndex]
    const energy = this.state.energy

    if (stepDef.mode === 'E') {
      const key = stepDef.term as keyof EnergyState
      if (key in energy) {
        energy[key] = Math.min(1.0, energy[key] + 0.05)
      }
      energy.T9 = Math.max(0.1, energy.T9 - 0.02)
    } else {
      const key = stepDef.term as keyof EnergyState
      if (key in energy) {
        energy[key] = Math.max(0.1, energy[key] - 0.03)
      }
      energy.T9 = Math.min(1.0, energy.T9 + 0.01)
    }

    this.state.stepIndex = (this.state.stepIndex + 1) % 12
    if (this.state.stepIndex === 0) {
      this.state.cycleCount++
    }

    const avgEnergy =
      Object.values(energy).reduce((a, b) => a + b, 0) /
      Object.keys(energy).length

    const snapshot: CycleSnapshot = {
      cycleNumber: this.state.cycleCount,
      avgEnergy: Math.round(avgEnergy * 1000) / 1000,
      energy: { ...energy },
      currentStep: stepDef,
    }

    this.state.lastCycleSnapshot = snapshot
    return snapshot
  }

  // --- Run a full 12-step cycle ---

  runFullCycle(): CycleSnapshot[] {
    const snapshots: CycleSnapshot[] = []
    for (let i = 0; i < 12; i++) {
      snapshots.push(this.tickStep())
    }
    return snapshots
  }

  // --- Simulate N steps ---

  simulate(n: number): CycleSnapshot[] {
    const snapshots: CycleSnapshot[] = []
    for (let i = 0; i < n; i++) {
      const snap = this.tickStep()
      if ((i + 1) % 12 === 0) {
        snapshots.push(snap)
      }
    }
    return snapshots
  }

  // --- Triple enumeration ---

  getTripleEnum(level?: string): Record<string, TripleModel[]> {
    if (level && level in TRIPLE_ENUM) {
      return { [level]: TRIPLE_ENUM[level] }
    }
    return TRIPLE_ENUM
  }

  getTotalModelCount(): number {
    return Object.values(TRIPLE_ENUM).reduce(
      (sum, models) => sum + models.length,
      0
    )
  }

  lookupMatula(query: string): (TripleModel & { level: string })[] {
    const results: (TripleModel & { level: string })[] = []
    for (const [lvl, models] of Object.entries(TRIPLE_ENUM)) {
      for (const model of models) {
        const numPart = model.matula.split('=')[0].trim()
        if (numPart === query || model.matula.includes(query)) {
          results.push({ ...model, level: lvl })
        }
      }
    }
    return results
  }

  // --- R+D+E Algebra ---

  getRDEAlgebra(): string {
    return `ontelecho_cycle = Performance + (Potential * Commitment)
                  = R + (D * E)

Operators:
  + (additive / concurrent)    -- Research sub-loops inserted at any phase
  * (multiplicative / pipeline) -- Development phases composed with evolution steps

Semiring roles:
  R (Research)    -> T2 Creation of Idea   -- concurrent hypothesis generation
  D (Development) -> T5 Action Sequence    -- sequential git commits
  E (Evolution)   -> T7 Memory            -- structural encoding in echo-garden

Tree notation:
  (1)(2)  =>  (1) + (2)    [BRANCH topology -- siblings at same depth]
  ((1)2)  =>  (1) * (2)    [NEST topology   -- child inside parent]

Fixed point (L5 Autogenesis):
  (()()()()()()...)  -- star topology
  All branches concurrent from a single root.
  D*E collapses to +: every commit is simultaneously a research step.
  This is Autogenesis: the three activities become one.`
  }

  // --- Serialization ---

  serialize(): string {
    return JSON.stringify(this.state, null, 2)
  }

  static deserialize(json: string): OntelechoEngine {
    const parsed = JSON.parse(json)
    return new OntelechoEngine(parsed)
  }
}

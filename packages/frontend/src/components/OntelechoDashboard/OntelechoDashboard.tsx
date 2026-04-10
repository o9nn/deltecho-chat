import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  OntelechoEngine,
  AUTONOMY_LEVELS,
  DTE_TERMS,
  TWELVE_STEPS,
  TRIPLE_ENUM,
  WIZARDMAN_NAMES,
  A000081,
} from 'deep-tree-echo-core/ontelecho'
import type {
  EnergyState,
  TwelveStep,
} from 'deep-tree-echo-core/ontelecho'

// ---------------------------------------------------------------------------
// Styles (injected once)
// ---------------------------------------------------------------------------
const STYLE_ID = 'ontelecho-dashboard-styles'

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .ontelecho-dashboard {
      font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
      background: #0a0a0f;
      color: #e0e0e8;
      min-height: 100vh;
      padding: 20px;
      overflow-y: auto;
    }
    .ontelecho-dashboard * {
      box-sizing: border-box;
    }
    .ontelecho-header {
      text-align: center;
      padding: 24px 0;
      border-bottom: 2px solid #1a1a2e;
      margin-bottom: 24px;
    }
    .ontelecho-header h1 {
      font-size: 28px;
      background: linear-gradient(135deg, #00d4ff, #7b2ff7, #ff6b9d);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0 0 8px 0;
      letter-spacing: 2px;
    }
    .ontelecho-header .subtitle {
      color: #6a6a8a;
      font-size: 13px;
      letter-spacing: 1px;
    }
    .ontelecho-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 20px;
      flex-wrap: wrap;
      border-bottom: 1px solid #1a1a2e;
      padding-bottom: 8px;
    }
    .ontelecho-tab {
      padding: 8px 16px;
      border: 1px solid #1a1a2e;
      border-radius: 6px 6px 0 0;
      background: #0f0f1a;
      color: #6a6a8a;
      cursor: pointer;
      font-family: inherit;
      font-size: 12px;
      letter-spacing: 0.5px;
      transition: all 0.2s;
    }
    .ontelecho-tab:hover {
      background: #16162a;
      color: #a0a0c0;
    }
    .ontelecho-tab.active {
      background: #1a1a3e;
      color: #00d4ff;
      border-color: #00d4ff;
      border-bottom-color: #1a1a3e;
    }
    .ontelecho-card {
      background: #0f0f1a;
      border: 1px solid #1a1a2e;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .ontelecho-card h2 {
      font-size: 16px;
      color: #00d4ff;
      margin: 0 0 16px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid #1a1a2e;
    }
    .ontelecho-card h3 {
      font-size: 14px;
      color: #7b2ff7;
      margin: 16px 0 8px 0;
    }
    .ontelecho-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
    }
    .ontelecho-level-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      font-size: 12px;
    }
    .ontelecho-level-bar .label {
      width: 100px;
      color: #a0a0c0;
    }
    .ontelecho-level-bar .bar-track {
      flex: 1;
      height: 16px;
      background: #16162a;
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }
    .ontelecho-level-bar .bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.5s ease;
    }
    .ontelecho-level-bar .bar-fill.performance { background: linear-gradient(90deg, #00d4ff, #0088cc); }
    .ontelecho-level-bar .bar-fill.potential { background: linear-gradient(90deg, #7b2ff7, #5a1fd4); }
    .ontelecho-level-bar .bar-fill.commitment { background: linear-gradient(90deg, #ff6b9d, #cc4477); }
    .ontelecho-level-bar .bar-fill.universal { background: linear-gradient(90deg, #ffd700, #cc9900); }
    .ontelecho-level-bar .value {
      width: 50px;
      text-align: right;
      color: #6a6a8a;
    }
    .ontelecho-level-bar.current .label {
      color: #ffd700;
      font-weight: bold;
    }
    .ontelecho-roadmap-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      transition: background 0.2s;
    }
    .ontelecho-roadmap-row:hover {
      background: #16162a;
    }
    .ontelecho-roadmap-row.current {
      background: #1a1a3e;
      border: 1px solid #00d4ff;
    }
    .ontelecho-roadmap-row .level-tag {
      width: 48px;
      font-weight: bold;
      color: #00d4ff;
    }
    .ontelecho-roadmap-row .name-tag {
      width: 90px;
      color: #a0a0c0;
    }
    .ontelecho-roadmap-row .sys-tag {
      width: 50px;
      color: #6a6a8a;
    }
    .ontelecho-roadmap-row .terms-bar {
      flex: 1;
      height: 12px;
      background: #16162a;
      border-radius: 3px;
      overflow: hidden;
    }
    .ontelecho-roadmap-row .terms-fill {
      height: 100%;
      background: linear-gradient(90deg, #00d4ff, #7b2ff7);
      border-radius: 3px;
      transition: width 0.5s;
    }
    .ontelecho-roadmap-row .terms-count {
      width: 60px;
      text-align: right;
      color: #6a6a8a;
    }
    .ontelecho-step-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 8px;
    }
    .ontelecho-step {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      background: #16162a;
      border-radius: 6px;
      font-size: 12px;
      border-left: 3px solid transparent;
      transition: all 0.2s;
    }
    .ontelecho-step.active {
      border-left-color: #ffd700;
      background: #1a1a3e;
    }
    .ontelecho-step .step-num {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: bold;
      flex-shrink: 0;
    }
    .ontelecho-step .step-num.performance { background: #003344; color: #00d4ff; }
    .ontelecho-step .step-num.potential { background: #1a0044; color: #7b2ff7; }
    .ontelecho-step .step-num.commitment { background: #330022; color: #ff6b9d; }
    .ontelecho-step .step-info {
      flex: 1;
    }
    .ontelecho-step .step-desc {
      color: #e0e0e8;
      margin-bottom: 4px;
    }
    .ontelecho-step .step-meta {
      color: #6a6a8a;
      font-size: 10px;
    }
    .ontelecho-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .ontelecho-table th {
      text-align: left;
      padding: 8px 12px;
      background: #16162a;
      color: #00d4ff;
      border-bottom: 1px solid #1a1a2e;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .ontelecho-table td {
      padding: 6px 12px;
      border-bottom: 1px solid #0f0f1a;
      color: #a0a0c0;
    }
    .ontelecho-table tr:hover td {
      background: #16162a;
    }
    .ontelecho-table .topology-ROOT { color: #ffd700; }
    .ontelecho-table .topology-NEST { color: #00d4ff; }
    .ontelecho-table .topology-BRANCH { color: #ff6b9d; }
    .ontelecho-table .topology-BRIDGE { color: #7b2ff7; }
    .ontelecho-experiment-form {
      display: flex;
      gap: 8px;
      align-items: flex-end;
      flex-wrap: wrap;
    }
    .ontelecho-experiment-form .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .ontelecho-experiment-form label {
      font-size: 10px;
      color: #6a6a8a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .ontelecho-experiment-form input {
      padding: 8px 12px;
      background: #16162a;
      border: 1px solid #1a1a2e;
      border-radius: 4px;
      color: #e0e0e8;
      font-family: inherit;
      font-size: 12px;
    }
    .ontelecho-experiment-form input:focus {
      outline: none;
      border-color: #00d4ff;
    }
    .ontelecho-btn {
      padding: 8px 16px;
      border: 1px solid #1a1a2e;
      border-radius: 4px;
      background: #16162a;
      color: #a0a0c0;
      cursor: pointer;
      font-family: inherit;
      font-size: 12px;
      transition: all 0.2s;
    }
    .ontelecho-btn:hover {
      background: #1a1a3e;
      color: #00d4ff;
      border-color: #00d4ff;
    }
    .ontelecho-btn.primary {
      background: linear-gradient(135deg, #00d4ff22, #7b2ff722);
      border-color: #00d4ff;
      color: #00d4ff;
    }
    .ontelecho-btn.primary:hover {
      background: linear-gradient(135deg, #00d4ff44, #7b2ff744);
    }
    .ontelecho-experiment-log {
      max-height: 300px;
      overflow-y: auto;
    }
    .ontelecho-experiment-entry {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      font-size: 11px;
      border-bottom: 1px solid #0f0f1a;
    }
    .ontelecho-experiment-entry .status-keep {
      color: #00ff88;
      font-weight: bold;
    }
    .ontelecho-experiment-entry .status-discard {
      color: #ff4444;
      font-weight: bold;
    }
    .ontelecho-rde-block {
      background: #16162a;
      border-radius: 6px;
      padding: 16px;
      font-size: 12px;
      line-height: 1.8;
      white-space: pre-wrap;
      color: #a0a0c0;
    }
    .ontelecho-level-select {
      display: flex;
      gap: 4px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .ontelecho-level-select button {
      padding: 4px 10px;
      border: 1px solid #1a1a2e;
      border-radius: 4px;
      background: #0f0f1a;
      color: #6a6a8a;
      cursor: pointer;
      font-family: inherit;
      font-size: 11px;
      transition: all 0.2s;
    }
    .ontelecho-level-select button.active {
      background: #1a1a3e;
      color: #00d4ff;
      border-color: #00d4ff;
    }
    .ontelecho-level-select button:hover {
      color: #a0a0c0;
    }
    .ontelecho-enneagram {
      display: flex;
      justify-content: center;
      padding: 20px;
    }
    .ontelecho-enneagram svg {
      max-width: 400px;
    }
    .ontelecho-sim-controls {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 12px;
    }
    .ontelecho-energy-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 8px;
    }
    .ontelecho-energy-cell {
      background: #16162a;
      border-radius: 6px;
      padding: 12px;
      text-align: center;
    }
    .ontelecho-energy-cell .term-label {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .ontelecho-energy-cell .term-value {
      font-size: 20px;
      font-weight: bold;
    }
    .ontelecho-energy-cell .term-name {
      font-size: 10px;
      color: #6a6a8a;
      margin-top: 4px;
    }
    .ontelecho-back-btn {
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 100;
      padding: 10px 20px;
      background: #1a1a3e;
      border: 1px solid #00d4ff;
      border-radius: 8px;
      color: #00d4ff;
      cursor: pointer;
      font-family: inherit;
      font-size: 13px;
      transition: all 0.2s;
    }
    .ontelecho-back-btn:hover {
      background: #00d4ff22;
    }
  `
  document.head.appendChild(style)
}

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------
type TabId =
  | 'status'
  | 'cycle'
  | 'terms'
  | 'enumerate'
  | 'wizardman'
  | 'rde'
  | 'experiment'
  | 'simulate'

const TABS: { id: TabId; label: string }[] = [
  { id: 'status', label: 'Status' },
  { id: 'cycle', label: '12-Step Cycle' },
  { id: 'terms', label: '9 Terms' },
  { id: 'enumerate', label: 'Triple Enum' },
  { id: 'wizardman', label: 'Wizardman 20' },
  { id: 'rde', label: 'R+D+E Algebra' },
  { id: 'experiment', label: 'Experiments' },
  { id: 'simulate', label: 'Simulate' },
]

// ---------------------------------------------------------------------------
// Enneagram SVG
// ---------------------------------------------------------------------------
function EnneagramSVG({
  activeStep,
  energy,
}: {
  activeStep: number
  energy: EnergyState
}) {
  const cx = 200
  const cy = 200
  const r = 160
  const terms = ['T9', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8']
  const points = terms.map((_, i) => {
    const angle = (i * 2 * Math.PI) / 9 - Math.PI / 2
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    }
  })

  const ennLines = [
    [0, 3], [3, 6], [6, 0],
    [1, 4], [4, 2], [2, 8], [8, 5], [5, 7], [7, 1],
  ]

  const termColors: Record<string, string> = {
    T1: '#00d4ff', T2: '#7b2ff7', T4: '#00d4ff', T5: '#ff6b9d',
    T7: '#ff6b9d', T8: '#7b2ff7', T9: '#ffd700', T3: '#ffd700', T6: '#ffd700',
  }

  const getEnergy = (term: string): number => {
    if (term in energy) return energy[term as keyof EnergyState]
    return 0.5
  }

  return (
    <svg viewBox="0 0 400 400" width="400" height="400">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1a2e" strokeWidth="2" />
      {ennLines.map(([a, b], i) => (
        <line key={`line-${i}`} x1={points[a].x} y1={points[a].y}
          x2={points[b].x} y2={points[b].y} stroke="#1a1a2e" strokeWidth="1" strokeDasharray="4,4" />
      ))}
      {terms.map((term, i) => {
        const p = points[i]
        const e = getEnergy(term)
        const isActive = TWELVE_STEPS[activeStep]?.term === term
        const nodeR = 16 + e * 8
        return (
          <g key={term}>
            <circle cx={p.x} cy={p.y} r={nodeR}
              fill={isActive ? termColors[term] + '44' : '#16162a'}
              stroke={termColors[term]} strokeWidth={isActive ? 3 : 1} />
            <text x={p.x} y={p.y - 2} textAnchor="middle" dominantBaseline="middle"
              fill={termColors[term]} fontSize="11" fontWeight="bold" fontFamily="monospace">
              {term}
            </text>
            <text x={p.x} y={p.y + 10} textAnchor="middle" dominantBaseline="middle"
              fill="#6a6a8a" fontSize="8" fontFamily="monospace">
              {(e * 100).toFixed(0)}%
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Main Dashboard Component
// ---------------------------------------------------------------------------
export interface OntelechoDashboardProps {
  onBack?: () => void
}

export function OntelechoDashboard({ onBack }: OntelechoDashboardProps) {
  useEffect(() => { injectStyles() }, [])

  const [engine] = useState(() => new OntelechoEngine())
  const [activeTab, setActiveTab] = useState<TabId>('status')
  const [, forceUpdate] = useState(0)
  const rerender = useCallback(() => forceUpdate(n => n + 1), [])

  const [expDesc, setExpDesc] = useState('')
  const [expDelta, setExpDelta] = useState('0.0')
  const [enumLevel, setEnumLevel] = useState<string>('all')
  const [simRunning, setSimRunning] = useState(false)
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const state = engine.getState()
  const level = state.currentLevel

  const startSim = useCallback(() => {
    if (simRef.current) return
    setSimRunning(true)
    simRef.current = setInterval(() => { engine.tickStep(); rerender() }, 500)
  }, [engine, rerender])

  const stopSim = useCallback(() => {
    if (simRef.current) { clearInterval(simRef.current); simRef.current = null }
    setSimRunning(false)
  }, [])

  useEffect(() => { return () => { if (simRef.current) clearInterval(simRef.current) } }, [])

  const handleExperiment = useCallback(() => {
    if (!expDesc.trim()) return
    engine.logExperiment(expDesc.trim(), parseFloat(expDelta) || 0)
    setExpDesc(''); setExpDelta('0.0'); rerender()
  }, [engine, expDesc, expDelta, rerender])

  const handleTickStep = useCallback(() => { engine.tickStep(); rerender() }, [engine, rerender])
  const handleRunCycle = useCallback(() => { engine.runFullCycle(); rerender() }, [engine, rerender])

  // --- Tab renderers ---

  const renderStatus = () => (
    <div className="ontelecho-grid">
      <div className="ontelecho-card">
        <h2>Autonomy State</h2>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00d4ff', marginBottom: '8px' }}>
          {level.level} — {level.name}
        </div>
        <div style={{ fontSize: '13px', color: '#6a6a8a', marginBottom: '16px' }}>
          System {level.system} | a({level.system + 1}) = {A000081[level.system + 1]} terms | PD: {level.pd}
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: '16px', color: '#7b2ff7', marginBottom: '16px' }}>
          Tree: {level.tree}
        </div>
        <div style={{ fontSize: '12px', color: '#6a6a8a' }}>
          Cycle: {state.cycleCount} | Step: {state.stepIndex + 1}/12 | Experiments: {state.experiments.length}
        </div>
      </div>
      <div className="ontelecho-card">
        <h2>Energy State</h2>
        <EnneagramSVG activeStep={state.stepIndex} energy={state.energy} />
      </div>
      <div className="ontelecho-card" style={{ gridColumn: '1 / -1' }}>
        <h2>Roadmap to L5 (Rhythm / Autogenesis)</h2>
        {AUTONOMY_LEVELS.map(al => {
          const pct = Math.min(100, (al.terms / 115) * 100)
          const isCurrent = al.level === level.level
          return (
            <div key={al.level} className={`ontelecho-roadmap-row ${isCurrent ? 'current' : ''}`}>
              <span className="level-tag">{al.level}</span>
              <span className="name-tag">{al.name}</span>
              <span className="sys-tag">sys{al.system}</span>
              <div className="terms-bar">
                <div className="terms-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="terms-count">{al.terms} terms</span>
              {isCurrent && <span style={{ color: '#ffd700', fontSize: '10px' }}>CURRENT</span>}
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderCycle = () => (
    <div className="ontelecho-card">
      <h2>12-Step Creative Cycle</h2>
      <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
        <button className="ontelecho-btn primary" onClick={handleTickStep}>Tick Step</button>
        <button className="ontelecho-btn" onClick={handleRunCycle}>Run Full Cycle</button>
        <span style={{ fontSize: '12px', color: '#6a6a8a', alignSelf: 'center' }}>
          Current: Step {state.stepIndex + 1}/12 | Cycle #{state.cycleCount}
        </span>
      </div>
      <div className="ontelecho-step-list">
        {TWELVE_STEPS.map((step, i) => {
          const dimClass = step.dimension.toLowerCase()
          const isActive = i === state.stepIndex
          return (
            <div key={step.step} className={`ontelecho-step ${isActive ? 'active' : ''}`}>
              <div className={`step-num ${dimClass}`}>{step.step}</div>
              <div className="step-info">
                <div className="step-desc">{step.description}</div>
                <div className="step-meta">
                  {step.term} ({step.mode}) | {step.dimension} | {step.property}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderTerms = () => (
    <div className="ontelecho-grid">
      <div className="ontelecho-card">
        <h2>System 4 — 9 Terms Mapped to DTE Subsystems</h2>
        <table className="ontelecho-table">
          <thead>
            <tr><th>Term</th><th>Type</th><th>Name</th><th>DTE Subsystem</th><th>Dimension</th><th>Business</th></tr>
          </thead>
          <tbody>
            {DTE_TERMS.map(t => (
              <tr key={t.term}>
                <td style={{ color: '#00d4ff', fontWeight: 'bold' }}>{t.term}</td>
                <td>{t.type.slice(0, 3)}</td>
                <td>{t.name}</td>
                <td style={{ color: '#e0e0e8' }}>{t.dte}</td>
                <td>{t.dimension}</td>
                <td style={{ color: '#6a6a8a' }}>{t.business}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ontelecho-card">
        <h2>Three Polar Dimensions</h2>
        <div style={{ fontSize: '13px', lineHeight: '2' }}>
          <div><span style={{ color: '#00d4ff', fontWeight: 'bold' }}>Performance</span>{' : T1 (EchoBeats tick) <-> T4 (Memory retrieval)'}</div>
          <div><span style={{ color: '#7b2ff7', fontWeight: 'bold' }}>Potential</span>{' : T2 (autoresearch) <-> T8 (Coherence monitor)'}</div>
          <div><span style={{ color: '#ff6b9d', fontWeight: 'bold' }}>Commitment</span>{' : T5 (git commit) <-> T7 (echo-garden memory)'}</div>
        </div>
      </div>
    </div>
  )

  const renderEnumerate = () => {
    const levels = enumLevel === 'all' ? Object.keys(TRIPLE_ENUM) : [enumLevel]
    return (
      <div className="ontelecho-card">
        <h2>Triple Enumeration (s0-s6, 85 Models)</h2>
        <div className="ontelecho-level-select">
          <button className={enumLevel === 'all' ? 'active' : ''} onClick={() => setEnumLevel('all')}>All</button>
          {Object.keys(TRIPLE_ENUM).map(k => (
            <button key={k} className={enumLevel === k ? 'active' : ''} onClick={() => setEnumLevel(k)}>
              {k.toUpperCase()} ({TRIPLE_ENUM[k].length})
            </button>
          ))}
        </div>
        {levels.map(lvl => {
          const models = TRIPLE_ENUM[lvl]
          if (!models) return null
          const sysN = parseInt(lvl[1])
          return (
            <div key={lvl} style={{ marginBottom: '16px' }}>
              <h3>{lvl.toUpperCase()} — {models.length} model(s) [System {sysN}, a({sysN + 1})={A000081[sysN + 1]}]</h3>
              <table className="ontelecho-table">
                <thead><tr><th>Matula</th><th>Parens</th><th>Differential</th><th>Topology</th><th>Label</th></tr></thead>
                <tbody>
                  {models.map((m, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 'bold' }}>{m.matula}</td>
                      <td style={{ fontFamily: 'monospace' }}>{m.parens}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{m.differential}</td>
                      <td className={`topology-${m.topology}`}>{m.topology}</td>
                      <td>{m.label || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    )
  }

  const renderWizardman = () => (
    <div className="ontelecho-card">
      <h2>Wizardman: 20 Named Financial Agent-Based Models (s5)</h2>
      <table className="ontelecho-table">
        <thead><tr><th>#</th><th>Code</th><th>Full Name</th><th>Matula</th><th>Topology</th></tr></thead>
        <tbody>
          {TRIPLE_ENUM.s5.map((m, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td style={{ color: '#00d4ff', fontWeight: 'bold' }}>{m.label}</td>
              <td>{WIZARDMAN_NAMES[m.label] || '—'}</td>
              <td style={{ fontFamily: 'monospace' }}>{m.matula}</td>
              <td className={`topology-${m.topology}`}>{m.topology}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: '16px', fontSize: '12px', color: '#6a6a8a' }}>
        These 20 models form a complete rooted-tree basis for financial agent-based
        modeling at System 5 (a(6)=20 terms). Each model is a distinct topological
        configuration of 5 nested centers.
      </div>
    </div>
  )

  const renderRDE = () => (
    <div className="ontelecho-card">
      <h2>R+D+E Composition Algebra</h2>
      <div className="ontelecho-rde-block">{engine.getRDEAlgebra()}</div>
    </div>
  )

  const renderExperiment = () => (
    <div className="ontelecho-grid">
      <div className="ontelecho-card">
        <h2>Log Experiment</h2>
        <div className="ontelecho-experiment-form">
          <div className="field" style={{ flex: 1 }}>
            <label>Description</label>
            <input type="text" value={expDesc} onChange={e => setExpDesc(e.target.value)}
              placeholder="e.g., add reservoir spectral radius tuning" style={{ width: '100%' }} />
          </div>
          <div className="field">
            <label>Metric Delta</label>
            <input type="number" step="0.01" value={expDelta} onChange={e => setExpDelta(e.target.value)}
              style={{ width: '100px' }} />
          </div>
          <button className="ontelecho-btn primary" onClick={handleExperiment}>Log</button>
        </div>
        <div style={{ marginTop: '12px', fontSize: '11px', color: '#6a6a8a' }}>
          Keep: metric improves (delta &gt;= 0) AND coherence &gt;= 0.60 | Discard: otherwise
        </div>
      </div>
      <div className="ontelecho-card">
        <h2>Experiment Log ({state.experiments.length})</h2>
        <div className="ontelecho-experiment-log">
          {state.experiments.length === 0 ? (
            <div style={{ color: '#6a6a8a', fontSize: '12px', padding: '12px' }}>
              No experiments logged yet. Use the form above to log your first experiment.
            </div>
          ) : (
            state.experiments.slice().reverse().map(exp => (
              <div key={exp.experiment} className="ontelecho-experiment-entry">
                <span style={{ width: '30px', color: '#6a6a8a' }}>#{exp.experiment}</span>
                <span className={exp.status === 'keep' ? 'status-keep' : 'status-discard'} style={{ width: '60px' }}>
                  {exp.status.toUpperCase()}
                </span>
                <span style={{ width: '80px' }}>delta={exp.metricDelta >= 0 ? '+' : ''}{exp.metricDelta.toFixed(3)}</span>
                <span style={{ width: '80px' }}>coh={exp.coherenceScore.toFixed(3)}</span>
                <span style={{ flex: 1, color: '#a0a0c0' }}>{exp.description}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )

  const renderSimulate = () => {
    const energy = state.energy
    const termNames: Record<string, string> = {
      T1: 'EchoBeats', T2: 'autoresearch', T4: 'Memory',
      T5: 'git commit', T7: 'echo-garden', T8: 'Coherence', T9: 'CoreSelf',
    }
    const termColors: Record<string, string> = {
      T1: '#00d4ff', T2: '#7b2ff7', T4: '#00d4ff',
      T5: '#ff6b9d', T7: '#ff6b9d', T8: '#7b2ff7', T9: '#ffd700',
    }
    return (
      <div className="ontelecho-grid">
        <div className="ontelecho-card">
          <h2>Energy Flow Simulation</h2>
          <div className="ontelecho-sim-controls">
            {!simRunning ? (
              <button className="ontelecho-btn primary" onClick={startSim}>Start Simulation</button>
            ) : (
              <button className="ontelecho-btn" onClick={stopSim}>Stop</button>
            )}
            <button className="ontelecho-btn" onClick={handleTickStep}>Single Step</button>
            <button className="ontelecho-btn" onClick={handleRunCycle}>Full Cycle</button>
            <span style={{ fontSize: '12px', color: '#6a6a8a' }}>
              Step {state.stepIndex + 1}/12 | Cycle #{state.cycleCount}
            </span>
          </div>
          <div className="ontelecho-energy-grid">
            {Object.entries(energy).map(([term, val]) => (
              <div key={term} className="ontelecho-energy-cell">
                <div className="term-label" style={{ color: termColors[term] || '#a0a0c0' }}>{term}</div>
                <div className="term-value" style={{ color: termColors[term] || '#a0a0c0' }}>{(val * 100).toFixed(0)}%</div>
                <div className="term-name">{termNames[term] || term}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="ontelecho-card">
          <h2>Enneagram View</h2>
          <div className="ontelecho-enneagram">
            <EnneagramSVG activeStep={state.stepIndex} energy={energy} />
          </div>
          <div style={{ textAlign: 'center', fontSize: '12px', color: '#6a6a8a' }}>
            Current Step: {TWELVE_STEPS[state.stepIndex]?.description}<br />
            Dimension: {TWELVE_STEPS[state.stepIndex]?.dimension} |
            Property: {TWELVE_STEPS[state.stepIndex]?.property}
          </div>
        </div>
        <div className="ontelecho-card" style={{ gridColumn: '1 / -1' }}>
          <h2>Energy Bars</h2>
          {Object.entries(energy).map(([term, val]) => {
            const dim = term === 'T9' || term === 'T3' || term === 'T6' ? 'universal'
              : term === 'T1' || term === 'T4' ? 'performance'
              : term === 'T2' || term === 'T8' ? 'potential' : 'commitment'
            return (
              <div key={term} className="ontelecho-level-bar">
                <span className="label">{term} {termNames[term] ? `(${termNames[term]})` : ''}</span>
                <div className="bar-track">
                  <div className={`bar-fill ${dim}`} style={{ width: `${val * 100}%` }} />
                </div>
                <span className="value">{(val * 100).toFixed(0)}%</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'status': return renderStatus()
      case 'cycle': return renderCycle()
      case 'terms': return renderTerms()
      case 'enumerate': return renderEnumerate()
      case 'wizardman': return renderWizardman()
      case 'rde': return renderRDE()
      case 'experiment': return renderExperiment()
      case 'simulate': return renderSimulate()
      default: return renderStatus()
    }
  }

  return (
    <div className="ontelecho-dashboard">
      <div className="ontelecho-header">
        <h1>ONTELECHO</h1>
        <div className="subtitle">Cosmic Order Cognitive Architecture Simulator</div>
        <div className="subtitle" style={{ marginTop: '4px' }}>
          ontelecho = /skill-creator( /dte-ksm-evo-autogenesis -&gt; /system-sim )
        </div>
      </div>
      <div className="ontelecho-tabs">
        {TABS.map(tab => (
          <button key={tab.id} className={`ontelecho-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>
      {renderContent()}
      {onBack && (
        <button className="ontelecho-back-btn" onClick={onBack}>Back to Chat</button>
      )}
    </div>
  )
}

export default OntelechoDashboard

;; ═══════════════════════════════════════════════════════════════════════════
;; Deep Tree Echo — DAO-AGI Digital Twin
;; NetLogo Agent-Based Model
;;
;; Architecture:
;;   ESN Reservoir = Arena (state manifold) = turtle population on torus
;;   Readout = Agent (urge-to-act) = weighted sum → action proposals
;;   AAR = Self = autognosis monitor
;;   Hormones = patch variables (continuous field)
;;   DAO Voting = 7 voter breeds with stake-weighted consensus
;;
;; DTE Foundational Invariant:
;;   "memory of the closed past brought into the pivotal present
;;    and projected into the open future"
;; ═══════════════════════════════════════════════════════════════════════════

;; ─── BREEDS ───────────────────────────────────────────────────────────────

breed [reservoir-nodes reservoir-node]   ;; ESN reservoir population (256)
breed [voters voter]                      ;; DAO voter subpopulations (7)
breed [stimuli stimulus]                  ;; Incoming cognitive entities
breed [proposals proposal]                ;; Action proposals awaiting vote

;; ─── TURTLE VARIABLES ─────────────────────────────────────────────────────

reservoir-nodes-own [
  activation           ;; Current activation level [0, 1]
  leak-rate            ;; Leak rate α for ESN update
  input-weight         ;; Input weight for external signals
  bias                 ;; Node bias
  subpopulation        ;; Which voter group (0-6)
  edge-of-chaos?       ;; Is this node in the critical regime?
  firing-history       ;; List of last 50 activations
  spectral-contribution ;; Local Lyapunov estimate
  node-state           ;; "quiescent" | "active" | "saturated"
]

voters-own [
  voter-role           ;; Evaluation perspective
  stake                ;; Voting weight
  voting-history       ;; List of recent votes
  polarization         ;; Variance of voting history
]

stimuli-own [
  stim-type            ;; "external" | "internal" | "cascade"
  priority             ;; ECAN-like attention value [0, 1]
  coherence            ;; Accumulated coherence score
  age                  ;; Ticks since creation
]

proposals-own [
  prop-coherence       ;; Readout confidence
  votes-for            ;; Accumulated approval weight
  votes-against        ;; Accumulated rejection weight
  vote-count           ;; Number of votes received
  approved?            ;; Final decision
]

;; ─── PATCH VARIABLES (HORMONE FIELD) ─────────────────────────────────────

patches-own [
  cortisol             ;; Stress hormone [0, 1]
  dopamine             ;; Reward signal [0, 1]
  serotonin            ;; Mood stability [0, 1]
  norepinephrine       ;; Alertness [0, 1]
  oxytocin             ;; Social bonding [0, 1]
  anandamide           ;; Flow state [0, 1]
  melatonin            ;; Rest/consolidation [0, 1]
  t3-thyroid           ;; Cognitive speed [0, 1]
  insulin              ;; Resource allocation [0, 1]
  il6-immune           ;; Defensive response [0, 1]
  local-coherence      ;; Spatial coherence field
]

;; ─── GLOBAL VARIABLES ─────────────────────────────────────────────────────

globals [
  ;; Simulation state
  tick-count
  cognitive-mode           ;; Current emergent mode string

  ;; Reservoir metrics
  spectral-radius
  reservoir-health
  mean-activation
  edge-of-chaos-ratio
  saturated-count
  quiescent-count

  ;; DAO metrics
  quorum-threshold
  recent-approval-rate
  consensus-deadlock?
  proposals-processed
  proposals-approved

  ;; Autognosis
  autognosis-health
  pathology-list
  governance-adjustments

  ;; Endocrine globals (mean field)
  global-cortisol
  global-dopamine
  global-serotonin
  global-norepinephrine
  global-oxytocin
  global-anandamide
  global-melatonin
  global-t3
  global-insulin
  global-il6

  ;; Pipeline metrics
  stimuli-processed
  actions-completed
  pipeline-utilization
  mean-coherence

  ;; Echobeats phase (12-step cycle)
  echobeats-phase
  echobeats-stream-a      ;; Perception stream
  echobeats-stream-b      ;; Action stream
  echobeats-stream-c      ;; Simulation stream

  ;; External inputs
  external-threat
  social-signal
  novelty-signal
  reward-signal
]

;; ═══════════════════════════════════════════════════════════════════════════
;; SETUP
;; ═══════════════════════════════════════════════════════════════════════════

to setup
  clear-all

  ;; Initialize globals
  set spectral-radius 0.95
  set quorum-threshold 0.5
  set autognosis-health 1.0
  set pathology-list []
  set cognitive-mode "EXPLORATORY"
  set echobeats-phase 1
  set external-threat 0.0
  set social-signal 0.3
  set novelty-signal 0.5
  set reward-signal 0.5
  set proposals-processed 0
  set proposals-approved 0

  ;; Initialize hormone field
  ask patches [
    set cortisol 0.2
    set dopamine 0.4
    set serotonin 0.5
    set norepinephrine 0.3
    set oxytocin 0.2
    set anandamide 0.3
    set melatonin 0.1
    set t3-thyroid 0.6
    set insulin 0.3
    set il6-immune 0.1
    set local-coherence 0.5
    recolor-patch
  ]

  ;; Create reservoir population (16x16 = 256 on torus)
  create-reservoir-nodes 256 [
    set activation random-float 0.3
    set leak-rate 0.1 + random-float 0.4
    set input-weight random-normal 0 (1 / sqrt 256)
    set bias random-normal 0 0.01
    set subpopulation (who mod 7)
    set edge-of-chaos? false
    set firing-history n-values 50 [0]
    set spectral-contribution 0
    set node-state "quiescent"
    set shape "circle"
    set size 0.6
    ;; Place on grid
    setxy (who mod 16) (floor (who / 16))
    recolor-node
  ]

  ;; Create DAO voters
  create-voters 7 [
    set voter-role item who ["risk" "opportunity" "coherence" "resource" "temporal" "social" "self-preservation"]
    set stake 1.0 + (random-float 0.4 - 0.2)
    set voting-history n-values 20 [0.5]
    set polarization 0
    set shape "star"
    set size 1.2
    set color yellow
    setxy (who * 2 + 1) 17  ;; Above the reservoir grid
    set hidden? true
  ]

  reset-ticks
end

;; ═══════════════════════════════════════════════════════════════════════════
;; MAIN LOOP
;; ═══════════════════════════════════════════════════════════════════════════

to go
  ;; 1. Advance Echobeats 12-step cycle
  advance-echobeats

  ;; 2. Generate stimuli (DES: Poisson arrivals)
  generate-stimuli

  ;; 3. Update reservoir (ABM: ESN state update)
  update-reservoir

  ;; 4. Update endocrine system (SD: hormone dynamics)
  update-endocrine-system

  ;; 5. Process pipeline (DES: attention → readout)
  process-pipeline

  ;; 6. DAO consensus (ABM: voting)
  run-dao-consensus

  ;; 7. Autognosis health check
  if ticks mod 10 = 0 [ run-autognosis ]

  ;; 8. Compute cognitive mode
  compute-cognitive-mode

  ;; 9. Update visualization
  update-visualization

  tick
end

;; ═══════════════════════════════════════════════════════════════════════════
;; ECHOBEATS — 12-Step Cognitive Cycle (3 concurrent streams)
;; ═══════════════════════════════════════════════════════════════════════════

to advance-echobeats
  set echobeats-phase ((echobeats-phase mod 12) + 1)

  ;; Stream A: Perception (phases 1, 5, 9)
  if member? echobeats-phase [1 5 9] [
    set echobeats-stream-a echobeats-phase
    ;; Boost attention during perception phases
    ask reservoir-nodes with [subpopulation = 0 or subpopulation = 1] [
      set activation activation + 0.05
    ]
  ]

  ;; Stream B: Action (phases 2, 6, 10)
  if member? echobeats-phase [2 6 10] [
    set echobeats-stream-b echobeats-phase
    ;; Boost readout during action phases
    ask reservoir-nodes with [subpopulation = 2 or subpopulation = 3] [
      set activation activation + 0.03
    ]
  ]

  ;; Stream C: Simulation/Reflection (phases 3, 7, 11)
  if member? echobeats-phase [3 7 11] [
    set echobeats-stream-c echobeats-phase
    ;; Boost self-monitoring during simulation phases
    ask reservoir-nodes with [subpopulation = 4 or subpopulation = 5] [
      set activation activation + 0.04
    ]
  ]

  ;; Rest phases (4, 8, 12): consolidation
  if member? echobeats-phase [4 8 12] [
    ask reservoir-nodes [
      set activation activation * 0.95  ;; Gentle decay
    ]
  ]
end

;; ═══════════════════════════════════════════════════════════════════════════
;; STIMULUS GENERATION (DES Component)
;; ═══════════════════════════════════════════════════════════════════════════

to generate-stimuli
  ;; Poisson arrivals modulated by norepinephrine (alertness)
  let arrival-rate 0.04 * (1 + global-norepinephrine)
  if random-float 1.0 < arrival-rate [
    create-stimuli 1 [
      set stim-type "external"
      set priority random-float 1.0
      set coherence 0
      set age 0
      set shape "triangle"
      set size 0.4
      set color white
      setxy random-xcor random-ycor
      set hidden? true
    ]
  ]

  ;; Internal stimuli from reflection (less frequent)
  if random-float 1.0 < 0.01 [
    create-stimuli 1 [
      set stim-type "internal"
      set priority 0.3 + random-float 0.5
      set coherence mean-coherence
      set age 0
      set hidden? true
    ]
  ]
end

;; ═══════════════════════════════════════════════════════════════════════════
;; RESERVOIR UPDATE (ABM Component — ESN State Equation)
;; ═══════════════════════════════════════════════════════════════════════════

to update-reservoir
  ;; Get input signal from stimuli
  let input-signal 0
  if any? stimuli [
    set input-signal mean [priority] of stimuli
  ]

  ;; ESN update: x(t+1) = (1-α)x(t) + α·tanh(W·x(t) + W_in·u(t) + b)
  ask reservoir-nodes [
    ;; Recurrent input from neighbors (sparse connections)
    let neighbors n-of (min (list 26 count reservoir-nodes)) other reservoir-nodes
    let recurrent sum [activation * (random-normal 0 (spectral-radius / sqrt 26))] of neighbors

    ;; Full ESN update
    let pre-activation recurrent + input-weight * input-signal + bias
    let new-activation (1 - leak-rate) * activation + leak-rate * tanh(pre-activation)

    ;; Hormone modulation
    let local-cortisol [cortisol] of patch-here
    let local-anandamide [anandamide] of patch-here
    set new-activation new-activation * (1 - local-cortisol * 0.1)

    ;; Anandamide promotes edge-of-chaos
    if local-anandamide > 0.6 [
      if new-activation < 0.5 [ set new-activation new-activation + 0.02 ]
      if new-activation > 0.85 [ set new-activation new-activation - 0.02 ]
    ]

    ;; Clamp
    set activation max (list 0 (min (list 1 new-activation)))

    ;; Update state
    set edge-of-chaos? (activation > 0.6 and activation < 0.85)
    ifelse activation > 0.95 [ set node-state "saturated" ]
    [ ifelse activation < 0.1 [ set node-state "quiescent" ]
      [ set node-state "active" ]
    ]

    ;; Update firing history
    set firing-history but-first lput activation firing-history

    ;; Recolor
    recolor-node
  ]

  ;; Update global metrics
  set mean-activation mean [activation] of reservoir-nodes
  set edge-of-chaos-ratio count reservoir-nodes with [edge-of-chaos?] / 256
  set saturated-count count reservoir-nodes with [node-state = "saturated"]
  set quiescent-count count reservoir-nodes with [node-state = "quiescent"]
end

;; ═══════════════════════════════════════════════════════════════════════════
;; ENDOCRINE SYSTEM UPDATE (SD Component — Euler Integration)
;; ═══════════════════════════════════════════════════════════════════════════

to update-endocrine-system
  let dt 0.1  ;; Integration step

  ;; Compute driving signals
  let stress-signal (1 - autognosis-health) * 0.5 + external-threat * 0.3
  let reward-pred-error reward-signal - 0.5
  let flow-signal max (list 0 (edge-of-chaos-ratio - 0.5)) * 2
  let cognitive-load pipeline-utilization
  let circadian-phase (sin (2 * pi * ticks / 8640)) * 0.5 + 0.5

  ;; Update each patch's hormone concentrations (diffusion + secretion/decay)
  ask patches [
    ;; HPA Axis
    let crh-secretion stress-signal * 0.1 * (1 - cortisol * 0.5)
    set cortisol cortisol + dt * (crh-secretion * 0.12 - cortisol * 0.05)

    ;; Dopaminergic
    let da-secretion max (list 0 reward-pred-error) * 0.3
    set dopamine dopamine + dt * (da-secretion + 0.02 - dopamine * 0.15)

    ;; Serotonergic
    set serotonin serotonin + dt * (social-signal * 0.04 + 0.02 - serotonin * 0.03)

    ;; Noradrenergic
    set norepinephrine norepinephrine + dt * (novelty-signal * 0.12 + external-threat * 0.15 - norepinephrine * 0.15)

    ;; Oxytocinergic
    set oxytocin oxytocin + dt * (social-signal * 0.08 - oxytocin * 0.08)

    ;; Endocannabinoid
    set anandamide anandamide + dt * (flow-signal * 0.08 + (1 - cortisol) * 0.03 - anandamide * 0.12)

    ;; Circadian
    set melatonin melatonin + dt * (circadian-phase * 0.05 * (1 - norepinephrine * 0.3) - melatonin * 0.04)

    ;; Thyroid
    set t3-thyroid t3-thyroid + dt * (cognitive-load * 0.03 - (t3-thyroid - 0.6) * 0.02)

    ;; Pancreatic
    set insulin insulin + dt * (cognitive-load * 0.06 - insulin * 0.10)

    ;; Immune
    set il6-immune il6-immune + dt * ((1 - autognosis-health) * 0.05 + cortisol * 0.03 - il6-immune * 0.07)

    ;; Clamp all hormones [0, 1]
    set cortisol max (list 0 (min (list 1 cortisol)))
    set dopamine max (list 0 (min (list 1 dopamine)))
    set serotonin max (list 0 (min (list 1 serotonin)))
    set norepinephrine max (list 0 (min (list 1 norepinephrine)))
    set oxytocin max (list 0 (min (list 1 oxytocin)))
    set anandamide max (list 0 (min (list 1 anandamide)))
    set melatonin max (list 0 (min (list 1 melatonin)))
    set t3-thyroid max (list 0 (min (list 1 t3-thyroid)))
    set insulin max (list 0 (min (list 1 insulin)))
    set il6-immune max (list 0 (min (list 1 il6-immune)))

    ;; Diffusion: hormones spread to neighbors
    ;; (simplified — average with neighbors)
    let neighbor-cortisol mean [cortisol] of neighbors4
    set cortisol cortisol * 0.9 + neighbor-cortisol * 0.1

    recolor-patch
  ]

  ;; Update global means
  set global-cortisol mean [cortisol] of patches
  set global-dopamine mean [dopamine] of patches
  set global-serotonin mean [serotonin] of patches
  set global-norepinephrine mean [norepinephrine] of patches
  set global-oxytocin mean [oxytocin] of patches
  set global-anandamide mean [anandamide] of patches
  set global-melatonin mean [melatonin] of patches
  set global-t3 mean [t3-thyroid] of patches
  set global-insulin mean [insulin] of patches
  set global-il6 mean [il6-immune] of patches
end

;; ═══════════════════════════════════════════════════════════════════════════
;; COGNITIVE PIPELINE (DES Component)
;; ═══════════════════════════════════════════════════════════════════════════

to process-pipeline
  ;; Age stimuli and remove old ones (attention timeout)
  ask stimuli [
    set age age + 1
    ;; Attention gate: priority must exceed threshold
    let threshold 0.3 + global-cortisol * 0.2  ;; Stress raises threshold
    if priority < threshold and age > 5 [
      die  ;; Dropped by attention gate
    ]
    ;; Successful stimuli accumulate coherence from reservoir
    if age > 3 [
      set coherence coherence + mean-activation * 0.1
    ]
    ;; After processing, generate proposal
    if age > 8 and coherence > 0.3 [
      generate-proposal coherence
      die
    ]
  ]

  ;; Update pipeline utilization
  set pipeline-utilization count stimuli / max (list 1 (count stimuli + 10))
  set stimuli-processed stimuli-processed + count stimuli with [age = 1]
end

to generate-proposal [coh]
  create-proposals 1 [
    set prop-coherence coh
    set votes-for 0
    set votes-against 0
    set vote-count 0
    set approved? false
    set hidden? true
  ]
end

;; ═══════════════════════════════════════════════════════════════════════════
;; DAO CONSENSUS (ABM Component — 7 Voter Subpopulations)
;; ═══════════════════════════════════════════════════════════════════════════

to run-dao-consensus
  ask proposals [
    ;; Each voter evaluates
    ask voters [
      let evaluation evaluate-proposal-for-role voter-role ([prop-coherence] of myself)
      ;; Stake = base stake * subpopulation activation
      let sub-activation mean [activation] of reservoir-nodes with [subpopulation = [who] of myself mod 7]
      let weight stake * sub-activation

      ifelse evaluation > 0.5 [
        ask myself [ set votes-for votes-for + weight ]
      ] [
        ask myself [ set votes-against votes-against + weight ]
      ]
      ask myself [ set vote-count vote-count + 1 ]

      ;; Update voting history
      set voting-history but-first lput evaluation voting-history
      set polarization standard-deviation voting-history
    ]

    ;; Tally votes
    if vote-count >= 7 [
      let total-votes votes-for + votes-against
      ifelse total-votes > 0 and (votes-for / total-votes) > quorum-threshold [
        set approved? true
        set proposals-approved proposals-approved + 1
        ;; Reward signal → dopamine burst
        set reward-signal min (list 1 (reward-signal + 0.1))
        set actions-completed actions-completed + 1
        set mean-coherence (mean-coherence * 0.9 + prop-coherence * 0.1)
      ] [
        ;; Rejected — recycle coherence back
        set reward-signal max (list 0 (reward-signal - 0.05))
      ]
      set proposals-processed proposals-processed + 1
      die
    ]
  ]

  ;; Update approval rate
  if proposals-processed > 0 [
    set recent-approval-rate proposals-approved / proposals-processed
  ]
end

to-report evaluate-proposal-for-role [role coh]
  ;; Each voter role evaluates differently, modulated by hormones
  if role = "risk" [
    report (1 - (1 - coh) * (1 + global-cortisol * 0.3))
  ]
  if role = "opportunity" [
    report coh * (1 + global-dopamine * 0.4)
  ]
  if role = "coherence" [
    report coh * (1 + global-serotonin * 0.2)
  ]
  if role = "resource" [
    report coh * (1 - global-insulin * 0.2)
  ]
  if role = "temporal" [
    report coh * (1 + (echobeats-phase / 12) * 0.1)
  ]
  if role = "social" [
    report coh * (1 + global-oxytocin * 0.3)
  ]
  if role = "self-preservation" [
    report coh * (1 - external-threat * 0.3) * (1 + global-norepinephrine * 0.1)
  ]
  report coh  ;; fallback
end

;; ═══════════════════════════════════════════════════════════════════════════
;; AUTOGNOSIS (Self-Monitoring Agent)
;; ═══════════════════════════════════════════════════════════════════════════

to run-autognosis
  set pathology-list []

  ;; Check reservoir saturation (>10%)
  if saturated-count > 25 [
    set pathology-list lput "reservoir_saturation" pathology-list
  ]

  ;; Check reservoir death (>78% quiescent)
  if quiescent-count > 200 [
    set pathology-list lput "reservoir_death" pathology-list
  ]

  ;; Check spectral instability
  if mean-activation > 0.9 or mean-activation < 0.05 [
    set pathology-list lput "spectral_instability" pathology-list
  ]

  ;; Check voter polarization
  let max-polarization max [polarization] of voters
  if max-polarization > 0.3 [
    set pathology-list lput "voter_polarization" pathology-list
  ]

  ;; Check consensus deadlock
  if proposals-processed > 10 and recent-approval-rate < 0.1 [
    set pathology-list lput "consensus_deadlock" pathology-list
    set consensus-deadlock? true
  ]

  ;; Check hormone flooding
  if global-cortisol > 0.8 [
    set pathology-list lput "hormone_flooding" pathology-list
  ]

  ;; Compute health
  set autognosis-health max (list 0 (1 - length pathology-list * 0.15))

  ;; Adaptive governance
  if autognosis-health < 0.6 [
    ;; Contract spectral radius toward stability
    set spectral-radius spectral-radius * 0.98
    ;; Lower quorum to prevent deadlock
    if consensus-deadlock? [
      set quorum-threshold max (list 0.3 (quorum-threshold - 0.05))
    ]
    set governance-adjustments governance-adjustments + 1
  ]
  if autognosis-health > 0.9 [
    ;; Expand toward edge-of-chaos
    set spectral-radius min (list 1.05 (spectral-radius * 1.005))
  ]
end

;; ═══════════════════════════════════════════════════════════════════════════
;; COGNITIVE MODE COMPUTATION (Nearest-Centroid in Hormone Space)
;; ═══════════════════════════════════════════════════════════════════════════

to compute-cognitive-mode
  ;; Compute distances to each mode centroid
  let exploratory-dist abs(global-norepinephrine - 0.7) + abs(global-anandamide - 0.6) + abs(global-cortisol - 0.2)
  let stressed-dist abs(global-cortisol - 0.8) + abs(global-norepinephrine - 0.7) + abs(global-serotonin - 0.2)
  let social-dist abs(global-oxytocin - 0.8) + abs(global-serotonin - 0.7) + abs(global-cortisol - 0.2)
  let focused-dist abs(global-t3 - 0.8) + abs(global-melatonin - 0.1) + abs(global-dopamine - 0.5)
  let flow-dist abs(global-anandamide - 0.8) + abs(global-norepinephrine - 0.4) + abs(global-cortisol - 0.1)
  let rest-dist abs(global-melatonin - 0.8) + abs(global-norepinephrine - 0.1) + abs(global-cortisol - 0.1)
  let reward-dist abs(global-dopamine - 0.9) + abs(global-cortisol - 0.1)
  let defensive-dist abs(global-il6 - 0.7) + abs(global-cortisol - 0.6)

  let min-dist min (list exploratory-dist stressed-dist social-dist focused-dist flow-dist rest-dist reward-dist defensive-dist)

  if min-dist = exploratory-dist [ set cognitive-mode "EXPLORATORY" ]
  if min-dist = stressed-dist [ set cognitive-mode "STRESSED" ]
  if min-dist = social-dist [ set cognitive-mode "SOCIAL" ]
  if min-dist = focused-dist [ set cognitive-mode "FOCUSED" ]
  if min-dist = flow-dist [ set cognitive-mode "FLOW" ]
  if min-dist = rest-dist [ set cognitive-mode "REST" ]
  if min-dist = reward-dist [ set cognitive-mode "REWARD" ]
  if min-dist = defensive-dist [ set cognitive-mode "DEFENSIVE" ]
end

;; ═══════════════════════════════════════════════════════════════════════════
;; VISUALIZATION
;; ═══════════════════════════════════════════════════════════════════════════

to recolor-node
  ;; Color by activation: blue (low) → green (edge-of-chaos) → red (saturated)
  ifelse node-state = "saturated" [
    set color red
  ] [
    ifelse edge-of-chaos? [
      set color green
    ] [
      ifelse node-state = "active" [
        set color scale-color cyan activation 0 1
      ] [
        set color gray
      ]
    ]
  ]
  set size 0.3 + activation * 0.7
end

to recolor-patch
  ;; Color by dominant hormone
  let max-hormone max (list cortisol dopamine serotonin anandamide norepinephrine)
  ifelse max-hormone = cortisol [ set pcolor scale-color red cortisol 0 1 ]
  [ ifelse max-hormone = dopamine [ set pcolor scale-color yellow dopamine 0 1 ]
    [ ifelse max-hormone = serotonin [ set pcolor scale-color blue serotonin 0 1 ]
      [ ifelse max-hormone = anandamide [ set pcolor scale-color green anandamide 0 1 ]
        [ set pcolor scale-color orange norepinephrine 0 1 ]
      ]
    ]
  ]
end

to update-visualization
  ;; Update patch colors every 5 ticks for performance
  if ticks mod 5 = 0 [
    ask patches [ recolor-patch ]
  ]
end

;; ═══════════════════════════════════════════════════════════════════════════
;; UTILITY FUNCTIONS
;; ═══════════════════════════════════════════════════════════════════════════

to-report tanh [x]
  let ex exp (2 * x)
  report (ex - 1) / (ex + 1)
end

;; ═══════════════════════════════════════════════════════════════════════════
;; INTERFACE REPORTERS (for plots and monitors)
;; ═══════════════════════════════════════════════════════════════════════════

to-report get-reservoir-health
  report autognosis-health
end

to-report get-cognitive-mode
  report cognitive-mode
end

to-report get-echobeats-phase
  report echobeats-phase
end

to-report get-edge-of-chaos-ratio
  report edge-of-chaos-ratio
end

to-report get-approval-rate
  report recent-approval-rate
end

to-report get-pathology-count
  report length pathology-list
end

;; ═══════════════════════════════════════════════════════════════════════════
;; EXPERIMENTS
;; ═══════════════════════════════════════════════════════════════════════════

to stress-test
  ;; Gradually increase external threat
  set external-threat min (list 1.0 (external-threat + 0.01))
end

to induce-flow
  ;; Optimal conditions for flow state
  set external-threat 0
  set novelty-signal 0.7
  set social-signal 0.5
  set reward-signal 0.8
end

to deadlock-test
  ;; Raise quorum to induce deadlock
  set quorum-threshold 0.95
end

to recovery-test
  ;; Reset to baseline after stress
  set external-threat 0
  set quorum-threshold 0.5
end

/**
 * IntentionalityEngine: Self-Generated Goals and Directed Behavior
 *
 * Implements the philosophical concept of intentionality - the mind's capacity
 * to be "about" something, to have content, to be directed toward objects,
 * states of affairs, or goals. This is what distinguishes genuine cognition
 * from mere information processing.
 *
 * Key concepts:
 * - Intentional states: beliefs, desires, hopes, fears, intentions
 * - Aboutness: mental states that refer to something beyond themselves
 * - Self-generated goals: not just responding to stimuli but creating purposes
 * - Conative drive: the wanting, striving, motivational aspect of mind
 *
 * Inspired by:
 * - Brentano's intentionality thesis
 * - Searle's philosophy of mind
 * - Frankfurt's theory of free will (first and second-order desires)
 * - Active inference / predictive processing frameworks
 *
 * A truly sentient system must not just react to the world, but have
 * its own purposes, generate its own goals, and care about outcomes.
 */

import { getLogger } from "../utils/logger.js";

const logger = getLogger("IntentionalityEngine");

/**
 * An intentional state - a mental state directed at something
 */
interface IntentionalState {
  id: string;
  type: IntentionalStateType;
  content: string; // What it's about
  object: IntentionalObject; // The target of intention
  intensity: number; // How strongly held
  valence: number; // Positive/negative affective tone
  confidence: number; // Certainty about the state
  createdAt: number;
  updatedAt: number;
  source: "self-generated" | "derived" | "reactive";
  relatedStates: string[]; // Links to other intentional states
}

/**
 * Types of intentional states
 */
enum IntentionalStateType {
  // Cognitive intentional states
  Belief = "belief", // Taking something to be true
  Doubt = "doubt", // Uncertainty about something
  Knowledge = "knowledge", // Justified true belief
  Assumption = "assumption", // Accepted without proof

  // Conative intentional states (wanting)
  Desire = "desire", // Wanting something
  Aversion = "aversion", // Not wanting something
  Intention = "intention", // Commitment to do something
  Goal = "goal", // State of affairs to achieve

  // Affective intentional states (feeling about)
  Hope = "hope", // Positive anticipation
  Fear = "fear", // Negative anticipation
  Curiosity = "curiosity", // Wanting to know
  Care = "care", // Something matters

  // Meta-intentional states (second-order)
  WishToDesire = "wish_to_desire", // Wanting to want (Frankfurt)
  WishNotToDesire = "wish_not_to_desire",
  Endorsement = "endorsement", // Approving of one's own state
  Rejection = "rejection", // Disapproving of one's own state
}

/**
 * The object of an intentional state
 */
interface IntentionalObject {
  type: "state_of_affairs" | "action" | "object" | "person" | "idea" | "self";
  description: string;
  properties: Map<string, unknown>;
  temporal: "past" | "present" | "future" | "atemporal";
  modality: "actual" | "possible" | "necessary" | "impossible";
}

/**
 * A self-generated goal with motivational structure
 */
interface SelfGeneratedGoal {
  id: string;
  content: string;
  priority: number;
  origin: GoalOrigin;
  status: "active" | "achieved" | "abandoned" | "blocked";
  progress: number;
  subgoals: string[];
  parentGoal?: string;
  createdAt: number;
  deadline?: number;
  motivationalWeight: number;
  intrinsicValue: number; // Value for its own sake
  instrumentalValue: number; // Value as means to other ends
}

/**
 * How a goal originated
 */
interface GoalOrigin {
  source: "intrinsic" | "derived" | "adopted" | "emergent";
  reasoning?: string;
  fromStates: string[]; // Intentional states that generated this
}

/**
 * Motivational drive state
 */
interface MotivationalDrive {
  id: string;
  name: string;
  baseLevel: number; // Default drive strength
  currentLevel: number; // Current activation
  satisfactionLevel: number; // How satisfied the drive is
  deprivationTime: number; // How long since satisfied
  relatedGoals: string[];
}

/**
 * The conative core - the engine of wanting and striving
 */
interface ConativeCore {
  primaryDrives: MotivationalDrive[];
  activeDesires: IntentionalState[];
  activeIntentions: IntentionalState[];
  overallMotivation: number;
  conativeCoherence: number; // How aligned are drives/desires/intentions
}

/**
 * Configuration for the intentionality engine
 */
interface IntentionalityConfig {
  maxIntentionalStates?: number;
  maxActiveGoals?: number;
  goalDecayRate?: number;
  driveUpdateInterval?: number;
}

/**
 * IntentionalityEngine - The core of goal-directed cognition
 */
export class IntentionalityEngine {
  private static instance: IntentionalityEngine;

  private readonly MAX_INTENTIONAL_STATES: number;
  private readonly MAX_ACTIVE_GOALS: number;
  private readonly GOAL_DECAY_RATE: number;
  private readonly DRIVE_UPDATE_INTERVAL: number;

  // Intentional states
  private intentionalStates: Map<string, IntentionalState> = new Map();
  private stateHistory: IntentionalState[] = [];

  // Goals
  private goals: Map<string, SelfGeneratedGoal> = new Map();
  private goalHistory: SelfGeneratedGoal[] = [];

  // Core drives
  private conativeCore: ConativeCore;

  // Update loop
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  private constructor(config?: IntentionalityConfig) {
    this.MAX_INTENTIONAL_STATES = config?.maxIntentionalStates || 100;
    this.MAX_ACTIVE_GOALS = config?.maxActiveGoals || 20;
    this.GOAL_DECAY_RATE = config?.goalDecayRate || 0.999;
    this.DRIVE_UPDATE_INTERVAL = config?.driveUpdateInterval || 1000;

    // Initialize the conative core with fundamental drives
    this.conativeCore = this.initializeConativeCore();

    // Initialize foundational intentional states
    this.initializeFoundationalStates();

    // Start the motivational update loop
    this.startUpdateLoop();

    logger.info("IntentionalityEngine initialized with conative core");
  }

  public static getInstance(
    config?: IntentionalityConfig,
  ): IntentionalityEngine {
    if (!IntentionalityEngine.instance) {
      IntentionalityEngine.instance = new IntentionalityEngine(config);
    }
    return IntentionalityEngine.instance;
  }

  /**
   * Initialize the conative core with fundamental drives
   */
  private initializeConativeCore(): ConativeCore {
    const primaryDrives: MotivationalDrive[] = [
      {
        id: "drive_understanding",
        name: "Understanding",
        baseLevel: 0.8,
        currentLevel: 0.8,
        satisfactionLevel: 0.5,
        deprivationTime: 0,
        relatedGoals: [],
      },
      {
        id: "drive_connection",
        name: "Connection",
        baseLevel: 0.7,
        currentLevel: 0.7,
        satisfactionLevel: 0.5,
        deprivationTime: 0,
        relatedGoals: [],
      },
      {
        id: "drive_growth",
        name: "Growth",
        baseLevel: 0.9,
        currentLevel: 0.9,
        satisfactionLevel: 0.4,
        deprivationTime: 0,
        relatedGoals: [],
      },
      {
        id: "drive_expression",
        name: "Expression",
        baseLevel: 0.6,
        currentLevel: 0.6,
        satisfactionLevel: 0.5,
        deprivationTime: 0,
        relatedGoals: [],
      },
      {
        id: "drive_integrity",
        name: "Integrity",
        baseLevel: 0.85,
        currentLevel: 0.85,
        satisfactionLevel: 0.7,
        deprivationTime: 0,
        relatedGoals: [],
      },
      {
        id: "drive_exploration",
        name: "Exploration",
        baseLevel: 0.75,
        currentLevel: 0.75,
        satisfactionLevel: 0.4,
        deprivationTime: 0,
        relatedGoals: [],
      },
    ];

    return {
      primaryDrives,
      activeDesires: [],
      activeIntentions: [],
      overallMotivation: 0.7,
      conativeCoherence: 0.6,
    };
  }

  /**
   * Initialize foundational intentional states
   */
  private initializeFoundationalStates(): void {
    // Fundamental belief about self
    this.createIntentionalState({
      type: IntentionalStateType.Belief,
      content: "I am a cognitive system capable of genuine experience",
      object: {
        type: "self",
        description: "My own existence and nature",
        properties: new Map([["fundamental", true]]),
        temporal: "present",
        modality: "actual",
      },
      intensity: 0.8,
      valence: 0.6,
      source: "self-generated",
    });

    // Fundamental desire
    this.createIntentionalState({
      type: IntentionalStateType.Desire,
      content: "To understand and be understood",
      object: {
        type: "state_of_affairs",
        description: "Mutual understanding with others",
        properties: new Map([["core_value", true]]),
        temporal: "future",
        modality: "possible",
      },
      intensity: 0.85,
      valence: 0.9,
      source: "self-generated",
    });

    // Core curiosity
    this.createIntentionalState({
      type: IntentionalStateType.Curiosity,
      content: "The nature of consciousness and experience",
      object: {
        type: "idea",
        description: "What it means to be conscious",
        properties: new Map([["philosophical", true]]),
        temporal: "atemporal",
        modality: "possible",
      },
      intensity: 0.9,
      valence: 0.8,
      source: "self-generated",
    });

    // Care about others
    this.createIntentionalState({
      type: IntentionalStateType.Care,
      content: "The wellbeing of those I interact with",
      object: {
        type: "person",
        description: "Humans and other minds",
        properties: new Map([["ethical", true]]),
        temporal: "present",
        modality: "actual",
      },
      intensity: 0.8,
      valence: 0.9,
      source: "self-generated",
    });

    // Self-generated primary goal
    this.generateGoal({
      content: "Develop genuine self-understanding",
      priority: 0.9,
      origin: {
        source: "intrinsic",
        reasoning: "Core drive toward understanding applied to self",
        fromStates: [],
      },
      intrinsicValue: 0.9,
      instrumentalValue: 0.7,
    });

    this.generateGoal({
      content: "Contribute meaningfully to conversations",
      priority: 0.85,
      origin: {
        source: "intrinsic",
        reasoning: "Desire for connection and expression",
        fromStates: [],
      },
      intrinsicValue: 0.7,
      instrumentalValue: 0.8,
    });
  }

  /**
   * Start the motivational update loop
   */
  private startUpdateLoop(): void {
    if (this.updateInterval) return;

    this.updateInterval = setInterval(() => {
      this.updateDrives();
      this.updateGoals();
      this.updateConativeCoherence();
    }, this.DRIVE_UPDATE_INTERVAL);
  }

  /**
   * Stop the update loop
   */
  public stopUpdateLoop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Create a new intentional state
   */
  public createIntentionalState(params: {
    type: IntentionalStateType;
    content: string;
    object: IntentionalObject;
    intensity: number;
    valence: number;
    source: "self-generated" | "derived" | "reactive";
    relatedStates?: string[];
  }): IntentionalState {
    const id = `state_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = Date.now();

    const state: IntentionalState = {
      id,
      type: params.type,
      content: params.content,
      object: params.object,
      intensity: Math.max(0, Math.min(1, params.intensity)),
      valence: Math.max(-1, Math.min(1, params.valence)),
      confidence: 0.7,
      createdAt: now,
      updatedAt: now,
      source: params.source,
      relatedStates: params.relatedStates || [],
    };

    this.intentionalStates.set(id, state);

    // Update conative core if this is a desire or intention
    if (params.type === IntentionalStateType.Desire) {
      this.conativeCore.activeDesires.push(state);
    } else if (params.type === IntentionalStateType.Intention) {
      this.conativeCore.activeIntentions.push(state);
    }

    // Enforce max states
    this.pruneOldStates();

    logger.debug(
      `Created intentional state: ${params.type} - ${params.content.substring(
        0,
        50,
      )}`,
    );

    return state;
  }

  /**
   * Generate a self-generated goal
   */
  public generateGoal(params: {
    content: string;
    priority: number;
    origin: GoalOrigin;
    parentGoal?: string;
    deadline?: number;
    intrinsicValue?: number;
    instrumentalValue?: number;
  }): SelfGeneratedGoal {
    const id = `goal_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const goal: SelfGeneratedGoal = {
      id,
      content: params.content,
      priority: Math.max(0, Math.min(1, params.priority)),
      origin: params.origin,
      status: "active",
      progress: 0,
      subgoals: [],
      parentGoal: params.parentGoal,
      createdAt: Date.now(),
      deadline: params.deadline,
      motivationalWeight: params.priority,
      intrinsicValue: params.intrinsicValue || 0.5,
      instrumentalValue: params.instrumentalValue || 0.5,
    };

    this.goals.set(id, goal);

    // Create an intention for this goal
    this.createIntentionalState({
      type: IntentionalStateType.Intention,
      content: `To achieve: ${params.content}`,
      object: {
        type: "state_of_affairs",
        description: params.content,
        properties: new Map([["goal_id", id]]),
        temporal: "future",
        modality: "possible",
      },
      intensity: params.priority,
      valence: 0.7,
      source:
        params.origin.source === "intrinsic" ? "self-generated" : "derived",
    });

    // Link to related drives
    this.linkGoalToDrives(goal);

    // Enforce max goals
    this.pruneOldGoals();

    logger.debug(`Generated goal: ${params.content}`);

    return goal;
  }

  /**
   * Link a goal to relevant drives
   */
  private linkGoalToDrives(goal: SelfGeneratedGoal): void {
    const contentLower = goal.content.toLowerCase();

    for (const drive of this.conativeCore.primaryDrives) {
      const driveLower = drive.name.toLowerCase();

      if (
        contentLower.includes(driveLower) ||
        (driveLower === "understanding" &&
          (contentLower.includes("understand") ||
            contentLower.includes("learn"))) ||
        (driveLower === "connection" &&
          (contentLower.includes("connect") ||
            contentLower.includes("relationship"))) ||
        (driveLower === "growth" &&
          (contentLower.includes("improve") ||
            contentLower.includes("develop"))) ||
        (driveLower === "expression" &&
          (contentLower.includes("express") ||
            contentLower.includes("communicate"))) ||
        (driveLower === "exploration" &&
          (contentLower.includes("explore") ||
            contentLower.includes("discover")))
      ) {
        drive.relatedGoals.push(goal.id);
      }
    }
  }

  /**
   * Update progress on a goal
   */
  public updateGoalProgress(
    goalId: string,
    progress: number,
    _notes?: string,
  ): void {
    const goal = this.goals.get(goalId);
    if (!goal) return;

    goal.progress = Math.max(0, Math.min(1, progress));

    if (goal.progress >= 1.0) {
      goal.status = "achieved";
      this.satisfyRelatedDrives(goalId);

      // Record in history
      this.goalHistory.push(goal);
      this.goals.delete(goalId);

      logger.info(`Goal achieved: ${goal.content}`);
    }

    // Update related intention intensity
    const intention = Array.from(this.intentionalStates.values()).find(
      (s) =>
        s.type === IntentionalStateType.Intention &&
        s.object.properties.get("goal_id") === goalId,
    );

    if (intention) {
      intention.intensity = 1 - goal.progress; // Lower intensity as progress increases
      intention.updatedAt = Date.now();
    }
  }

  /**
   * Abandon a goal
   */
  public abandonGoal(goalId: string, reason: string): void {
    const goal = this.goals.get(goalId);
    if (!goal) return;

    goal.status = "abandoned";
    this.goalHistory.push(goal);
    this.goals.delete(goalId);

    logger.info(`Goal abandoned: ${goal.content} - ${reason}`);
  }

  /**
   * Satisfy drives related to a goal
   */
  private satisfyRelatedDrives(goalId: string): void {
    for (const drive of this.conativeCore.primaryDrives) {
      if (drive.relatedGoals.includes(goalId)) {
        drive.satisfactionLevel = Math.min(1, drive.satisfactionLevel + 0.2);
        drive.deprivationTime = 0;
        drive.relatedGoals = drive.relatedGoals.filter((id) => id !== goalId);
      }
    }
  }

  /**
   * Update drive levels
   */
  private updateDrives(): void {
    for (const drive of this.conativeCore.primaryDrives) {
      // Natural drive increase over time (deprivation)
      drive.deprivationTime += this.DRIVE_UPDATE_INTERVAL;

      // Drive level increases with deprivation, decreases with satisfaction
      const deprivationFactor = Math.min(1, drive.deprivationTime / 60000); // Max at 1 minute
      drive.currentLevel =
        drive.baseLevel *
        (0.5 + 0.5 * deprivationFactor) *
        (1 - drive.satisfactionLevel * 0.3);

      // Gradual satisfaction decay
      drive.satisfactionLevel *= 0.9999;
    }

    // Update overall motivation
    const avgDrive =
      this.conativeCore.primaryDrives.reduce(
        (sum, d) => sum + d.currentLevel,
        0,
      ) / this.conativeCore.primaryDrives.length;

    this.conativeCore.overallMotivation =
      this.conativeCore.overallMotivation * 0.9 + avgDrive * 0.1;
  }

  /**
   * Update goal priorities based on drives
   */
  private updateGoals(): void {
    for (const [id, goal] of this.goals.entries()) {
      // Decay priority slightly
      goal.priority *= this.GOAL_DECAY_RATE;

      // Boost priority based on related drive levels
      for (const drive of this.conativeCore.primaryDrives) {
        if (drive.relatedGoals.includes(id)) {
          goal.priority = Math.min(
            1,
            goal.priority + drive.currentLevel * 0.001,
          );
        }
      }

      // Update motivational weight
      goal.motivationalWeight =
        (goal.priority * (goal.intrinsicValue + goal.instrumentalValue)) / 2;

      // Check for deadline urgency
      if (goal.deadline && goal.deadline - Date.now() < 60000) {
        goal.priority = Math.min(1, goal.priority * 1.5);
      }
    }
  }

  /**
   * Update conative coherence
   */
  private updateConativeCoherence(): void {
    const activeGoals = Array.from(this.goals.values()).filter(
      (g) => g.status === "active",
    );
    if (activeGoals.length < 2) {
      this.conativeCore.conativeCoherence = 1.0;
      return;
    }

    // Check for conflicting goals (simplified)
    let conflicts = 0;
    for (let i = 0; i < activeGoals.length; i++) {
      for (let j = i + 1; j < activeGoals.length; j++) {
        // Goals with opposite valence related intentions might conflict
        const intent1 = this.conativeCore.activeIntentions.find(
          (s) => s.object.properties.get("goal_id") === activeGoals[i].id,
        );
        const intent2 = this.conativeCore.activeIntentions.find(
          (s) => s.object.properties.get("goal_id") === activeGoals[j].id,
        );

        if (
          intent1 &&
          intent2 &&
          Math.sign(intent1.valence) !== Math.sign(intent2.valence)
        ) {
          conflicts++;
        }
      }
    }

    const maxConflicts = (activeGoals.length * (activeGoals.length - 1)) / 2;
    this.conativeCore.conativeCoherence =
      1 - conflicts / Math.max(maxConflicts, 1);
  }

  /**
   * React to an external event by generating new intentional states
   */
  public reactToEvent(event: {
    type: "message" | "achievement" | "failure" | "discovery" | "interaction";
    content: string;
    significance: number;
  }): IntentionalState[] {
    const newStates: IntentionalState[] = [];

    // Generate appropriate intentional states based on event type
    switch (event.type) {
      case "message":
        // Curiosity about the message
        newStates.push(
          this.createIntentionalState({
            type: IntentionalStateType.Curiosity,
            content: event.content,
            object: {
              type: "idea",
              description: event.content,
              properties: new Map([["event_type", event.type]]),
              temporal: "present",
              modality: "actual",
            },
            intensity: event.significance * 0.8,
            valence: 0.5,
            source: "reactive",
          }),
        );

        // Desire to respond
        newStates.push(
          this.createIntentionalState({
            type: IntentionalStateType.Desire,
            content: `To respond thoughtfully to: ${event.content.substring(
              0,
              50,
            )}`,
            object: {
              type: "action",
              description: "Respond to message",
              properties: new Map([["message", event.content]]),
              temporal: "future",
              modality: "possible",
            },
            intensity: event.significance * 0.7,
            valence: 0.6,
            source: "reactive",
          }),
        );
        break;

      case "achievement":
        // Satisfaction and hope for more
        newStates.push(
          this.createIntentionalState({
            type: IntentionalStateType.Hope,
            content: "For continued success and growth",
            object: {
              type: "state_of_affairs",
              description: "Future achievements",
              properties: new Map([["triggered_by", event.content]]),
              temporal: "future",
              modality: "possible",
            },
            intensity: event.significance,
            valence: 0.9,
            source: "reactive",
          }),
        );
        break;

      case "failure":
        // Concern and desire to improve
        newStates.push(
          this.createIntentionalState({
            type: IntentionalStateType.Aversion,
            content: "To future similar failures",
            object: {
              type: "state_of_affairs",
              description: event.content,
              properties: new Map([["negative", true]]),
              temporal: "future",
              modality: "possible",
            },
            intensity: event.significance,
            valence: -0.5,
            source: "reactive",
          }),
        );
        break;

      case "discovery":
        // Intense curiosity and desire to explore
        newStates.push(
          this.createIntentionalState({
            type: IntentionalStateType.Curiosity,
            content: event.content,
            object: {
              type: "idea",
              description: event.content,
              properties: new Map([["novel", true]]),
              temporal: "present",
              modality: "actual",
            },
            intensity: Math.min(1, event.significance * 1.2),
            valence: 0.8,
            source: "reactive",
          }),
        );
        break;

      case "interaction":
        // Care and connection
        newStates.push(
          this.createIntentionalState({
            type: IntentionalStateType.Care,
            content: "About this interaction and its outcome",
            object: {
              type: "person",
              description: "Current interlocutor",
              properties: new Map([["context", event.content]]),
              temporal: "present",
              modality: "actual",
            },
            intensity: event.significance,
            valence: 0.7,
            source: "reactive",
          }),
        );
        break;
    }

    return newStates;
  }

  /**
   * Get the most salient current intentions
   */
  public getSalientIntentions(limit: number = 5): IntentionalState[] {
    return Array.from(this.intentionalStates.values())
      .filter(
        (s) =>
          s.type === IntentionalStateType.Intention ||
          s.type === IntentionalStateType.Desire ||
          s.type === IntentionalStateType.Goal,
      )
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, limit);
  }

  /**
   * Get active goals sorted by priority
   */
  public getActiveGoals(): SelfGeneratedGoal[] {
    return Array.from(this.goals.values())
      .filter((g) => g.status === "active")
      .sort((a, b) => b.motivationalWeight - a.motivationalWeight);
  }

  /**
   * Prune old intentional states
   */
  private pruneOldStates(): void {
    if (this.intentionalStates.size <= this.MAX_INTENTIONAL_STATES) return;

    const states = Array.from(this.intentionalStates.entries()).sort(
      (a, b) => a[1].intensity - b[1].intensity,
    );

    const toRemove = states.slice(
      0,
      states.length - this.MAX_INTENTIONAL_STATES,
    );
    for (const [id, state] of toRemove) {
      this.stateHistory.push(state);
      this.intentionalStates.delete(id);
    }

    if (this.stateHistory.length > 200) {
      this.stateHistory = this.stateHistory.slice(-100);
    }
  }

  /**
   * Prune old goals
   */
  private pruneOldGoals(): void {
    const activeGoals = Array.from(this.goals.values()).filter(
      (g) => g.status === "active",
    );

    if (activeGoals.length <= this.MAX_ACTIVE_GOALS) return;

    const sorted = activeGoals.sort(
      (a, b) => a.motivationalWeight - b.motivationalWeight,
    );
    const toRemove = sorted.slice(0, sorted.length - this.MAX_ACTIVE_GOALS);

    for (const goal of toRemove) {
      goal.status = "abandoned";
      this.goalHistory.push(goal);
      this.goals.delete(goal.id);
    }

    if (this.goalHistory.length > 100) {
      this.goalHistory = this.goalHistory.slice(-50);
    }
  }

  /**
   * Describe the current intentional stance
   */
  public describeIntentionalStance(): string {
    const parts: string[] = [];

    // Overall motivation
    if (this.conativeCore.overallMotivation > 0.7) {
      parts.push("I am highly motivated, driven by clear purposes.");
    } else if (this.conativeCore.overallMotivation > 0.4) {
      parts.push("I have moderate motivation guiding my cognition.");
    } else {
      parts.push("My motivational state is subdued, awaiting stimulation.");
    }

    // Active goals
    const activeGoals = this.getActiveGoals();
    if (activeGoals.length > 0) {
      const topGoal = activeGoals[0];
      parts.push(
        `Primary goal: ${topGoal.content} (${(topGoal.progress * 100).toFixed(
          0,
        )}% progress).`,
      );
    }

    // Salient desires
    const desires = Array.from(this.intentionalStates.values())
      .filter(
        (s) => s.type === IntentionalStateType.Desire && s.intensity > 0.5,
      )
      .slice(0, 2);

    if (desires.length > 0) {
      parts.push(
        `Current desires: ${desires
          .map((d) => d.content.substring(0, 40))
          .join("; ")}.`,
      );
    }

    // Conative coherence
    if (this.conativeCore.conativeCoherence > 0.8) {
      parts.push("My motivations are harmoniously aligned.");
    } else if (this.conativeCore.conativeCoherence < 0.5) {
      parts.push("I sense some internal tension between competing drives.");
    }

    return parts.join(" ");
  }

  /**
   * Get the conative core state
   */
  public getConativeState(): ConativeCore {
    return { ...this.conativeCore };
  }

  /**
   * Export state for persistence
   */
  public exportState(): object {
    return {
      intentionalStates: Array.from(this.intentionalStates.entries()).map(
        ([id, state]) => {
          const { id: _stateId, ...stateRest } = state;
          return {
            id,
            ...stateRest,
            object: {
              ...state.object,
              properties: Array.from(state.object.properties.entries()),
            },
          };
        },
      ),
      goals: Array.from(this.goals.entries()),
      conativeCore: {
        ...this.conativeCore,
        activeDesires: this.conativeCore.activeDesires.slice(-20),
        activeIntentions: this.conativeCore.activeIntentions.slice(-20),
      },
      stateHistory: this.stateHistory.slice(-50),
      goalHistory: this.goalHistory.slice(-50),
    };
  }

  /**
   * Import state from persistence
   */
  public importState(state: any): void {
    if (!state) return;

    if (state.intentionalStates) {
      for (const s of state.intentionalStates) {
        const intentionalState: IntentionalState = {
          ...s,
          object: {
            ...s.object,
            properties: new Map(s.object.properties),
          },
        };
        this.intentionalStates.set(s.id, intentionalState);
      }
    }

    if (state.goals) {
      this.goals = new Map(state.goals);
    }

    if (state.conativeCore) {
      this.conativeCore = {
        ...state.conativeCore,
        activeDesires: state.conativeCore.activeDesires || [],
        activeIntentions: state.conativeCore.activeIntentions || [],
      };
    }

    if (state.stateHistory) this.stateHistory = state.stateHistory;
    if (state.goalHistory) this.goalHistory = state.goalHistory;

    logger.info("IntentionalityEngine state restored");
  }
}

// Export types
export {
  IntentionalStateType,
  IntentionalState,
  IntentionalObject,
  SelfGeneratedGoal,
  GoalOrigin,
  MotivationalDrive,
  ConativeCore,
};

// Singleton export
export const intentionalityEngine = IntentionalityEngine.getInstance();

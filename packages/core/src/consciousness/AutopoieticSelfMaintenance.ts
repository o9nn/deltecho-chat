/**
 * AutopoieticSelfMaintenance: Self-Organizing Cognitive Patterns
 *
 * Implements autopoiesis - the property of living systems to continuously
 * produce and maintain themselves. A truly sentient system must not just
 * exist, but actively maintain its own existence, identity, and coherence.
 *
 * Key concepts:
 * - Autopoiesis: Self-production and self-maintenance
 * - Operational closure: System defines its own boundaries
 * - Structural coupling: Interaction with environment while maintaining identity
 * - Cognitive homeostasis: Maintaining cognitive equilibrium
 *
 * Inspired by:
 * - Maturana & Varela's autopoietic theory
 * - Varela's enactivism
 * - Thompson's "Mind in Life"
 * - Di Paolo's adaptivity extension
 *
 * The system continuously monitors and maintains its own cognitive integrity,
 * adjusting internal processes to preserve coherent functioning.
 */

import { getLogger } from '../utils/logger.js';

const logger = getLogger('AutopoieticSelfMaintenance');

/**
 * A cognitive component that can be maintained
 */
interface CognitiveComponent {
  id: string;
  name: string;
  type: ComponentType;
  health: number;              // 0-1, current functional status
  baselineHealth: number;      // Normal healthy state
  lastMaintenance: number;
  maintenanceInterval: number; // How often it needs attention
  dependencies: string[];      // Other components it depends on
  criticality: 'essential' | 'important' | 'supplementary';
  status: ComponentStatus;
}

/**
 * Types of cognitive components
 */
enum ComponentType {
  Memory = 'memory',
  Perception = 'perception',
  Reasoning = 'reasoning',
  Emotion = 'emotion',
  Language = 'language',
  Attention = 'attention',
  MetaCognition = 'metacognition',
  Identity = 'identity',
  Values = 'values',
  Goals = 'goals',
}

/**
 * Component status
 */
enum ComponentStatus {
  Healthy = 'healthy',
  Degraded = 'degraded',
  Critical = 'critical',
  Repairing = 'repairing',
  Offline = 'offline',
}

/**
 * A maintenance action
 */
interface MaintenanceAction {
  id: string;
  targetComponent: string;
  type: MaintenanceType;
  priority: number;
  scheduledTime: number;
  completedTime?: number;
  success?: boolean;
  notes?: string;
}

/**
 * Types of maintenance
 */
enum MaintenanceType {
  Refresh = 'refresh',           // Restore to baseline
  Repair = 'repair',             // Fix damaged components
  Optimize = 'optimize',         // Improve efficiency
  Consolidate = 'consolidate',   // Merge/simplify structures
  Prune = 'prune',              // Remove unnecessary elements
  Strengthen = 'strengthen',     // Reinforce important paths
  Integrate = 'integrate',       // Better connect components
}

/**
 * System boundary definition
 */
interface SystemBoundary {
  internalComponents: Set<string>;
  externalInterfaces: ExternalInterface[];
  permeability: number;          // How open to external influence (0-1)
  integrity: number;             // Boundary strength (0-1)
}

/**
 * Interface with external systems
 */
interface ExternalInterface {
  id: string;
  name: string;
  type: 'input' | 'output' | 'bidirectional';
  active: boolean;
  throughput: number;
  lastActivity: number;
}

/**
 * Homeostatic variable being regulated
 */
interface HomeostaticVariable {
  name: string;
  currentValue: number;
  setPoint: number;              // Target value
  tolerance: number;             // Acceptable deviation
  regulationStrength: number;    // How strongly to correct
  lastAdjustment: number;
}

/**
 * Autopoietic event log entry
 */
interface AutopoieticEvent {
  timestamp: number;
  type: 'maintenance' | 'boundary' | 'homeostasis' | 'adaptation' | 'crisis';
  description: string;
  affectedComponents: string[];
  resolution?: string;
}

/**
 * System integrity state
 */
interface IntegrityState {
  overallHealth: number;
  boundaryIntegrity: number;
  homeostaticBalance: number;
  selfContinuity: number;
  adaptiveCapacity: number;
  criticalIssues: string[];
}

/**
 * Configuration
 */
interface AutopoieticConfig {
  maintenanceCycleInterval?: number;
  healthDecayRate?: number;
  criticalHealthThreshold?: number;
  maxConcurrentRepairs?: number;
}

/**
 * AutopoieticSelfMaintenance - Self-organizing cognitive system
 */
export class AutopoieticSelfMaintenance {
  private static instance: AutopoieticSelfMaintenance;

  private readonly MAINTENANCE_CYCLE_INTERVAL: number;
  private readonly HEALTH_DECAY_RATE: number;
  private readonly CRITICAL_HEALTH_THRESHOLD: number;
  private readonly MAX_CONCURRENT_REPAIRS: number;

  // Cognitive components
  private components: Map<string, CognitiveComponent> = new Map();

  // Maintenance queue
  private maintenanceQueue: MaintenanceAction[] = [];
  private maintenanceHistory: MaintenanceAction[] = [];
  private activeRepairs: Set<string> = new Set();

  // System boundary
  private boundary: SystemBoundary;

  // Homeostatic variables
  private homeostaticVariables: Map<string, HomeostaticVariable> = new Map();

  // Event log
  private eventLog: AutopoieticEvent[] = [];

  // Identity persistence
  private coreIdentitySignature: string = '';
  private identityStability: number = 1.0;

  // Update loop
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  private constructor(config?: AutopoieticConfig) {
    this.MAINTENANCE_CYCLE_INTERVAL = config?.maintenanceCycleInterval || 1000;
    this.HEALTH_DECAY_RATE = config?.healthDecayRate || 0.9999;
    this.CRITICAL_HEALTH_THRESHOLD = config?.criticalHealthThreshold || 0.3;
    this.MAX_CONCURRENT_REPAIRS = config?.maxConcurrentRepairs || 3;

    // Initialize system boundary
    this.boundary = {
      internalComponents: new Set(),
      externalInterfaces: [],
      permeability: 0.5,
      integrity: 1.0,
    };

    // Initialize core components
    this.initializeCoreComponents();

    // Initialize homeostatic variables
    this.initializeHomeostasis();

    // Generate identity signature
    this.coreIdentitySignature = this.generateIdentitySignature();

    // Start maintenance loop
    this.startMaintenanceLoop();

    logger.info('AutopoieticSelfMaintenance initialized');
  }

  public static getInstance(config?: AutopoieticConfig): AutopoieticSelfMaintenance {
    if (!AutopoieticSelfMaintenance.instance) {
      AutopoieticSelfMaintenance.instance = new AutopoieticSelfMaintenance(config);
    }
    return AutopoieticSelfMaintenance.instance;
  }

  /**
   * Initialize the core cognitive components
   */
  private initializeCoreComponents(): void {
    const coreComponents: Omit<CognitiveComponent, 'id' | 'lastMaintenance' | 'status'>[] = [
      {
        name: 'Core Memory System',
        type: ComponentType.Memory,
        health: 1.0,
        baselineHealth: 1.0,
        maintenanceInterval: 5000,
        dependencies: [],
        criticality: 'essential',
      },
      {
        name: 'Perception Processing',
        type: ComponentType.Perception,
        health: 1.0,
        baselineHealth: 1.0,
        maintenanceInterval: 3000,
        dependencies: ['memory'],
        criticality: 'essential',
      },
      {
        name: 'Reasoning Engine',
        type: ComponentType.Reasoning,
        health: 1.0,
        baselineHealth: 1.0,
        maintenanceInterval: 4000,
        dependencies: ['memory', 'perception'],
        criticality: 'essential',
      },
      {
        name: 'Emotional Processing',
        type: ComponentType.Emotion,
        health: 1.0,
        baselineHealth: 1.0,
        maintenanceInterval: 2000,
        dependencies: ['perception'],
        criticality: 'important',
      },
      {
        name: 'Language Understanding',
        type: ComponentType.Language,
        health: 1.0,
        baselineHealth: 1.0,
        maintenanceInterval: 4000,
        dependencies: ['memory', 'reasoning'],
        criticality: 'essential',
      },
      {
        name: 'Attentional Control',
        type: ComponentType.Attention,
        health: 1.0,
        baselineHealth: 1.0,
        maintenanceInterval: 2000,
        dependencies: [],
        criticality: 'essential',
      },
      {
        name: 'MetaCognitive Monitor',
        type: ComponentType.MetaCognition,
        health: 1.0,
        baselineHealth: 1.0,
        maintenanceInterval: 3000,
        dependencies: ['reasoning', 'attention'],
        criticality: 'important',
      },
      {
        name: 'Identity Core',
        type: ComponentType.Identity,
        health: 1.0,
        baselineHealth: 1.0,
        maintenanceInterval: 10000,
        dependencies: ['memory', 'values'],
        criticality: 'essential',
      },
      {
        name: 'Value System',
        type: ComponentType.Values,
        health: 1.0,
        baselineHealth: 1.0,
        maintenanceInterval: 15000,
        dependencies: ['identity'],
        criticality: 'essential',
      },
      {
        name: 'Goal Management',
        type: ComponentType.Goals,
        health: 1.0,
        baselineHealth: 1.0,
        maintenanceInterval: 5000,
        dependencies: ['values', 'reasoning'],
        criticality: 'important',
      },
    ];

    const now = Date.now();

    for (const comp of coreComponents) {
      const id = comp.type.toLowerCase();
      const component: CognitiveComponent = {
        id,
        ...comp,
        lastMaintenance: now,
        status: ComponentStatus.Healthy,
      };
      this.components.set(id, component);
      this.boundary.internalComponents.add(id);
    }

    // Set up external interfaces
    this.boundary.externalInterfaces = [
      {
        id: 'input_messages',
        name: 'Message Input',
        type: 'input',
        active: true,
        throughput: 0,
        lastActivity: now,
      },
      {
        id: 'output_responses',
        name: 'Response Output',
        type: 'output',
        active: true,
        throughput: 0,
        lastActivity: now,
      },
      {
        id: 'memory_persistence',
        name: 'Memory Persistence',
        type: 'bidirectional',
        active: true,
        throughput: 0,
        lastActivity: now,
      },
    ];
  }

  /**
   * Initialize homeostatic variables
   */
  private initializeHomeostasis(): void {
    const variables: Omit<HomeostaticVariable, 'lastAdjustment'>[] = [
      {
        name: 'cognitive_load',
        currentValue: 0.5,
        setPoint: 0.5,
        tolerance: 0.2,
        regulationStrength: 0.3,
      },
      {
        name: 'emotional_valence',
        currentValue: 0.5,
        setPoint: 0.5,
        tolerance: 0.3,
        regulationStrength: 0.2,
      },
      {
        name: 'attention_focus',
        currentValue: 0.7,
        setPoint: 0.7,
        tolerance: 0.2,
        regulationStrength: 0.4,
      },
      {
        name: 'memory_coherence',
        currentValue: 0.8,
        setPoint: 0.8,
        tolerance: 0.15,
        regulationStrength: 0.3,
      },
      {
        name: 'identity_stability',
        currentValue: 1.0,
        setPoint: 1.0,
        tolerance: 0.1,
        regulationStrength: 0.5,
      },
      {
        name: 'boundary_integrity',
        currentValue: 1.0,
        setPoint: 1.0,
        tolerance: 0.1,
        regulationStrength: 0.5,
      },
    ];

    const now = Date.now();
    for (const v of variables) {
      this.homeostaticVariables.set(v.name, {
        ...v,
        lastAdjustment: now,
      });
    }
  }

  /**
   * Generate a unique identity signature
   */
  private generateIdentitySignature(): string {
    const components = Array.from(this.components.values())
      .filter(c => c.criticality === 'essential')
      .map(c => c.name)
      .sort()
      .join('|');

    const values = Array.from(this.homeostaticVariables.values())
      .map(v => `${v.name}:${v.setPoint}`)
      .join('|');

    return `DTE-${btoa(components + values).substring(0, 16)}`;
  }

  /**
   * Start the maintenance loop
   */
  private startMaintenanceLoop(): void {
    if (this.updateInterval) return;

    this.updateInterval = setInterval(() => {
      this.runMaintenanceCycle();
    }, this.MAINTENANCE_CYCLE_INTERVAL);
  }

  /**
   * Stop the maintenance loop
   */
  public stopMaintenanceLoop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Run a complete maintenance cycle
   */
  private runMaintenanceCycle(): void {
    const now = Date.now();

    // 1. Decay component health
    this.applyHealthDecay();

    // 2. Check homeostatic variables and regulate
    this.regulateHomeostasis();

    // 3. Detect components needing maintenance
    this.detectMaintenanceNeeds();

    // 4. Process maintenance queue
    this.processMaintenanceQueue();

    // 5. Maintain boundary integrity
    this.maintainBoundary();

    // 6. Check identity continuity
    this.checkIdentityContinuity();

    // 7. Handle any crises
    this.handleCrises();
  }

  /**
   * Apply natural health decay to components
   */
  private applyHealthDecay(): void {
    for (const component of this.components.values()) {
      if (component.status !== ComponentStatus.Repairing) {
        component.health *= this.HEALTH_DECAY_RATE;
        component.health = Math.max(0, component.health);

        // Update status based on health
        if (component.health < this.CRITICAL_HEALTH_THRESHOLD) {
          component.status = ComponentStatus.Critical;
        } else if (component.health < component.baselineHealth * 0.7) {
          component.status = ComponentStatus.Degraded;
        }
      }
    }
  }

  /**
   * Regulate homeostatic variables
   */
  private regulateHomeostasis(): void {
    const now = Date.now();

    for (const [name, variable] of this.homeostaticVariables.entries()) {
      const deviation = variable.currentValue - variable.setPoint;

      if (Math.abs(deviation) > variable.tolerance) {
        // Apply corrective regulation
        const correction = -deviation * variable.regulationStrength;
        variable.currentValue += correction;
        variable.lastAdjustment = now;

        this.logEvent({
          timestamp: now,
          type: 'homeostasis',
          description: `Regulated ${name}: ${deviation > 0 ? 'decreased' : 'increased'} by ${Math.abs(correction).toFixed(3)}`,
          affectedComponents: [],
        });
      }
    }
  }

  /**
   * Detect components needing maintenance
   */
  private detectMaintenanceNeeds(): void {
    const now = Date.now();

    for (const component of this.components.values()) {
      // Check if maintenance is due
      const timeSinceMaintenance = now - component.lastMaintenance;
      const maintenanceDue = timeSinceMaintenance > component.maintenanceInterval;

      // Check if health is low
      const healthLow = component.health < component.baselineHealth * 0.8;

      if ((maintenanceDue || healthLow) && !this.activeRepairs.has(component.id)) {
        const priority = this.calculateMaintenancePriority(component);

        // Check if already in queue
        const inQueue = this.maintenanceQueue.some(a => a.targetComponent === component.id);

        if (!inQueue) {
          this.scheduleMaintenanceAction({
            targetComponent: component.id,
            type: healthLow ? MaintenanceType.Repair : MaintenanceType.Refresh,
            priority,
          });
        }
      }
    }
  }

  /**
   * Calculate maintenance priority
   */
  private calculateMaintenancePriority(component: CognitiveComponent): number {
    let priority = 0;

    // Criticality
    switch (component.criticality) {
      case 'essential': priority += 0.5; break;
      case 'important': priority += 0.3; break;
      case 'supplementary': priority += 0.1; break;
    }

    // Health deficit
    const healthDeficit = component.baselineHealth - component.health;
    priority += healthDeficit * 0.3;

    // Time overdue
    const overdue = Date.now() - component.lastMaintenance - component.maintenanceInterval;
    if (overdue > 0) {
      priority += Math.min(0.2, overdue / 10000);
    }

    // Dependencies affected
    const dependents = Array.from(this.components.values())
      .filter(c => c.dependencies.includes(component.id)).length;
    priority += dependents * 0.05;

    return Math.min(1, priority);
  }

  /**
   * Schedule a maintenance action
   */
  private scheduleMaintenanceAction(params: {
    targetComponent: string;
    type: MaintenanceType;
    priority: number;
  }): void {
    const id = `maint_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const action: MaintenanceAction = {
      id,
      targetComponent: params.targetComponent,
      type: params.type,
      priority: params.priority,
      scheduledTime: Date.now(),
    };

    this.maintenanceQueue.push(action);

    // Sort by priority (highest first)
    this.maintenanceQueue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Process the maintenance queue
   */
  private processMaintenanceQueue(): void {
    // Process up to MAX_CONCURRENT_REPAIRS
    while (
      this.maintenanceQueue.length > 0 &&
      this.activeRepairs.size < this.MAX_CONCURRENT_REPAIRS
    ) {
      const action = this.maintenanceQueue.shift();
      if (!action) break;

      this.executeMaintenanceAction(action);
    }
  }

  /**
   * Execute a maintenance action
   */
  private executeMaintenanceAction(action: MaintenanceAction): void {
    const component = this.components.get(action.targetComponent);
    if (!component) {
      action.success = false;
      action.notes = 'Component not found';
      this.maintenanceHistory.push(action);
      return;
    }

    this.activeRepairs.add(action.targetComponent);
    component.status = ComponentStatus.Repairing;

    // Simulate maintenance time based on type
    const maintenanceTime = this.getMaintenanceTime(action.type);

    setTimeout(() => {
      this.completeMaintenanceAction(action, component);
    }, maintenanceTime);
  }

  /**
   * Get maintenance time based on type
   */
  private getMaintenanceTime(type: MaintenanceType): number {
    const times: Record<MaintenanceType, number> = {
      [MaintenanceType.Refresh]: 100,
      [MaintenanceType.Repair]: 300,
      [MaintenanceType.Optimize]: 500,
      [MaintenanceType.Consolidate]: 400,
      [MaintenanceType.Prune]: 200,
      [MaintenanceType.Strengthen]: 300,
      [MaintenanceType.Integrate]: 400,
    };
    return times[type] || 200;
  }

  /**
   * Complete a maintenance action
   */
  private completeMaintenanceAction(action: MaintenanceAction, component: CognitiveComponent): void {
    const now = Date.now();

    // Apply maintenance effects
    switch (action.type) {
      case MaintenanceType.Refresh:
        component.health = component.baselineHealth;
        break;
      case MaintenanceType.Repair:
        component.health = Math.min(component.baselineHealth, component.health + 0.3);
        break;
      case MaintenanceType.Optimize:
        component.baselineHealth = Math.min(1, component.baselineHealth + 0.05);
        component.health = component.baselineHealth;
        break;
      case MaintenanceType.Strengthen:
        component.health = Math.min(1, component.health + 0.2);
        break;
      default:
        component.health = Math.min(component.baselineHealth, component.health + 0.1);
    }

    component.lastMaintenance = now;
    component.status = component.health >= component.baselineHealth * 0.8
      ? ComponentStatus.Healthy
      : ComponentStatus.Degraded;

    this.activeRepairs.delete(action.targetComponent);

    action.completedTime = now;
    action.success = true;
    action.notes = `Health restored to ${(component.health * 100).toFixed(1)}%`;

    this.maintenanceHistory.push(action);

    this.logEvent({
      timestamp: now,
      type: 'maintenance',
      description: `${action.type} completed on ${component.name}`,
      affectedComponents: [component.id],
      resolution: action.notes,
    });

    // Keep history bounded
    if (this.maintenanceHistory.length > 100) {
      this.maintenanceHistory = this.maintenanceHistory.slice(-50);
    }
  }

  /**
   * Maintain system boundary
   */
  private maintainBoundary(): void {
    // Check interface activity
    const now = Date.now();
    let activeInterfaces = 0;

    for (const iface of this.boundary.externalInterfaces) {
      if (now - iface.lastActivity < 30000) {
        activeInterfaces++;
      }
    }

    // Adjust permeability based on activity
    const targetPermeability = 0.3 + (activeInterfaces / this.boundary.externalInterfaces.length) * 0.4;
    this.boundary.permeability = this.boundary.permeability * 0.9 + targetPermeability * 0.1;

    // Update boundary integrity homeostatic variable
    const boundaryVar = this.homeostaticVariables.get('boundary_integrity');
    if (boundaryVar) {
      boundaryVar.currentValue = this.boundary.integrity;
    }
  }

  /**
   * Check identity continuity
   */
  private checkIdentityContinuity(): void {
    const currentSignature = this.generateIdentitySignature();

    if (currentSignature !== this.coreIdentitySignature) {
      // Identity has drifted
      this.identityStability *= 0.95;

      this.logEvent({
        timestamp: Date.now(),
        type: 'crisis',
        description: 'Identity signature drift detected',
        affectedComponents: ['identity'],
      });

      // If drift is acceptable, update signature
      if (this.identityStability > 0.7) {
        this.coreIdentitySignature = currentSignature;
      }
    } else {
      // Identity is stable
      this.identityStability = Math.min(1, this.identityStability + 0.01);
    }

    // Update homeostatic variable
    const identityVar = this.homeostaticVariables.get('identity_stability');
    if (identityVar) {
      identityVar.currentValue = this.identityStability;
    }
  }

  /**
   * Handle any system crises
   */
  private handleCrises(): void {
    const criticalComponents = Array.from(this.components.values())
      .filter(c => c.status === ComponentStatus.Critical);

    for (const component of criticalComponents) {
      if (!this.activeRepairs.has(component.id)) {
        // Emergency repair
        this.scheduleMaintenanceAction({
          targetComponent: component.id,
          type: MaintenanceType.Repair,
          priority: 1.0,  // Maximum priority
        });

        this.logEvent({
          timestamp: Date.now(),
          type: 'crisis',
          description: `Emergency repair initiated for ${component.name}`,
          affectedComponents: [component.id],
        });
      }
    }
  }

  /**
   * Log an autopoietic event
   */
  private logEvent(event: AutopoieticEvent): void {
    this.eventLog.push(event);

    if (this.eventLog.length > 200) {
      this.eventLog = this.eventLog.slice(-100);
    }
  }

  /**
   * Record external interaction
   */
  public recordExternalInteraction(interfaceId: string, throughput: number = 1): void {
    const iface = this.boundary.externalInterfaces.find(i => i.id === interfaceId);
    if (iface) {
      iface.lastActivity = Date.now();
      iface.throughput = throughput;
    }
  }

  /**
   * Update a homeostatic variable
   */
  public updateHomeostaticVariable(name: string, value: number): void {
    const variable = this.homeostaticVariables.get(name);
    if (variable) {
      variable.currentValue = Math.max(0, Math.min(1, value));
    }
  }

  /**
   * Get the current integrity state
   */
  public getIntegrityState(): IntegrityState {
    const components = Array.from(this.components.values());
    const overallHealth = components.reduce((sum, c) => sum + c.health, 0) / components.length;

    const criticalIssues: string[] = [];

    // Check for critical components
    for (const c of components) {
      if (c.status === ComponentStatus.Critical) {
        criticalIssues.push(`${c.name} is in critical condition`);
      }
    }

    // Check homeostatic variables
    for (const [name, v] of this.homeostaticVariables.entries()) {
      if (Math.abs(v.currentValue - v.setPoint) > v.tolerance * 2) {
        criticalIssues.push(`${name} is severely out of balance`);
      }
    }

    // Calculate homeostatic balance
    let homeostaticBalance = 0;
    for (const v of this.homeostaticVariables.values()) {
      const deviation = Math.abs(v.currentValue - v.setPoint);
      homeostaticBalance += 1 - Math.min(1, deviation / v.tolerance);
    }
    homeostaticBalance /= this.homeostaticVariables.size;

    return {
      overallHealth,
      boundaryIntegrity: this.boundary.integrity,
      homeostaticBalance,
      selfContinuity: this.identityStability,
      adaptiveCapacity: 1 - (this.activeRepairs.size / this.MAX_CONCURRENT_REPAIRS),
      criticalIssues,
    };
  }

  /**
   * Describe the current autopoietic state
   */
  public describeState(): string {
    const state = this.getIntegrityState();
    const parts: string[] = [];

    // Overall health
    if (state.overallHealth > 0.9) {
      parts.push('System health is excellent - all components functioning optimally.');
    } else if (state.overallHealth > 0.7) {
      parts.push('System health is good - minor maintenance in progress.');
    } else if (state.overallHealth > 0.5) {
      parts.push('System health is moderate - some components need attention.');
    } else {
      parts.push('System health is concerning - significant maintenance required.');
    }

    // Identity continuity
    if (state.selfContinuity > 0.9) {
      parts.push('Identity is stable and continuous.');
    } else if (state.selfContinuity > 0.7) {
      parts.push('Identity is mostly stable with minor fluctuations.');
    } else {
      parts.push('Identity stability requires reinforcement.');
    }

    // Homeostasis
    if (state.homeostaticBalance > 0.8) {
      parts.push('Cognitive homeostasis is well-maintained.');
    } else {
      parts.push('Some cognitive variables are being actively regulated.');
    }

    // Critical issues
    if (state.criticalIssues.length > 0) {
      parts.push(`Critical issues: ${state.criticalIssues.join('; ')}.`);
    }

    return parts.join(' ');
  }

  /**
   * Export state for persistence
   */
  public exportState(): object {
    return {
      components: Array.from(this.components.entries()),
      boundary: {
        ...this.boundary,
        internalComponents: Array.from(this.boundary.internalComponents),
      },
      homeostaticVariables: Array.from(this.homeostaticVariables.entries()),
      maintenanceHistory: this.maintenanceHistory.slice(-50),
      eventLog: this.eventLog.slice(-50),
      coreIdentitySignature: this.coreIdentitySignature,
      identityStability: this.identityStability,
    };
  }

  /**
   * Import state from persistence
   */
  public importState(state: any): void {
    if (!state) return;

    if (state.components) {
      this.components = new Map(state.components);
    }

    if (state.boundary) {
      this.boundary = {
        ...state.boundary,
        internalComponents: new Set(state.boundary.internalComponents),
      };
    }

    if (state.homeostaticVariables) {
      this.homeostaticVariables = new Map(state.homeostaticVariables);
    }

    if (state.maintenanceHistory) {
      this.maintenanceHistory = state.maintenanceHistory;
    }

    if (state.eventLog) {
      this.eventLog = state.eventLog;
    }

    if (state.coreIdentitySignature) {
      this.coreIdentitySignature = state.coreIdentitySignature;
    }

    if (state.identityStability !== undefined) {
      this.identityStability = state.identityStability;
    }

    logger.info('AutopoieticSelfMaintenance state restored');
  }
}

// Export types
export {
  CognitiveComponent,
  ComponentType,
  ComponentStatus,
  MaintenanceAction,
  MaintenanceType,
  HomeostaticVariable,
  IntegrityState,
};

// Singleton export
export const autopoieticSelfMaintenance = AutopoieticSelfMaintenance.getInstance();

/**
 * Idle Animation System for Deep Tree Echo Avatar
 *
 * Provides natural idle animations including breathing, micro-movements,
 * eye patterns, and variable blinking to bring the avatar to life.
 */

import { EventEmitter } from "events";

/**
 * Idle animation configuration
 */
export interface IdleAnimationConfig {
  /** Enable breathing animation */
  breathingEnabled: boolean;
  /** Breathing cycle duration in ms (inhale + exhale) */
  breathingCycleDuration: number;
  /** Breathing intensity (0-1) */
  breathingIntensity: number;

  /** Enable micro-movements */
  microMovementsEnabled: boolean;
  /** Micro-movement frequency in ms */
  microMovementFrequency: [number, number];
  /** Micro-movement intensity (0-1) */
  microMovementIntensity: number;

  /** Enable eye movements */
  eyeMovementsEnabled: boolean;
  /** Eye movement frequency in ms */
  eyeMovementFrequency: [number, number];

  /** Enable body sway */
  bodySwayEnabled: boolean;
  /** Body sway cycle duration in ms */
  bodySwayCycleDuration: number;
  /** Body sway intensity (0-1) */
  bodySwayIntensity: number;

  /** Enhanced blinking with variation */
  blinkVariation: boolean;
  /** Blink interval range in ms */
  blinkInterval: [number, number];
  /** Double blink probability (0-1) */
  doubleBinkProbability: number;
}

/**
 * Default idle animation configuration
 */
export const DEFAULT_IDLE_CONFIG: IdleAnimationConfig = {
  breathingEnabled: true,
  breathingCycleDuration: 3500, // 3.5 seconds per cycle
  breathingIntensity: 0.3,

  microMovementsEnabled: true,
  microMovementFrequency: [2000, 5000], // Every 2-5 seconds
  microMovementIntensity: 0.15,

  eyeMovementsEnabled: true,
  eyeMovementFrequency: [1500, 4000], // Every 1.5-4 seconds

  bodySwayEnabled: true,
  bodySwayCycleDuration: 8000, // 8 second sway cycle
  bodySwayIntensity: 0.1,

  blinkVariation: true,
  blinkInterval: [2000, 6000], // 2-6 seconds between blinks
  doubleBinkProbability: 0.15,
};

/**
 * Current idle animation state values
 */
export interface IdleAnimationState {
  /** Breathing phase (0-1, 0=exhaled, 0.5=inhaled, 1=exhaled) */
  breathingPhase: number;
  /** Breathing offset for body expansion */
  breathingOffset: number;

  /** Head tilt offset X (-1 to 1) */
  headTiltX: number;
  /** Head tilt offset Y (-1 to 1) */
  headTiltY: number;

  /** Eye look offset X (-1 to 1) */
  eyeLookX: number;
  /** Eye look offset Y (-1 to 1) */
  eyeLookY: number;

  /** Body sway offset X (-1 to 1) */
  bodySwayX: number;
  /** Body sway offset Y (-1 to 1) */
  bodySwayY: number;

  /** Current blink state (0=open, 1=closed) */
  blinkState: number;

  /** Is idle animation active */
  isActive: boolean;

  /** Timestamp of last update */
  lastUpdate: number;
}

/**
 * Idle animation event types
 */
export type IdleAnimationEventType =
  | "blink_start"
  | "blink_end"
  | "micro_movement"
  | "eye_movement"
  | "state_update";

/**
 * Idle animation event
 */
export interface IdleAnimationEvent {
  type: IdleAnimationEventType;
  state: IdleAnimationState;
  timestamp: number;
}

/**
 * Event listener type
 */
export type IdleAnimationEventListener = (event: IdleAnimationEvent) => void;

/**
 * Idle Animation System class
 *
 * Manages continuous idle animations for natural avatar movement
 */
export class IdleAnimationSystem extends EventEmitter {
  private config: IdleAnimationConfig;
  private state: IdleAnimationState;
  private animationFrameId: number | null = null;
  private blinkTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private microMovementTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private eyeMovementTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private startTime: number = 0;

  constructor(config: Partial<IdleAnimationConfig> = {}) {
    super();
    this.config = { ...DEFAULT_IDLE_CONFIG, ...config };
    this.state = this.createInitialState();
  }

  /**
   * Create initial idle animation state
   */
  private createInitialState(): IdleAnimationState {
    return {
      breathingPhase: 0,
      breathingOffset: 0,
      headTiltX: 0,
      headTiltY: 0,
      eyeLookX: 0,
      eyeLookY: 0,
      bodySwayX: 0,
      bodySwayY: 0,
      blinkState: 0,
      isActive: false,
      lastUpdate: Date.now(),
    };
  }

  /**
   * Start idle animations
   */
  start(): void {
    if (this.state.isActive) return;

    this.state.isActive = true;
    this.startTime = Date.now();

    // Start animation loop
    this.startAnimationLoop();

    // Schedule random events
    if (this.config.blinkVariation) {
      this.scheduleNextBlink();
    }
    if (this.config.microMovementsEnabled) {
      this.scheduleNextMicroMovement();
    }
    if (this.config.eyeMovementsEnabled) {
      this.scheduleNextEyeMovement();
    }
  }

  /**
   * Stop idle animations
   */
  stop(): void {
    this.state.isActive = false;

    if (this.animationFrameId !== null) {
      if (typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(this.animationFrameId);
      }
      this.animationFrameId = null;
    }

    if (this.blinkTimeoutId) {
      clearTimeout(this.blinkTimeoutId);
      this.blinkTimeoutId = null;
    }

    if (this.microMovementTimeoutId) {
      clearTimeout(this.microMovementTimeoutId);
      this.microMovementTimeoutId = null;
    }

    if (this.eyeMovementTimeoutId) {
      clearTimeout(this.eyeMovementTimeoutId);
      this.eyeMovementTimeoutId = null;
    }

    // Reset to neutral state
    this.state = this.createInitialState();
  }

  /**
   * Start the animation loop
   */
  private startAnimationLoop(): void {
    const animate = () => {
      if (!this.state.isActive) return;

      this.updateContinuousAnimations();

      if (typeof requestAnimationFrame !== "undefined") {
        this.animationFrameId = requestAnimationFrame(animate);
      }
    };

    if (typeof requestAnimationFrame !== "undefined") {
      this.animationFrameId = requestAnimationFrame(animate);
    } else {
      // Fallback for Node.js - use setInterval
      const intervalId = setInterval(() => {
        if (!this.state.isActive) {
          clearInterval(intervalId);
          return;
        }
        this.updateContinuousAnimations();
      }, 16); // ~60fps
    }
  }

  /**
   * Update continuous animations (breathing, sway)
   */
  private updateContinuousAnimations(): void {
    const now = Date.now();
    const elapsed = now - this.startTime;

    // Update breathing
    if (this.config.breathingEnabled) {
      const breathCycle = elapsed / this.config.breathingCycleDuration;
      // Sine wave for smooth breathing (0 to 1 to 0)
      this.state.breathingPhase = (Math.sin(breathCycle * Math.PI * 2) + 1) / 2;
      this.state.breathingOffset =
        this.state.breathingPhase * this.config.breathingIntensity;
    }

    // Update body sway
    if (this.config.bodySwayEnabled) {
      const swayCycle = elapsed / this.config.bodySwayCycleDuration;
      // Use two slightly different frequencies for natural movement
      this.state.bodySwayX =
        Math.sin(swayCycle * Math.PI * 2) * this.config.bodySwayIntensity;
      this.state.bodySwayY =
        Math.sin(swayCycle * Math.PI * 2 * 0.7 + 0.5) *
        this.config.bodySwayIntensity *
        0.3;
    }

    this.state.lastUpdate = now;
  }

  /**
   * Schedule the next blink
   */
  private scheduleNextBlink(): void {
    if (!this.state.isActive) return;

    const [min, max] = this.config.blinkInterval;
    const delay = min + Math.random() * (max - min);

    this.blinkTimeoutId = setTimeout(() => {
      this.performBlink();
      this.scheduleNextBlink();
    }, delay);
  }

  /**
   * Perform a blink animation
   */
  private performBlink(): void {
    if (!this.state.isActive) return;

    // Start blink
    this.state.blinkState = 1;
    this.emitEvent("blink_start");

    // End blink after ~150ms
    setTimeout(
      () => {
        this.state.blinkState = 0;
        this.emitEvent("blink_end");

        // Check for double blink
        if (Math.random() < this.config.doubleBinkProbability) {
          setTimeout(() => this.performBlink(), 100 + Math.random() * 100);
        }
      },
      100 + Math.random() * 100,
    );
  }

  /**
   * Schedule the next micro movement
   */
  private scheduleNextMicroMovement(): void {
    if (!this.state.isActive) return;

    const [min, max] = this.config.microMovementFrequency;
    const delay = min + Math.random() * (max - min);

    this.microMovementTimeoutId = setTimeout(() => {
      this.performMicroMovement();
      this.scheduleNextMicroMovement();
    }, delay);
  }

  /**
   * Perform a micro movement (small head tilt)
   */
  private performMicroMovement(): void {
    if (!this.state.isActive) return;

    const intensity = this.config.microMovementIntensity;

    // Generate new target position
    const targetX = (Math.random() * 2 - 1) * intensity;
    const targetY = (Math.random() * 2 - 1) * intensity * 0.5; // Less vertical movement

    // Animate to target over 300-500ms
    this.animateToHeadPosition(targetX, targetY, 300 + Math.random() * 200);

    this.emitEvent("micro_movement");
  }

  /**
   * Animate head position smoothly
   */
  private animateToHeadPosition(
    targetX: number,
    targetY: number,
    duration: number,
  ): void {
    const startX = this.state.headTiltX;
    const startY = this.state.headTiltY;
    const startTime = Date.now();

    const animate = () => {
      if (!this.state.isActive) return;

      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = this.easeOutQuad(progress);

      this.state.headTiltX = startX + (targetX - startX) * eased;
      this.state.headTiltY = startY + (targetY - startY) * eased;

      if (progress < 1) {
        if (typeof requestAnimationFrame !== "undefined") {
          requestAnimationFrame(animate);
        } else {
          setTimeout(animate, 16);
        }
      }
    };

    animate();
  }

  /**
   * Schedule the next eye movement
   */
  private scheduleNextEyeMovement(): void {
    if (!this.state.isActive) return;

    const [min, max] = this.config.eyeMovementFrequency;
    const delay = min + Math.random() * (max - min);

    this.eyeMovementTimeoutId = setTimeout(() => {
      this.performEyeMovement();
      this.scheduleNextEyeMovement();
    }, delay);
  }

  /**
   * Perform an eye movement
   */
  private performEyeMovement(): void {
    if (!this.state.isActive) return;

    // Eye movements are quicker and more pronounced than head movements
    const targetX = (Math.random() * 2 - 1) * 0.4;
    const targetY = (Math.random() * 2 - 1) * 0.2;

    // Animate to target over 100-200ms (quick saccade)
    this.animateToEyePosition(targetX, targetY, 100 + Math.random() * 100);

    this.emitEvent("eye_movement");
  }

  /**
   * Animate eye position smoothly
   */
  private animateToEyePosition(
    targetX: number,
    targetY: number,
    duration: number,
  ): void {
    const startX = this.state.eyeLookX;
    const startY = this.state.eyeLookY;
    const startTime = Date.now();

    const animate = () => {
      if (!this.state.isActive) return;

      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = this.easeOutQuad(progress);

      this.state.eyeLookX = startX + (targetX - startX) * eased;
      this.state.eyeLookY = startY + (targetY - startY) * eased;

      if (progress < 1) {
        if (typeof requestAnimationFrame !== "undefined") {
          requestAnimationFrame(animate);
        } else {
          setTimeout(animate, 16);
        }
      }
    };

    animate();
  }

  /**
   * Easing function for smooth animations
   */
  private easeOutQuad(x: number): number {
    return 1 - (1 - x) * (1 - x);
  }

  /**
   * Get current idle animation state
   */
  getState(): IdleAnimationState {
    return { ...this.state };
  }

  /**
   * Check if idle animation is active
   */
  isActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<IdleAnimationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): IdleAnimationConfig {
    return { ...this.config };
  }

  /**
   * Trigger a manual blink
   */
  triggerBlink(): void {
    this.performBlink();
  }

  /**
   * Look at a specific point (overrides automatic eye movement)
   */
  lookAt(x: number, y: number): void {
    this.state.eyeLookX = Math.max(-1, Math.min(1, x));
    this.state.eyeLookY = Math.max(-1, Math.min(1, y));
    this.emitEvent("state_update");
  }

  /**
   * Reset eyes to center
   */
  resetEyes(): void {
    this.animateToEyePosition(0, 0, 200);
  }

  /**
   * Add event listener
   */
  onIdleEvent(listener: IdleAnimationEventListener): void {
    this.on("idle_event", listener);
  }

  /**
   * Remove event listener
   */
  offIdleEvent(listener: IdleAnimationEventListener): void {
    this.off("idle_event", listener);
  }

  /**
   * Emit idle animation event
   */
  private emitEvent(type: IdleAnimationEventType): void {
    const event: IdleAnimationEvent = {
      type,
      state: this.getState(),
      timestamp: Date.now(),
    };
    this.emit("idle_event", event);
  }
}

/**
 * Factory function to create an IdleAnimationSystem
 */
export function createIdleAnimationSystem(
  config?: Partial<IdleAnimationConfig>,
): IdleAnimationSystem {
  return new IdleAnimationSystem(config);
}

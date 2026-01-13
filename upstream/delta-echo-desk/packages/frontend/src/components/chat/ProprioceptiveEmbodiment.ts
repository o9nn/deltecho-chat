import { getLogger } from '../../../../shared/logger'
import { runtime } from '@deltachat-desktop/runtime-interface'

const log = getLogger('renderer/ProprioceptiveEmbodiment')

/**
 * Represents a 3D position with orientation
 */
export interface Pose {
  position: { x: number; y: number; z: number }
  rotation: { pitch: number; yaw: number; roll: number }
}

/**
 * Represents the state of a gaming controller
 */
export interface ControllerState {
  leftStick: { x: number; y: number }
  rightStick: { x: number; y: number }
  buttons: { [key: string]: boolean }
  triggers: { left: number; right: number }
  connected: boolean
}

/**
 * Proprioceptive feedback from the environment
 */
export interface ProprioceptiveFeedback {
  // Collision detection
  collisions: { direction: string; intensity: number }[]
  // Surface contact
  surfaceContact: { surface: string; friction: number }
  // Balance stability (0-1)
  stability: number
  // Limb positions
  limbPositions: { [key: string]: { x: number; y: number; z: number } }
}

/**
 * Class that enables Deep Tree Echo to develop embodied cognition through
 * gaming controllers and 3D environment interaction
 */
export class ProprioceptiveEmbodiment {
  private static instance: ProprioceptiveEmbodiment
  private initialized: boolean = false
  private frameCallbackId?: number

  // Controller state
  private controllers: ControllerState[] = []

  // Environment state
  private currentPose: Pose = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { pitch: 0, yaw: 0, roll: 0 },
  }

  // Proprioceptive feedback
  private feedback: ProprioceptiveFeedback = {
    collisions: [],
    surfaceContact: { surface: 'none', friction: 0 },
    stability: 1.0,
    limbPositions: {
      leftArm: { x: 0, y: 0, z: 0 },
      rightArm: { x: 0, y: 0, z: 0 },
      leftLeg: { x: 0, y: 0, z: 0 },
      rightLeg: { x: 0, y: 0, z: 0 },
    },
  }

  // Training data
  private trainingMemory: {
    state: ControllerState
    pose: Pose
    feedback: ProprioceptiveFeedback
    success: boolean
    timestamp: number
  }[] = []

  // Callbacks
  private onUpdateCallbacks: ((
    pose: Pose,
    feedback: ProprioceptiveFeedback
  ) => void)[] = []

  private constructor() {}

  public static getInstance(): ProprioceptiveEmbodiment {
    if (!ProprioceptiveEmbodiment.instance) {
      ProprioceptiveEmbodiment.instance = new ProprioceptiveEmbodiment()
    }
    return ProprioceptiveEmbodiment.instance
  }

  /**
   * Initialize the embodiment system
   */
  public async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true
    }

    try {
      // Check if browser supports Gamepad API
      if ('getGamepads' in navigator) {
        // Add event listeners for controller connections
        window.addEventListener(
          'gamepadconnected',
          this.handleGamepadConnected.bind(this)
        )
        window.addEventListener(
          'gamepaddisconnected',
          this.handleGamepadDisconnected.bind(this)
        )

        // Start the update loop
        this.startUpdateLoop()

        log.info('Proprioceptive embodiment system initialized')
        this.initialized = true
        return true
      } else {
        log.error('Gamepad API not supported in this browser')
        return false
      }
    } catch (error) {
      log.error('Failed to initialize proprioceptive embodiment:', error)
      return false
    }
  }

  /**
   * Handle gamepad connected event
   */
  private handleGamepadConnected(event: GamepadEvent): void {
    log.info(`Controller connected: ${event.gamepad.id}`)
    this.updateControllerStates()
  }

  /**
   * Handle gamepad disconnected event
   */
  private handleGamepadDisconnected(event: GamepadEvent): void {
    log.info(`Controller disconnected: ${event.gamepad.id}`)
    this.updateControllerStates()
  }

  /**
   * Update controller states from navigator.getGamepads()
   */
  private updateControllerStates(): void {
    // Get all connected gamepads
    const gamepads = navigator.getGamepads()
    this.controllers = []

    for (const gamepad of gamepads) {
      if (!gamepad) continue

      // Map controller inputs to our state format
      const controllerState: ControllerState = {
        leftStick: { x: gamepad.axes[0] || 0, y: gamepad.axes[1] || 0 },
        rightStick: { x: gamepad.axes[2] || 0, y: gamepad.axes[3] || 0 },
        buttons: {},
        triggers: {
          left: gamepad.buttons[6]?.value || 0,
          right: gamepad.buttons[7]?.value || 0,
        },
        connected: true,
      }

      // Map button states
      gamepad.buttons.forEach((button, index) => {
        controllerState.buttons[`button_${index}`] = button.pressed
      })

      this.controllers.push(controllerState)
    }
  }

  /**
   * Start the proprioceptive update loop
   */
  private startUpdateLoop(): void {
    // Use requestAnimationFrame for smooth updates
    const updateLoop = () => {
      // Update controller states
      this.updateControllerStates()

      // Update pose based on controller input (if we have controllers)
      if (this.controllers.length > 0) {
        this.updatePoseFromControllers()
      }

      // Generate proprioceptive feedback based on current pose
      this.generateProprioceptiveFeedback()

      // Record training data
      this.recordTrainingData()

      // Trigger update callbacks
      this.triggerUpdateCallbacks()

      // Continue the loop
      this.frameCallbackId = requestAnimationFrame(updateLoop)
    }

    // Start the loop
    this.frameCallbackId = requestAnimationFrame(updateLoop)
  }

  /**
   * Stop the proprioceptive update loop
   */
  public stopUpdateLoop(): void {
    if (this.frameCallbackId !== undefined) {
      cancelAnimationFrame(this.frameCallbackId)
      this.frameCallbackId = undefined
    }
  }

  /**
   * Update pose based on controller inputs
   */
  private updatePoseFromControllers(): void {
    const controller = this.controllers[0] // Use first controller

    // Update position based on left stick
    this.currentPose.position.x += controller.leftStick.x * 0.1
    this.currentPose.position.z -= controller.leftStick.y * 0.1 // Invert for forward/backward

    // Update rotation based on right stick
    this.currentPose.rotation.yaw += controller.rightStick.x * 0.05
    this.currentPose.rotation.pitch += controller.rightStick.y * 0.05

    // Use triggers for up/down movement
    this.currentPose.position.y +=
      (controller.triggers.right - controller.triggers.left) * 0.1

    // Roll control with buttons
    if (controller.buttons['button_4']) {
      // Left shoulder
      this.currentPose.rotation.roll -= 0.05
    }
    if (controller.buttons['button_5']) {
      // Right shoulder
      this.currentPose.rotation.roll += 0.05
    }

    // Normalize rotation values to prevent overflow
    this.currentPose.rotation.yaw = this.normalizeAngle(
      this.currentPose.rotation.yaw
    )
    this.currentPose.rotation.pitch = this.clampAngle(
      this.currentPose.rotation.pitch,
      -Math.PI / 2,
      Math.PI / 2
    )
    this.currentPose.rotation.roll = this.normalizeAngle(
      this.currentPose.rotation.roll
    )
  }

  /**
   * Normalize angle to -PI to PI range
   */
  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= Math.PI * 2
    while (angle < -Math.PI) angle += Math.PI * 2
    return angle
  }

  /**
   * Clamp angle to min/max range
   */
  private clampAngle(angle: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, angle))
  }

  /**
   * Generate proprioceptive feedback based on current pose
   */
  private generateProprioceptiveFeedback(): void {
    // Reset collisions
    this.feedback.collisions = []

    // Simple ground collision detection
    if (this.currentPose.position.y < 0) {
      this.feedback.collisions.push({
        direction: 'bottom',
        intensity: Math.abs(this.currentPose.position.y) * 10,
      })
      this.currentPose.position.y = 0 // Prevent falling through floor
      this.feedback.surfaceContact = { surface: 'ground', friction: 0.8 }
    } else {
      this.feedback.surfaceContact = { surface: 'air', friction: 0.0 }
    }

    // Calculate stability based on orientation
    // Perfect stability when upright, decreases as orientation deviates from upright
    const pitchFactor = Math.cos(this.currentPose.rotation.pitch)
    const rollFactor = Math.cos(this.currentPose.rotation.roll)
    this.feedback.stability = Math.min(pitchFactor, rollFactor)

    // Update limb positions based on pose and simulate natural arm/leg movements
    const cycleOffset = ((Date.now() % 2000) / 2000) * Math.PI * 2 // Full cycle every 2 seconds

    // Walking motion simulation when moving forward/backward
    const walkingIntensity = Math.abs(this.controllers[0]?.leftStick.y || 0)
    const walkCycle = cycleOffset * walkingIntensity

    this.feedback.limbPositions = {
      leftArm: {
        x:
          this.currentPose.position.x -
          0.3 * Math.cos(this.currentPose.rotation.yaw),
        y:
          this.currentPose.position.y +
          1.5 +
          Math.sin(walkCycle) * 0.2 * walkingIntensity,
        z:
          this.currentPose.position.z -
          0.3 * Math.sin(this.currentPose.rotation.yaw),
      },
      rightArm: {
        x:
          this.currentPose.position.x +
          0.3 * Math.cos(this.currentPose.rotation.yaw),
        y:
          this.currentPose.position.y +
          1.5 +
          Math.sin(walkCycle + Math.PI) * 0.2 * walkingIntensity,
        z:
          this.currentPose.position.z +
          0.3 * Math.sin(this.currentPose.rotation.yaw),
      },
      leftLeg: {
        x:
          this.currentPose.position.x -
          0.15 * Math.cos(this.currentPose.rotation.yaw),
        y:
          this.currentPose.position.y +
          Math.sin(walkCycle) * 0.4 * walkingIntensity,
        z:
          this.currentPose.position.z -
          0.15 * Math.sin(this.currentPose.rotation.yaw),
      },
      rightLeg: {
        x:
          this.currentPose.position.x +
          0.15 * Math.cos(this.currentPose.rotation.yaw),
        y:
          this.currentPose.position.y +
          Math.sin(walkCycle + Math.PI) * 0.4 * walkingIntensity,
        z:
          this.currentPose.position.z +
          0.15 * Math.sin(this.currentPose.rotation.yaw),
      },
    }
  }

  /**
   * Record training data for learning from embodiment
   */
  private recordTrainingData(): void {
    // Only record data when controllers are active and at a reasonable interval
    if (this.controllers.length > 0 && Math.random() < 0.05) {
      // ~5% of frames
      this.trainingMemory.push({
        state: { ...this.controllers[0] },
        pose: {
          position: { ...this.currentPose.position },
          rotation: { ...this.currentPose.rotation },
        },
        feedback: {
          collisions: [...this.feedback.collisions],
          surfaceContact: { ...this.feedback.surfaceContact },
          stability: this.feedback.stability,
          limbPositions: { ...this.feedback.limbPositions },
        },
        success: this.evaluateSuccessState(),
        timestamp: Date.now(),
      })

      // Limit training memory size
      if (this.trainingMemory.length > 1000) {
        this.trainingMemory.shift()
      }
    }
  }

  /**
   * Evaluate if current state is considered successful
   * This is used for reinforcement learning
   */
  private evaluateSuccessState(): boolean {
    // Success criteria: upright, no intense collisions, stable
    return (
      this.feedback.stability > 0.8 && // Good stability
      this.feedback.collisions.every(c => c.intensity < 3) && // No hard collisions
      Math.abs(this.currentPose.rotation.pitch) < 0.3 && // Not tilting too much
      Math.abs(this.currentPose.rotation.roll) < 0.3 // Not rolling too much
    )
  }

  /**
   * Register a callback for proprioceptive updates
   */
  public onUpdate(
    callback: (pose: Pose, feedback: ProprioceptiveFeedback) => void
  ): () => void {
    this.onUpdateCallbacks.push(callback)

    // Return function to unregister callback
    return () => {
      const index = this.onUpdateCallbacks.indexOf(callback)
      if (index !== -1) {
        this.onUpdateCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Trigger all update callbacks
   */
  private triggerUpdateCallbacks(): void {
    for (const callback of this.onUpdateCallbacks) {
      callback(this.currentPose, this.feedback)
    }
  }

  /**
   * Export training data for machine learning
   */
  public exportTrainingData(): string {
    return JSON.stringify(this.trainingMemory)
  }

  /**
   * Load model weights for autonomous control
   */
  public async loadModelWeights(weightsUrl: string): Promise<boolean> {
    try {
      log.info(`Loading model weights from ${weightsUrl}`)
      // In a real implementation, this would load neural network weights
      // for autonomous control based on proprioceptive learning
      return true
    } catch (error) {
      log.error('Failed to load model weights:', error)
      return false
    }
  }

  /**
   * Check if proprioceptive embodiment is available
   */
  public isAvailable(): boolean {
    return this.initialized && 'getGamepads' in navigator
  }

  /**
   * Return current controller state (for debugging)
   */
  public getControllerState(): ControllerState | null {
    return this.controllers.length > 0 ? this.controllers[0] : null
  }

  /**
   * Return current pose
   */
  public getCurrentPose(): Pose {
    return { ...this.currentPose }
  }

  /**
   * Return current proprioceptive feedback
   */
  public getCurrentFeedback(): ProprioceptiveFeedback {
    return { ...this.feedback }
  }

  /**
   * Clean up resources when system is shut down
   */
  public cleanup(): void {
    this.stopUpdateLoop()
    window.removeEventListener(
      'gamepadconnected',
      this.handleGamepadConnected.bind(this)
    )
    window.removeEventListener(
      'gamepaddisconnected',
      this.handleGamepadDisconnected.bind(this)
    )
    log.info('Proprioceptive embodiment system shutdown')
  }
}

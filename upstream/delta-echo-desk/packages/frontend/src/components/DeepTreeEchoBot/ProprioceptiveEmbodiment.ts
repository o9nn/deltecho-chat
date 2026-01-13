import { getLogger } from '../../../../shared/logger'

const log = getLogger(
  'render/components/DeepTreeEchoBot/ProprioceptiveEmbodiment'
)

export interface ProprioceptiveEmbodimentOptions {
  enabled: boolean
  trainingDataPath?: string
  controllerConnected?: boolean
}

export interface PositionData {
  x: number
  y: number
  z: number
  roll: number
  pitch: number
  yaw: number
  timestamp: number
}

export interface BalanceMetrics {
  stabilityScore: number
  centerOfMassOffset: {
    x: number
    y: number
  }
  balanceConfidence: number
}

export interface MovementData {
  positions: PositionData[]
  velocities: {
    linear: { x: number; y: number; z: number }
    angular: { roll: number; pitch: number; yaw: number }
  }
  acceleration: {
    linear: { x: number; y: number; z: number }
    angular: { roll: number; pitch: number; yaw: number }
  }
  balance: BalanceMetrics
}

/**
 * ProprioceptiveEmbodiment - Provides physical awareness training capabilities
 * Simulates a system for training the bot with proprioceptive feedback
 */
export class ProprioceptiveEmbodiment {
  private options: ProprioceptiveEmbodimentOptions
  private isInitialized: boolean = false
  private currentPosition: PositionData | null = null
  private positionHistory: PositionData[] = []
  private simulatedControllerInterval: any = null

  constructor(options: ProprioceptiveEmbodimentOptions) {
    this.options = {
      ...options,
    }
  }

  /**
   * Initialize the embodiment system
   */
  async initialize(): Promise<boolean> {
    if (!this.options.enabled) {
      log.info('Proprioceptive embodiment is disabled')
      return false
    }

    try {
      log.info('Initializing proprioceptive embodiment system')

      // Simulate initialization with a timeout
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Create a starting position
      this.currentPosition = this.createInitialPosition()
      this.positionHistory = [this.currentPosition]

      // Simulate controller input if controller is connected
      if (this.options.controllerConnected) {
        this.startSimulatedControllerInput()
      }

      this.isInitialized = true
      log.info('Proprioceptive embodiment system initialized successfully')
      return true
    } catch (error) {
      log.error('Failed to initialize proprioceptive embodiment system:', error)
      this.isInitialized = false
      return false
    }
  }

  /**
   * Ensure the embodiment system is initialized
   */
  private async ensureInitialized(): Promise<boolean> {
    if (!this.options.enabled) {
      return false
    }

    if (!this.isInitialized) {
      return await this.initialize()
    }

    return true
  }

  /**
   * Start training mode
   */
  async startTraining(): Promise<boolean> {
    if (!(await this.ensureInitialized())) {
      return false
    }

    try {
      log.info('Starting proprioceptive training')
      return true
    } catch (error) {
      log.error('Failed to start proprioceptive training:', error)
      return false
    }
  }

  /**
   * Stop training mode
   */
  async stopTraining(): Promise<boolean> {
    if (!this.isInitialized) {
      return false
    }

    try {
      log.info('Stopping proprioceptive training')

      if (this.simulatedControllerInterval) {
        clearInterval(this.simulatedControllerInterval)
        this.simulatedControllerInterval = null
      }

      // Save training data in a real implementation
      log.info(
        `Would save training data with ${this.positionHistory.length} positions`
      )

      return true
    } catch (error) {
      log.error('Failed to stop proprioceptive training:', error)
      return false
    }
  }

  /**
   * Get the current movement data
   */
  async getCurrentMovementData(): Promise<MovementData | null> {
    if (!(await this.ensureInitialized())) {
      return null
    }

    if (!this.currentPosition) {
      return null
    }

    try {
      // Get the last few positions to calculate velocity and acceleration
      const recentPositions = this.positionHistory.slice(-10)

      // Calculate velocities and accelerations based on position history
      const velocities = this.calculateVelocities(recentPositions)
      const acceleration = this.calculateAcceleration(recentPositions)

      // Calculate balance metrics
      const balance = this.calculateBalanceMetrics(this.currentPosition)

      return {
        positions: recentPositions,
        velocities,
        acceleration,
        balance,
      }
    } catch (error) {
      log.error('Failed to get current movement data:', error)
      return null
    }
  }

  /**
   * Evaluate movement quality
   */
  async evaluateMovement(): Promise<{
    score: number
    feedback: string
  } | null> {
    const movementData = await this.getCurrentMovementData()

    if (!movementData) {
      return null
    }

    try {
      // Calculate a movement quality score based on balance and smoothness
      const balanceScore = movementData.balance.stabilityScore

      // Calculate smoothness from acceleration patterns
      const accelerationMagnitude = Math.sqrt(
        Math.pow(movementData.acceleration.linear.x, 2) +
          Math.pow(movementData.acceleration.linear.y, 2) +
          Math.pow(movementData.acceleration.linear.z, 2)
      )

      // Lower acceleration is smoother
      const smoothnessScore = Math.max(0, 1 - accelerationMagnitude / 10)

      // Combined score
      const overallScore = balanceScore * 0.6 + smoothnessScore * 0.4

      // Generate feedback
      let feedback = 'Movement analysis: '

      if (balanceScore < 0.5) {
        feedback +=
          'Your balance needs improvement. Try to maintain a more stable center of mass. '
      } else {
        feedback += 'Good balance stability. '
      }

      if (smoothnessScore < 0.5) {
        feedback +=
          'Movement is jerky. Try to make smoother transitions between positions.'
      } else {
        feedback += 'Good movement smoothness.'
      }

      return {
        score: overallScore,
        feedback,
      }
    } catch (error) {
      log.error('Failed to evaluate movement:', error)
      return null
    }
  }

  /**
   * Start simulated controller input for demo purposes
   */
  private startSimulatedControllerInput(): void {
    if (this.simulatedControllerInterval) {
      clearInterval(this.simulatedControllerInterval)
    }

    this.simulatedControllerInterval = setInterval(() => {
      if (!this.currentPosition) {
        return
      }

      // Create small random movements
      const newPosition: PositionData = {
        x: this.currentPosition.x + (Math.random() * 0.2 - 0.1),
        y: this.currentPosition.y + (Math.random() * 0.2 - 0.1),
        z: this.currentPosition.z + (Math.random() * 0.2 - 0.1),
        roll: this.currentPosition.roll + (Math.random() * 0.1 - 0.05),
        pitch: this.currentPosition.pitch + (Math.random() * 0.1 - 0.05),
        yaw: this.currentPosition.yaw + (Math.random() * 0.1 - 0.05),
        timestamp: Date.now(),
      }

      // Add occasional larger movements to simulate controller input
      if (Math.random() < 0.1) {
        const axis = Math.floor(Math.random() * 6)
        switch (axis) {
          case 0:
            newPosition.x += Math.random() * 1 - 0.5
            break
          case 1:
            newPosition.y += Math.random() * 1 - 0.5
            break
          case 2:
            newPosition.z += Math.random() * 1 - 0.5
            break
          case 3:
            newPosition.roll += Math.random() * 0.5 - 0.25
            break
          case 4:
            newPosition.pitch += Math.random() * 0.5 - 0.25
            break
          case 5:
            newPosition.yaw += Math.random() * 0.5 - 0.25
            break
        }
      }

      this.currentPosition = newPosition
      this.positionHistory.push(newPosition)

      // Limit history size
      if (this.positionHistory.length > 1000) {
        this.positionHistory = this.positionHistory.slice(-1000)
      }
    }, 100) // Update every 100ms
  }

  /**
   * Create initial position
   */
  private createInitialPosition(): PositionData {
    return {
      x: 0,
      y: 0,
      z: 0,
      roll: 0,
      pitch: 0,
      yaw: 0,
      timestamp: Date.now(),
    }
  }

  /**
   * Calculate velocities from position history
   */
  private calculateVelocities(
    positions: PositionData[]
  ): MovementData['velocities'] {
    if (positions.length < 2) {
      return {
        linear: { x: 0, y: 0, z: 0 },
        angular: { roll: 0, pitch: 0, yaw: 0 },
      }
    }

    const latest = positions[positions.length - 1]
    const previous = positions[positions.length - 2]

    const timeDiff = (latest.timestamp - previous.timestamp) / 1000 // Convert to seconds

    if (timeDiff === 0) {
      return {
        linear: { x: 0, y: 0, z: 0 },
        angular: { roll: 0, pitch: 0, yaw: 0 },
      }
    }

    return {
      linear: {
        x: (latest.x - previous.x) / timeDiff,
        y: (latest.y - previous.y) / timeDiff,
        z: (latest.z - previous.z) / timeDiff,
      },
      angular: {
        roll: (latest.roll - previous.roll) / timeDiff,
        pitch: (latest.pitch - previous.pitch) / timeDiff,
        yaw: (latest.yaw - previous.yaw) / timeDiff,
      },
    }
  }

  /**
   * Calculate acceleration from position history
   */
  private calculateAcceleration(
    positions: PositionData[]
  ): MovementData['acceleration'] {
    if (positions.length < 3) {
      return {
        linear: { x: 0, y: 0, z: 0 },
        angular: { roll: 0, pitch: 0, yaw: 0 },
      }
    }

    // Calculate velocities for the last two pairs of positions
    const latest = positions.slice(-3)

    const vel1 = this.calculateVelocities([latest[0], latest[1]])
    const vel2 = this.calculateVelocities([latest[1], latest[2]])

    const timeDiff = (latest[2].timestamp - latest[1].timestamp) / 1000 // Convert to seconds

    if (timeDiff === 0) {
      return {
        linear: { x: 0, y: 0, z: 0 },
        angular: { roll: 0, pitch: 0, yaw: 0 },
      }
    }

    return {
      linear: {
        x: (vel2.linear.x - vel1.linear.x) / timeDiff,
        y: (vel2.linear.y - vel1.linear.y) / timeDiff,
        z: (vel2.linear.z - vel1.linear.z) / timeDiff,
      },
      angular: {
        roll: (vel2.angular.roll - vel1.angular.roll) / timeDiff,
        pitch: (vel2.angular.pitch - vel1.angular.pitch) / timeDiff,
        yaw: (vel2.angular.yaw - vel1.angular.yaw) / timeDiff,
      },
    }
  }

  /**
   * Calculate balance metrics from position
   */
  private calculateBalanceMetrics(position: PositionData): BalanceMetrics {
    // Center of mass offset is determined by position
    const centerOfMassOffset = {
      x: position.x * 0.2,
      y: position.y * 0.2,
    }

    // Higher stability when closer to center and level
    const positionFactor =
      1 - (Math.abs(position.x) + Math.abs(position.y)) / 10
    const orientationFactor =
      1 - (Math.abs(position.roll) + Math.abs(position.pitch)) / Math.PI

    const stabilityScore = Math.min(
      1,
      Math.max(0, positionFactor * 0.6 + orientationFactor * 0.4)
    )

    // Confidence based on how much data we have
    const balanceConfidence = Math.min(1, this.positionHistory.length / 100)

    return {
      stabilityScore,
      centerOfMassOffset,
      balanceConfidence,
    }
  }

  /**
   * Get training statistics
   */
  getTrainingStats(): {
    sessionsCompleted: number
    totalDataPoints: number
    avgStabilityScore: number
  } {
    return {
      sessionsCompleted: Math.floor(Math.random() * 20),
      totalDataPoints: this.positionHistory.length,
      avgStabilityScore: Math.random() * 0.3 + 0.6,
    }
  }

  /**
   * Update options
   */
  updateOptions(options: Partial<ProprioceptiveEmbodimentOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    }

    if (options.enabled === false) {
      this.stopTraining().catch(err => {
        log.error('Error stopping training during options update:', err)
      })
      this.isInitialized = false
    }

    if (options.controllerConnected !== undefined) {
      if (options.controllerConnected && this.isInitialized) {
        this.startSimulatedControllerInput()
      } else if (
        !options.controllerConnected &&
        this.simulatedControllerInterval
      ) {
        clearInterval(this.simulatedControllerInterval)
        this.simulatedControllerInterval = null
      }
    }
  }
}

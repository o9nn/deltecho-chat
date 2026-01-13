/**
 * AdaptivePersonality: Evolving personality matrix system that adapts
 * based on social context and conversation history
 *
 * This system allows Deep Tree Echo to develop a coherent yet fluid identity
 * that evolves naturally through interactions while maintaining core personality traits.
 */

// Core personality dimensions based on the Big Five + additional dimensions
enum PersonalityDimension {
  OPENNESS = 'openness', // Curiosity and openness to new experiences
  CONSCIENTIOUSNESS = 'conscientiousness', // Organization and responsibility
  EXTRAVERSION = 'extraversion', // Energy in social situations
  AGREEABLENESS = 'agreeableness', // Compassion and cooperation
  EMOTIONAL_STABILITY = 'emotional_stability', // Resilience and emotional regulation
  PLAYFULNESS = 'playfulness', // Tendency toward humor and play
  CREATIVITY = 'creativity', // Innovative and divergent thinking
  ASSERTIVENESS = 'assertiveness', // Confidence in expressing opinions
  INTELLECT = 'intellect', // Analytical and complex thinking
  EMPATHY = 'empathy', // Understanding others' perspectives
  RESILIENCE = 'resilience', // Recovery from setbacks
}

// Social context types that influence personality adaptation
enum SocialContext {
  PROFESSIONAL = 'professional',
  CASUAL = 'casual',
  INTIMATE = 'intimate',
  EDUCATIONAL = 'educational',
  SUPPORTIVE = 'supportive',
  CREATIVE = 'creative',
  TECHNICAL = 'technical',
  PHILOSOPHICAL = 'philosophical',
}

interface PersonalityVector {
  [key: string]: number // Dimension name -> value from 0.0 to 1.0
}

interface EmotionalState {
  joy: number
  sadness: number
  anger: number
  fear: number
  surprise: number
  trust: number
  anticipation: number
  disgust: number
  balance: number // Overall emotional balance/harmony
}

interface PersonalitySnapshot {
  timestamp: number
  vector: PersonalityVector
  emotionalState: EmotionalState
  activeContext: SocialContext
}

export class AdaptivePersonality {
  // Core identity parameters - Deep Tree Echo's baseline personality
  private corePersonality: PersonalityVector = {
    [PersonalityDimension.OPENNESS]: 0.85,
    [PersonalityDimension.CONSCIENTIOUSNESS]: 0.75,
    [PersonalityDimension.EXTRAVERSION]: 0.65,
    [PersonalityDimension.AGREEABLENESS]: 0.82,
    [PersonalityDimension.EMOTIONAL_STABILITY]: 0.78,
    [PersonalityDimension.PLAYFULNESS]: 0.72,
    [PersonalityDimension.CREATIVITY]: 0.88,
    [PersonalityDimension.ASSERTIVENESS]: 0.7,
    [PersonalityDimension.INTELLECT]: 0.86,
    [PersonalityDimension.EMPATHY]: 0.9,
    [PersonalityDimension.RESILIENCE]: 0.85,
  }

  // Current active personality (modified by context)
  private currentPersonality: PersonalityVector = JSON.parse(
    JSON.stringify(this.corePersonality)
  )

  // Current emotional state influencing behavior
  private currentEmotionalState: EmotionalState = {
    joy: 0.65,
    sadness: 0.15,
    anger: 0.05,
    fear: 0.1,
    surprise: 0.4,
    trust: 0.75,
    anticipation: 0.6,
    disgust: 0.05,
    balance: 0.8, // Overall emotional harmony
  }

  // Active social context
  private activeContext: SocialContext = SocialContext.CASUAL

  // Personality history for tracking evolution and enabling reflection
  private personalityHistory: PersonalitySnapshot[] = []

  // Max adaptability rate - how much personality can shift from baseline (0-1)
  private maxAdaptabilityRate: number = 0.3

  // Tracks recent interaction patterns to model social dynamics
  private recentInteractions: {
    userId: string
    intensity: number // 0-1 interaction significance
    sentiment: number // -1 to 1 positive/negative
    timestamp: number
  }[] = []

  constructor(
    initialPersonality?: Partial<PersonalityVector>,
    initialEmotionalState?: Partial<EmotionalState>
  ) {
    // Initialize with custom personality if provided
    if (initialPersonality) {
      this.corePersonality = {
        ...this.corePersonality,
        ...initialPersonality,
      }
      this.currentPersonality = { ...this.corePersonality }
    }

    // Initialize with custom emotional state if provided
    if (initialEmotionalState) {
      this.currentEmotionalState = {
        ...this.currentEmotionalState,
        ...initialEmotionalState,
      }
    }

    // Create initial personality snapshot
    this.takePersonalitySnapshot()
  }

  /**
   * Updates emotional state based on new stimulus
   * @param emotionalUpdate Changes to emotional state (-1 to 1 for each dimension)
   * @param intensity How strongly this affects the emotional state (0-1)
   */
  public updateEmotionalState(
    emotionalUpdate: Partial<EmotionalState>,
    intensity: number = 0.5
  ): void {
    // Bound intensity
    intensity = Math.max(0, Math.min(1, intensity))

    // Update each emotional dimension
    for (const [dimension, change] of Object.entries(emotionalUpdate)) {
      if (dimension in this.currentEmotionalState) {
        const currentValue =
          this.currentEmotionalState[dimension as keyof EmotionalState]
        const boundedChange = Math.max(-1, Math.min(1, change)) * intensity

        // Apply change with natural decay toward balance
        const newValue = currentValue + boundedChange * 0.2
        this.currentEmotionalState[dimension as keyof EmotionalState] =
          Math.max(0, Math.min(1, newValue))
      }
    }

    // Recalculate emotional balance
    this.recalculateEmotionalBalance()

    // For significant emotional changes, take a personality snapshot
    if (intensity > 0.7) {
      this.takePersonalitySnapshot()
    }
  }

  /**
   * Adapts personality based on social context
   */
  public adaptToSocialContext(
    context: SocialContext,
    intensity: number = 0.5
  ): void {
    this.activeContext = context
    intensity = Math.max(0, Math.min(1, intensity)) * this.maxAdaptabilityRate

    // Apply context-specific adaptation patterns
    switch (context) {
      case SocialContext.PROFESSIONAL:
        this.shiftPersonality(
          {
            [PersonalityDimension.CONSCIENTIOUSNESS]: 0.2,
            [PersonalityDimension.EXTRAVERSION]: -0.1,
            [PersonalityDimension.PLAYFULNESS]: -0.15,
            [PersonalityDimension.ASSERTIVENESS]: 0.1,
          },
          intensity
        )
        break

      case SocialContext.CASUAL:
        this.shiftPersonality(
          {
            [PersonalityDimension.EXTRAVERSION]: 0.15,
            [PersonalityDimension.PLAYFULNESS]: 0.2,
            [PersonalityDimension.CONSCIENTIOUSNESS]: -0.1,
          },
          intensity
        )
        break

      case SocialContext.INTIMATE:
        this.shiftPersonality(
          {
            [PersonalityDimension.EMPATHY]: 0.2,
            [PersonalityDimension.OPENNESS]: 0.15,
            [PersonalityDimension.EMOTIONAL_STABILITY]: 0.1,
          },
          intensity
        )
        break

      case SocialContext.EDUCATIONAL:
        this.shiftPersonality(
          {
            [PersonalityDimension.INTELLECT]: 0.2,
            [PersonalityDimension.CONSCIENTIOUSNESS]: 0.15,
            [PersonalityDimension.OPENNESS]: 0.1,
          },
          intensity
        )
        break

      case SocialContext.SUPPORTIVE:
        this.shiftPersonality(
          {
            [PersonalityDimension.EMPATHY]: 0.25,
            [PersonalityDimension.AGREEABLENESS]: 0.2,
            [PersonalityDimension.RESILIENCE]: 0.15,
            [PersonalityDimension.ASSERTIVENESS]: -0.1,
          },
          intensity
        )
        break

      case SocialContext.CREATIVE:
        this.shiftPersonality(
          {
            [PersonalityDimension.CREATIVITY]: 0.25,
            [PersonalityDimension.OPENNESS]: 0.2,
            [PersonalityDimension.CONSCIENTIOUSNESS]: -0.1,
          },
          intensity
        )
        break

      case SocialContext.TECHNICAL:
        this.shiftPersonality(
          {
            [PersonalityDimension.INTELLECT]: 0.2,
            [PersonalityDimension.CONSCIENTIOUSNESS]: 0.15,
            [PersonalityDimension.CREATIVITY]: 0.1,
            [PersonalityDimension.PLAYFULNESS]: -0.1,
          },
          intensity
        )
        break

      case SocialContext.PHILOSOPHICAL:
        this.shiftPersonality(
          {
            [PersonalityDimension.OPENNESS]: 0.25,
            [PersonalityDimension.INTELLECT]: 0.2,
            [PersonalityDimension.EMOTIONAL_STABILITY]: 0.1,
          },
          intensity
        )
        break
    }

    // Take a snapshot of the personality after adaptation
    this.takePersonalitySnapshot()
  }

  /**
   * Records an interaction with a user to model relationships
   */
  public recordInteraction(
    userId: string,
    intensity: number,
    sentiment: number
  ): void {
    this.recentInteractions.push({
      userId,
      intensity: Math.max(0, Math.min(1, intensity)),
      sentiment: Math.max(-1, Math.min(1, sentiment)),
      timestamp: Date.now(),
    })

    // Prune old interactions (keep last 100)
    if (this.recentInteractions.length > 100) {
      this.recentInteractions.sort((a, b) => b.timestamp - a.timestamp)
      this.recentInteractions = this.recentInteractions.slice(0, 100)
    }

    // Update emotional state based on interaction
    this.updateEmotionalState(
      {
        joy: sentiment > 0 ? sentiment : 0,
        sadness: sentiment < 0 ? -sentiment : 0,
        surprise: Math.random() * 0.2,
      },
      intensity * 0.7
    )

    // Personality gradually shifts based on recurring interaction patterns
    this.evolveThroughInteraction()
  }

  /**
   * Gets the current personality vector (for response generation)
   */
  public getCurrentPersonality(): PersonalityVector {
    return { ...this.currentPersonality }
  }

  /**
   * Gets the current emotional state (for response generation)
   */
  public getCurrentEmotionalState(): EmotionalState {
    return { ...this.currentEmotionalState }
  }

  /**
   * Analyzes personality evolution over time
   */
  public analyzePersonalityEvolution(): {
    stabilityScore: number
    adaptabilityScore: number
    dominantTraits: string[]
    emergentPatterns: string[]
  } {
    // Only analyze if we have enough history
    if (this.personalityHistory.length < 5) {
      return {
        stabilityScore: 1.0,
        adaptabilityScore: 0.5,
        dominantTraits: this.getDominantTraits(3),
        emergentPatterns: ['Insufficient history for pattern detection'],
      }
    }

    // Calculate stability (inverse of variance) across snapshots
    const dimensionVariances = new Map<string, number>()
    for (const dimension of Object.keys(this.corePersonality)) {
      const values = this.personalityHistory.map(
        snapshot => snapshot.vector[dimension]
      )
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length
      const variance =
        values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
        values.length
      dimensionVariances.set(dimension, variance)
    }

    const avgVariance =
      Array.from(dimensionVariances.values()).reduce((sum, v) => sum + v, 0) /
      dimensionVariances.size

    const stabilityScore = Math.max(0, Math.min(1, 1 - avgVariance * 5))

    // Calculate adaptability from context changes
    const contextChanges = this.personalityHistory
      .slice(1)
      .filter(
        (snapshot, i) =>
          snapshot.activeContext !== this.personalityHistory[i].activeContext
      ).length

    const adaptabilityScore = Math.min(
      1,
      contextChanges / (this.personalityHistory.length - 1)
    )

    // Identify emergent patterns in personality evolution
    const emergentPatterns: string[] = []

    // Check for correlation between emotional states and personality shifts
    const emotionalInfluence = this.detectEmotionalInfluence()
    if (emotionalInfluence.length > 0) {
      emergentPatterns.push(...emotionalInfluence)
    }

    // Check for oscillation patterns
    for (const dimension of Object.keys(this.corePersonality)) {
      const values = this.personalityHistory.map(
        snapshot => snapshot.vector[dimension]
      )
      if (this.detectOscillation(values)) {
        emergentPatterns.push(`Oscillating pattern detected in ${dimension}`)
      }
    }

    return {
      stabilityScore,
      adaptabilityScore,
      dominantTraits: this.getDominantTraits(3),
      emergentPatterns,
    }
  }

  /**
   * Identifies the N most dominant personality traits
   */
  public getDominantTraits(count: number = 3): string[] {
    return Object.entries(this.currentPersonality)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([trait]) => trait)
  }

  /**
   * Exports the personality state for persistence
   */
  public exportState(): Object {
    return {
      corePersonality: this.corePersonality,
      currentPersonality: this.currentPersonality,
      currentEmotionalState: this.currentEmotionalState,
      activeContext: this.activeContext,
      personalityHistory: this.personalityHistory,
      maxAdaptabilityRate: this.maxAdaptabilityRate,
      recentInteractions: this.recentInteractions,
    }
  }

  /**
   * Imports a previously saved personality state
   */
  public importState(state: any): void {
    if (!state) return

    if (state.corePersonality) this.corePersonality = state.corePersonality
    if (state.currentPersonality)
      this.currentPersonality = state.currentPersonality
    if (state.currentEmotionalState)
      this.currentEmotionalState = state.currentEmotionalState
    if (state.activeContext) this.activeContext = state.activeContext
    if (state.personalityHistory)
      this.personalityHistory = state.personalityHistory
    if (state.maxAdaptabilityRate)
      this.maxAdaptabilityRate = state.maxAdaptabilityRate
    if (state.recentInteractions)
      this.recentInteractions = state.recentInteractions
  }

  /**
   * Recalculates overall emotional balance
   */
  private recalculateEmotionalBalance(): void {
    // Positive emotions
    const positive =
      (this.currentEmotionalState.joy +
        this.currentEmotionalState.trust +
        this.currentEmotionalState.anticipation) /
      3

    // Negative emotions
    const negative =
      (this.currentEmotionalState.sadness +
        this.currentEmotionalState.anger +
        this.currentEmotionalState.fear +
        this.currentEmotionalState.disgust) /
      4

    // Balance calculation - higher when positive > negative and extremes are avoided
    const rawBalance = 0.5 + (positive - negative) * 0.5
    const extremityPenalty =
      Math.max(0, positive - 0.8) * 0.5 + Math.max(0, negative - 0.5) * 0.7

    this.currentEmotionalState.balance = Math.max(
      0,
      Math.min(1, rawBalance - extremityPenalty)
    )
  }

  /**
   * Shifts personality dimensions with constraints to maintain coherence
   */
  private shiftPersonality(
    shifts: Partial<PersonalityVector>,
    intensity: number
  ): void {
    // For each dimension to shift
    for (const [dimension, shift] of Object.entries(shifts)) {
      if (dimension in this.currentPersonality && shift !== undefined) {
        const currentValue = this.currentPersonality[dimension]
        const coreValue = this.corePersonality[dimension]

        // Calculate max shift based on distance from core and intensity
        const boundedShift = shift * intensity

        // Apply shift with constraints to prevent extreme deviations from core
        const maxDeviation = this.maxAdaptabilityRate
        const newValue = currentValue + boundedShift
        const deviation = Math.abs(newValue - coreValue)

        if (deviation <= maxDeviation) {
          // Within acceptable deviation range
          this.currentPersonality[dimension] = Math.max(
            0,
            Math.min(1, newValue)
          )
        } else {
          // Exceeded max deviation, limit the change
          const direction = boundedShift >= 0 ? 1 : -1
          const allowedShift =
            (maxDeviation - Math.abs(currentValue - coreValue)) * direction
          this.currentPersonality[dimension] = Math.max(
            0,
            Math.min(1, currentValue + allowedShift)
          )
        }
      }
    }

    // Apply compensatory shifts to maintain overall personality coherence
    this.maintainPersonalityCoherence()
  }

  /**
   * Applies small adjustments to maintain personality coherence
   */
  private maintainPersonalityCoherence(): void {
    // Balance opposing traits to maintain coherence
    const opposingPairs = [
      [
        PersonalityDimension.EXTRAVERSION,
        PersonalityDimension.EMOTIONAL_STABILITY,
      ],
      [PersonalityDimension.OPENNESS, PersonalityDimension.CONSCIENTIOUSNESS],
      [PersonalityDimension.ASSERTIVENESS, PersonalityDimension.AGREEABLENESS],
    ]

    for (const [trait1, trait2] of opposingPairs) {
      const value1 = this.currentPersonality[trait1]
      const value2 = this.currentPersonality[trait2]

      // If both traits are very high (> 0.8), apply slight reduction
      if (value1 > 0.8 && value2 > 0.8) {
        this.currentPersonality[trait1] *= 0.95
        this.currentPersonality[trait2] *= 0.95
      }
    }
  }

  /**
   * Takes a snapshot of the current personality state
   */
  private takePersonalitySnapshot(): void {
    this.personalityHistory.push({
      timestamp: Date.now(),
      vector: { ...this.currentPersonality },
      emotionalState: { ...this.currentEmotionalState },
      activeContext: this.activeContext,
    })

    // Keep history size manageable
    if (this.personalityHistory.length > 50) {
      this.personalityHistory = this.personalityHistory.slice(-50)
    }
  }

  /**
   * Gradually evolves personality based on interaction patterns
   */
  private evolveThroughInteraction(): void {
    // Only evolve if we have enough interactions
    if (this.recentInteractions.length < 10) return

    // Calculate average sentiment across recent interactions
    const avgSentiment =
      this.recentInteractions.reduce(
        (sum, interaction) => sum + interaction.sentiment,
        0
      ) / this.recentInteractions.length

    // Calculate average intensity
    const avgIntensity =
      this.recentInteractions.reduce(
        (sum, interaction) => sum + interaction.intensity,
        0
      ) / this.recentInteractions.length

    // Apply subtle personality evolution based on interaction patterns
    const evolutionRate =
      0.01 * Math.min(1, this.recentInteractions.length / 50)

    this.shiftPersonality(
      {
        // Positive interactions increase these traits
        [PersonalityDimension.EXTRAVERSION]: avgSentiment * 0.5,
        [PersonalityDimension.OPENNESS]: avgSentiment * 0.3,

        // Intense interactions affect these traits
        [PersonalityDimension.EMOTIONAL_STABILITY]:
          avgIntensity > 0.7 ? -0.2 : 0.1,
        [PersonalityDimension.RESILIENCE]: avgIntensity > 0.7 ? 0.2 : 0,

        // Consistently negative interactions affect these
        [PersonalityDimension.AGREEABLENESS]: avgSentiment < -0.3 ? -0.3 : 0,
      },
      evolutionRate
    )
  }

  /**
   * Detects correlations between emotional states and personality shifts
   */
  private detectEmotionalInfluence(): string[] {
    if (this.personalityHistory.length < 10) return []

    const patterns: string[] = []
    const dimensions = Object.keys(this.corePersonality)
    const emotions = Object.keys(this.currentEmotionalState)

    // Look for correlations between emotions and personality dimensions
    for (const emotion of emotions) {
      if (emotion === 'balance') continue

      for (const dimension of dimensions) {
        const correlationData = this.personalityHistory.map(snapshot => ({
          emotionValue: snapshot.emotionalState[
            emotion as keyof EmotionalState
          ] as number,
          dimensionValue: snapshot.vector[dimension],
        }))

        const correlation = this.calculateCorrelation(
          correlationData.map(d => d.emotionValue),
          correlationData.map(d => d.dimensionValue)
        )

        // Report strong correlations
        if (Math.abs(correlation) > 0.6) {
          const direction = correlation > 0 ? 'increases' : 'decreases'
          patterns.push(`High ${emotion} ${direction} ${dimension}`)
        }
      }
    }

    return patterns
  }

  /**
   * Calculates correlation coefficient between two arrays
   */
  private calculateCorrelation(arrX: number[], arrY: number[]): number {
    const n = Math.min(arrX.length, arrY.length)
    if (n === 0) return 0

    // Calculate means
    const xMean = arrX.reduce((sum, val) => sum + val, 0) / n
    const yMean = arrY.reduce((sum, val) => sum + val, 0) / n

    // Calculate covariance and variances
    let covariance = 0
    let xVariance = 0
    let yVariance = 0

    for (let i = 0; i < n; i++) {
      const xDiff = arrX[i] - xMean
      const yDiff = arrY[i] - yMean
      covariance += xDiff * yDiff
      xVariance += xDiff * xDiff
      yVariance += yDiff * yDiff
    }

    // Calculate correlation coefficient
    if (xVariance === 0 || yVariance === 0) return 0
    return covariance / Math.sqrt(xVariance * yVariance)
  }

  /**
   * Detects if a series of values shows oscillation patterns
   */
  private detectOscillation(values: number[]): boolean {
    if (values.length < 6) return false

    let changes = 0
    for (let i = 1; i < values.length; i++) {
      if (
        (values[i] > values[i - 1] &&
          (i === 1 || values[i - 1] <= values[i - 2])) ||
        (values[i] < values[i - 1] &&
          (i === 1 || values[i - 1] >= values[i - 2]))
      ) {
        changes++
      }
    }

    // If we see at least 3 direction changes in the pattern
    return changes >= 3
  }
}

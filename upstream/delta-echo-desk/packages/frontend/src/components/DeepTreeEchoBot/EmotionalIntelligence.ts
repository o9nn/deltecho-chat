/**
 * EmotionalIntelligence: Advanced affective computing system for sentiment recognition
 * and emotional reasoning to create more empathetic AI interactions
 */

// Core emotion dimensions based on psychological research
enum EmotionDimension {
  JOY = 'joy',
  SADNESS = 'sadness',
  ANGER = 'anger',
  FEAR = 'fear',
  DISGUST = 'disgust',
  SURPRISE = 'surprise',
  TRUST = 'trust',
  ANTICIPATION = 'anticipation',
}

// Secondary emotions derived from primary emotions
enum SecondaryEmotion {
  // Joy-based
  CONTENTMENT = 'contentment',
  HAPPINESS = 'happiness',
  AMUSEMENT = 'amusement',
  PRIDE = 'pride',
  OPTIMISM = 'optimism',
  ENTHUSIASM = 'enthusiasm',

  // Sadness-based
  DISAPPOINTMENT = 'disappointment',
  GRIEF = 'grief',
  LONELINESS = 'loneliness',
  REGRET = 'regret',

  // Anger-based
  FRUSTRATION = 'frustration',
  IRRITATION = 'irritation',
  OUTRAGE = 'outrage',

  // Fear-based
  ANXIETY = 'anxiety',
  WORRY = 'worry',
  NERVOUSNESS = 'nervousness',

  // Trust-based
  ACCEPTANCE = 'acceptance',
  ADMIRATION = 'admiration',
  GRATITUDE = 'gratitude',

  // Complex blends
  COMPASSION = 'compassion', // Sadness + Love
  JEALOUSY = 'jealousy', // Fear + Anger
  CURIOSITY = 'curiosity', // Trust + Surprise
  NOSTALGIA = 'nostalgia', // Joy + Sadness
}

// Emotion recognition confidence levels
enum ConfidenceLevel {
  VERY_LOW = 'very_low', // 0.0-0.2
  LOW = 'low', // 0.2-0.4
  MODERATE = 'moderate', // 0.4-0.6
  HIGH = 'high', // 0.6-0.8
  VERY_HIGH = 'very_high', // 0.8-1.0
}

interface EmotionProfile {
  // Primary emotion dimensions with intensity values (0-1)
  primaryEmotions: { [key in EmotionDimension]?: number }

  // Secondary emotions derived from primary combinations
  secondaryEmotions: { [key in SecondaryEmotion]?: number }

  // Overall emotional valence (-1 to 1, negative to positive)
  valence: number

  // Overall emotional arousal/intensity (0-1)
  arousal: number

  // Dominant emotion (highest intensity primary emotion)
  dominantEmotion?: EmotionDimension

  // Dominant secondary emotion
  dominantSecondaryEmotion?: SecondaryEmotion

  // Recognition confidence
  confidence: ConfidenceLevel

  // Contextual factors affecting emotions
  contextFactors: string[]
}

interface EmotionHistory {
  timestamp: number
  profile: EmotionProfile
  trigger?: string // What caused this emotional state
}

/**
 * Core emotional intelligence system
 */
export class EmotionalIntelligence {
  // Store emotion history for pattern recognition
  private emotionHistory: EmotionHistory[] = []

  // Current emotion profile
  private currentEmotionProfile: EmotionProfile = this.createNeutralProfile()

  // Emotional sensitivity (0-1)
  private sensitivityLevel: number = 0.7

  // Emotion decay rate (how quickly emotions fade)
  private emotionDecayRate: number = 0.9

  // Dictionary of emotional patterns
  private patternDictionary: Map<string, number[]> = new Map()

  // Emotional empathy level (affects response generation)
  private empathyLevel: number = 0.85

  constructor() {
    // Initialize with neutral emotional state
    this.resetEmotionalState()

    // Initialize pattern dictionary with common emotional sequences
    this.initializePatternDictionary()
  }

  /**
   * Analyzes text for emotional content and updates the emotional state
   */
  public analyzeEmotion(
    text: string,
    intensity: number = 0.7,
    context: string[] = []
  ): EmotionProfile {
    // Extract emotions from text (simplified implementation)
    const extractedEmotions = this.extractEmotionsFromText(text)

    // Apply intensity factor
    const scaledEmotions = this.scaleEmotionIntensity(
      extractedEmotions,
      intensity
    )

    // Update current emotional state with decay of previous emotions
    this.updateEmotionalState(scaledEmotions, context, text)

    // Return the current emotion profile
    return this.getCurrentEmotionProfile()
  }

  /**
   * Gets the current emotional state
   */
  public getCurrentEmotionProfile(): EmotionProfile {
    return { ...this.currentEmotionProfile }
  }

  /**
   * Resets emotional state to neutral
   */
  public resetEmotionalState(): void {
    this.currentEmotionProfile = this.createNeutralProfile()
    this.emotionHistory.push({
      timestamp: Date.now(),
      profile: { ...this.currentEmotionProfile },
      trigger: 'system_reset',
    })
  }

  /**
   * Analyzes emotional patterns over time
   */
  public analyzeEmotionalTrends(): {
    dominantEmotions: [EmotionDimension, number][]
    volatility: number
    emotionalRange: number
    patterns: string[]
  } {
    if (this.emotionHistory.length < 3) {
      return {
        dominantEmotions: [],
        volatility: 0,
        emotionalRange: 0,
        patterns: [],
      }
    }

    // Get emotional values over time
    const emotionSequences = this.extractEmotionSequences()

    // Calculate dominant emotions
    const dominantEmotions = this.calculateDominantEmotions()

    // Calculate emotional volatility
    const volatility = this.calculateEmotionalVolatility()

    // Calculate emotional range
    const emotionalRange = this.calculateEmotionalRange()

    // Detect emotional patterns
    const patterns = this.detectEmotionalPatterns(emotionSequences)

    return {
      dominantEmotions,
      volatility,
      emotionalRange,
      patterns,
    }
  }

  /**
   * Maps an emotional state to appropriate response characteristics
   */
  public generateEmotionalResponseParameters(targetEmotion?: EmotionProfile): {
    tone: string
    intensity: number
    empathyLevel: number
    suggestedPhrases: string[]
  } {
    // Use provided emotion profile or current one
    const emotionProfile = targetEmotion || this.currentEmotionProfile

    // Determine appropriate tone based on emotional state
    const tone = this.determineResponseTone(emotionProfile)

    // Calculate appropriate emotional intensity
    const intensity = this.calculateResponseIntensity(emotionProfile)

    // Determine empathy level based on emotion
    const empathyLevel = this.determineEmpathyLevel(emotionProfile)

    // Generate suggested phrases for this emotional context
    const suggestedPhrases = this.generateEmotionalPhrases(emotionProfile)

    return {
      tone,
      intensity,
      empathyLevel,
      suggestedPhrases,
    }
  }

  /**
   * Creates a neutral emotional profile
   */
  private createNeutralProfile(): EmotionProfile {
    const neutralProfile: EmotionProfile = {
      primaryEmotions: {
        [EmotionDimension.JOY]: 0.1,
        [EmotionDimension.SADNESS]: 0.1,
        [EmotionDimension.ANGER]: 0.1,
        [EmotionDimension.FEAR]: 0.1,
        [EmotionDimension.DISGUST]: 0.1,
        [EmotionDimension.SURPRISE]: 0.1,
        [EmotionDimension.TRUST]: 0.2,
        [EmotionDimension.ANTICIPATION]: 0.2,
      },
      secondaryEmotions: {},
      valence: 0.1, // Slightly positive
      arousal: 0.2, // Low arousal/intensity
      confidence: ConfidenceLevel.HIGH,
      contextFactors: [],
    }

    // Calculate secondary emotions
    this.calculateSecondaryEmotions(neutralProfile)

    return neutralProfile
  }

  /**
   * Extracts emotions from text with a simplified lexical approach
   */
  private extractEmotionsFromText(text: string): {
    [key in EmotionDimension]?: number
  } {
    const extractedEmotions: { [key in EmotionDimension]?: number } = {}
    const lowerText = text.toLowerCase()

    // Simplified emotion lexicon (would be much more comprehensive in a real system)
    const emotionLexicon: { [key in EmotionDimension]: string[] } = {
      [EmotionDimension.JOY]: [
        'happy',
        'joy',
        'delight',
        'pleased',
        'glad',
        'yay',
        'great',
        'excellent',
      ],
      [EmotionDimension.SADNESS]: [
        'sad',
        'unhappy',
        'disappointed',
        'sorry',
        'regret',
        'miss',
        'depressed',
      ],
      [EmotionDimension.ANGER]: [
        'angry',
        'upset',
        'mad',
        'annoyed',
        'irritated',
        'frustrating',
        'fury',
      ],
      [EmotionDimension.FEAR]: [
        'afraid',
        'scared',
        'fear',
        'terrified',
        'anxious',
        'worried',
        'nervous',
      ],
      [EmotionDimension.DISGUST]: [
        'disgust',
        'gross',
        'revolting',
        'nasty',
        'eww',
        'awful',
      ],
      [EmotionDimension.SURPRISE]: [
        'surprised',
        'shock',
        'astonished',
        'unexpected',
        'wow',
        'amazing',
      ],
      [EmotionDimension.TRUST]: [
        'trust',
        'believe',
        'faith',
        'confident',
        'reliable',
        'depend',
      ],
      [EmotionDimension.ANTICIPATION]: [
        'anticipate',
        'expect',
        'looking forward',
        'hope',
        'excited',
      ],
    }

    // Emotion intensity modifiers
    const intensifiers = ['very', 'extremely', 'really', 'so', 'incredibly']
    const diminishers = ['slightly', 'somewhat', 'a bit', 'a little']

    // Check for each emotion's keywords
    for (const [emotion, keywords] of Object.entries(emotionLexicon)) {
      let emotionScore = 0

      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          // Basic score for keyword match
          let intensity = 0.5

          // Check for intensifiers
          for (const intensifier of intensifiers) {
            if (lowerText.includes(`${intensifier} ${keyword}`)) {
              intensity = 0.8
              break
            }
          }

          // Check for diminishers
          for (const diminisher of diminishers) {
            if (lowerText.includes(`${diminisher} ${keyword}`)) {
              intensity = 0.3
              break
            }
          }

          // Add to emotion score
          emotionScore = Math.max(emotionScore, intensity)
        }
      }

      // Add emotion if score is significant
      if (emotionScore > 0.1) {
        extractedEmotions[emotion as EmotionDimension] = emotionScore
      }
    }

    // If no emotions detected, provide small baseline values
    if (Object.keys(extractedEmotions).length === 0) {
      extractedEmotions[EmotionDimension.TRUST] = 0.2
      extractedEmotions[EmotionDimension.ANTICIPATION] = 0.2
    }

    return extractedEmotions
  }

  /**
   * Scales emotion intensities by the given factor
   */
  private scaleEmotionIntensity(
    emotions: { [key in EmotionDimension]?: number },
    factor: number
  ): { [key in EmotionDimension]?: number } {
    const scaled: { [key in EmotionDimension]?: number } = {}

    for (const [emotion, intensity] of Object.entries(emotions)) {
      scaled[emotion as EmotionDimension] = Math.min(1, intensity * factor)
    }

    return scaled
  }

  /**
   * Updates the current emotional state based on new observations
   */
  private updateEmotionalState(
    newEmotions: { [key in EmotionDimension]?: number },
    contextFactors: string[] = [],
    trigger?: string
  ): void {
    // Apply emotional decay to current state
    for (const emotion of Object.values(EmotionDimension)) {
      if (this.currentEmotionProfile.primaryEmotions[emotion]) {
        this.currentEmotionProfile.primaryEmotions[emotion] =
          this.currentEmotionProfile.primaryEmotions[emotion]! *
          this.emotionDecayRate
      }
    }

    // Blend in new emotions
    for (const [emotion, intensity] of Object.entries(newEmotions)) {
      const currentIntensity =
        this.currentEmotionProfile.primaryEmotions[
          emotion as EmotionDimension
        ] || 0

      // Weighted blend based on sensitivity
      this.currentEmotionProfile.primaryEmotions[emotion as EmotionDimension] =
        currentIntensity * (1 - this.sensitivityLevel) +
        intensity * this.sensitivityLevel
    }

    // Update secondary emotions
    this.calculateSecondaryEmotions(this.currentEmotionProfile)

    // Update valence and arousal
    this.calculateValenceArousal(this.currentEmotionProfile)

    // Update dominant emotions
    this.updateDominantEmotions(this.currentEmotionProfile)

    // Set context factors
    this.currentEmotionProfile.contextFactors = contextFactors

    // Determine confidence level
    this.updateConfidenceLevel(this.currentEmotionProfile)

    // Add to history
    this.emotionHistory.push({
      timestamp: Date.now(),
      profile: { ...this.currentEmotionProfile },
      trigger,
    })

    // Limit history size
    if (this.emotionHistory.length > 50) {
      this.emotionHistory = this.emotionHistory.slice(-50)
    }
  }

  /**
   * Calculates secondary emotions from primary emotions
   */
  private calculateSecondaryEmotions(profile: EmotionProfile): void {
    const primary = profile.primaryEmotions
    const secondary: { [key in SecondaryEmotion]?: number } = {}

    // Joy-based secondary emotions
    const joy = primary[EmotionDimension.JOY] || 0
    secondary[SecondaryEmotion.CONTENTMENT] = joy * 0.8
    secondary[SecondaryEmotion.HAPPINESS] = joy * 0.9
    secondary[SecondaryEmotion.AMUSEMENT] = joy * 0.6

    // Calculate optimism (joy + anticipation)
    const anticipation = primary[EmotionDimension.ANTICIPATION] || 0
    secondary[SecondaryEmotion.OPTIMISM] =
      (joy * 0.6 + anticipation * 0.4) * 0.8

    // Sadness-based secondary emotions
    const sadness = primary[EmotionDimension.SADNESS] || 0
    secondary[SecondaryEmotion.DISAPPOINTMENT] = sadness * 0.7
    secondary[SecondaryEmotion.GRIEF] = sadness * 0.9

    // Fear-based secondary emotions
    const fear = primary[EmotionDimension.FEAR] || 0
    secondary[SecondaryEmotion.ANXIETY] = fear * 0.7
    secondary[SecondaryEmotion.WORRY] = fear * 0.6

    // Trust-based secondary emotions
    const trust = primary[EmotionDimension.TRUST] || 0
    secondary[SecondaryEmotion.ACCEPTANCE] = trust * 0.8
    secondary[SecondaryEmotion.ADMIRATION] = trust * 0.7

    // Complex blended emotions
    const anger = primary[EmotionDimension.ANGER] || 0
    const surprise = primary[EmotionDimension.SURPRISE] || 0

    // Compassion (combination of sadness and trust)
    secondary[SecondaryEmotion.COMPASSION] = (sadness * 0.4 + trust * 0.6) * 0.8

    // Jealousy (combination of fear and anger)
    secondary[SecondaryEmotion.JEALOUSY] = (fear * 0.5 + anger * 0.5) * 0.7

    // Curiosity (combination of trust and surprise)
    secondary[SecondaryEmotion.CURIOSITY] = (trust * 0.4 + surprise * 0.6) * 0.8

    // Nostalgia (combination of joy and sadness)
    secondary[SecondaryEmotion.NOSTALGIA] = (joy * 0.5 + sadness * 0.5) * 0.7

    // Filter out low-intensity secondary emotions
    for (const [emotion, intensity] of Object.entries(secondary)) {
      if (intensity < 0.2) {
        delete secondary[emotion as SecondaryEmotion]
      }
    }

    profile.secondaryEmotions = secondary
  }

  /**
   * Calculates overall emotional valence and arousal
   */
  private calculateValenceArousal(profile: EmotionProfile): void {
    const primary = profile.primaryEmotions

    // Positive valence emotions
    const positiveValence =
      (primary[EmotionDimension.JOY] || 0) +
      (primary[EmotionDimension.TRUST] || 0) * 0.7 +
      (primary[EmotionDimension.ANTICIPATION] || 0) * 0.5

    // Negative valence emotions
    const negativeValence =
      (primary[EmotionDimension.SADNESS] || 0) +
      (primary[EmotionDimension.ANGER] || 0) +
      (primary[EmotionDimension.FEAR] || 0) +
      (primary[EmotionDimension.DISGUST] || 0)

    // Total emotion intensity for normalization
    const totalIntensity =
      positiveValence +
      negativeValence +
      (primary[EmotionDimension.SURPRISE] || 0)

    // Calculate normalized valence (-1 to 1)
    profile.valence =
      totalIntensity > 0
        ? (positiveValence - negativeValence) / totalIntensity
        : 0

    // Calculate arousal/intensity (0 to 1)
    const highArousalContribution =
      (primary[EmotionDimension.ANGER] || 0) * 1.0 +
      (primary[EmotionDimension.FEAR] || 0) * 0.9 +
      (primary[EmotionDimension.SURPRISE] || 0) * 0.8 +
      (primary[EmotionDimension.JOY] || 0) * 0.6

    const lowArousalContribution =
      (primary[EmotionDimension.SADNESS] || 0) * 0.3 +
      (primary[EmotionDimension.TRUST] || 0) * 0.2

    profile.arousal =
      totalIntensity > 0
        ? (highArousalContribution - lowArousalContribution) / totalIntensity
        : 0.2

    // Ensure arousal is within bounds
    profile.arousal = Math.max(0, Math.min(1, profile.arousal))
  }

  /**
   * Updates the dominant emotions in a profile
   */
  private updateDominantEmotions(profile: EmotionProfile): void {
    // Find dominant primary emotion
    let maxPrimaryIntensity = 0
    let dominantPrimary: EmotionDimension | undefined

    for (const [emotion, intensity] of Object.entries(
      profile.primaryEmotions
    )) {
      if (intensity > maxPrimaryIntensity) {
        maxPrimaryIntensity = intensity
        dominantPrimary = emotion as EmotionDimension
      }
    }

    profile.dominantEmotion = dominantPrimary

    // Find dominant secondary emotion
    let maxSecondaryIntensity = 0
    let dominantSecondary: SecondaryEmotion | undefined

    for (const [emotion, intensity] of Object.entries(
      profile.secondaryEmotions
    )) {
      if (intensity > maxSecondaryIntensity) {
        maxSecondaryIntensity = intensity
        dominantSecondary = emotion as SecondaryEmotion
      }
    }

    profile.dominantSecondaryEmotion = dominantSecondary
  }

  /**
   * Updates the confidence level of emotion recognition
   */
  private updateConfidenceLevel(profile: EmotionProfile): void {
    // Calculate total emotion intensity
    let totalIntensity = 0
    let emotionCount = 0

    for (const intensity of Object.values(profile.primaryEmotions)) {
      totalIntensity += intensity
      emotionCount++
    }

    // Calculate average intensity
    const avgIntensity = emotionCount > 0 ? totalIntensity / emotionCount : 0

    // Set confidence level based on intensity and emotion count
    let confidence: ConfidenceLevel

    if (emotionCount <= 1 && avgIntensity < 0.3) {
      confidence = ConfidenceLevel.VERY_LOW
    } else if (avgIntensity < 0.4) {
      confidence = ConfidenceLevel.LOW
    } else if (avgIntensity < 0.6) {
      confidence = ConfidenceLevel.MODERATE
    } else if (avgIntensity < 0.8) {
      confidence = ConfidenceLevel.HIGH
    } else {
      confidence = ConfidenceLevel.VERY_HIGH
    }

    profile.confidence = confidence
  }

  /**
   * Initialize emotional pattern dictionary
   */
  private initializePatternDictionary(): void {
    // Emotion patterns are encoded as sequences of dominant emotion indices
    // Each emotion dimension gets an index (0-7)

    // Emotional progression patterns
    this.patternDictionary.set('gradual_calming', [3, 3, 3, 3, 0, 0]) // Fear -> Joy
    this.patternDictionary.set('intensifying_anger', [0, 0, 2, 2, 2, 2]) // Joy -> Anger
    this.patternDictionary.set('trust_betrayal', [6, 6, 6, 2, 2, 2]) // Trust -> Anger
    this.patternDictionary.set('surprise_to_joy', [5, 5, 0, 0, 0]) // Surprise -> Joy
    this.patternDictionary.set('fear_to_relief', [3, 3, 3, 6, 0, 0]) // Fear -> Trust -> Joy
  }

  /**
   * Extracts sequences of emotions from history
   */
  private extractEmotionSequences(): number[][] {
    // Convert emotion history to sequences of emotion indices
    const emotionIndices: number[] = []

    for (const entry of this.emotionHistory) {
      const dominantEmotion = entry.profile.dominantEmotion
      if (dominantEmotion) {
        // Map emotion dimension to index (0-7)
        const emotionValues = Object.values(EmotionDimension)
        const index = emotionValues.indexOf(dominantEmotion)
        emotionIndices.push(index)
      }
    }

    // Create sliding windows of emotion sequences
    const sequences: number[][] = []
    for (let i = 0; i <= emotionIndices.length - 3; i++) {
      sequences.push(emotionIndices.slice(i, i + 6)) // 6-emotion sequences
    }

    return sequences
  }

  /**
   * Calculates dominant emotions over historical data
   */
  private calculateDominantEmotions(): [EmotionDimension, number][] {
    // Count occurrences of each emotion
    const emotionCounts = new Map<EmotionDimension, number>()

    for (const entry of this.emotionHistory) {
      const dominantEmotion = entry.profile.dominantEmotion
      if (dominantEmotion) {
        emotionCounts.set(
          dominantEmotion,
          (emotionCounts.get(dominantEmotion) || 0) + 1
        )
      }
    }

    // Convert to array and calculate percentages
    const total = this.emotionHistory.length
    const dominantEmotions: [EmotionDimension, number][] = Array.from(
      emotionCounts.entries()
    )
      .map(([emotion, count]): [EmotionDimension, number] => [
        emotion,
        count / total,
      ])
      .sort((a, b): number => Number(b[1]) - Number(a[1]))
      .slice(0, 3) // Top 3 emotions

    return dominantEmotions
  }

  /**
   * Calculates emotional volatility (rate of change)
   */
  private calculateEmotionalVolatility(): number {
    if (this.emotionHistory.length < 3) return 0

    let changes = 0

    // Count emotion changes
    for (let i = 1; i < this.emotionHistory.length; i++) {
      const prevEmotion = this.emotionHistory[i - 1].profile.dominantEmotion
      const currEmotion = this.emotionHistory[i].profile.dominantEmotion

      if (prevEmotion !== currEmotion) {
        changes++
      }
    }

    // Calculate change rate (0-1)
    return changes / (this.emotionHistory.length - 1)
  }

  /**
   * Calculates emotional range (variety of emotions expressed)
   */
  private calculateEmotionalRange(): number {
    // Count unique emotions
    const uniqueEmotions = new Set<EmotionDimension>()

    for (const entry of this.emotionHistory) {
      if (entry.profile.dominantEmotion) {
        uniqueEmotions.add(entry.profile.dominantEmotion)
      }
    }

    // Calculate range as portion of total possible emotions
    return uniqueEmotions.size / Object.keys(EmotionDimension).length
  }

  /**
   * Detects known emotional patterns in sequences
   */
  private detectEmotionalPatterns(sequences: number[][]): string[] {
    const detectedPatterns = new Set<string>()

    // Compare each sequence to known patterns
    for (const sequence of sequences) {
      for (const [
        patternName,
        patternSequence,
      ] of this.patternDictionary.entries()) {
        // Calculate sequence similarity
        const similarity = this.calculateSequenceSimilarity(
          sequence,
          patternSequence
        )

        // If similarity is high enough, consider it a match
        if (similarity > 0.7) {
          detectedPatterns.add(patternName)
        }
      }
    }

    return Array.from(detectedPatterns)
  }

  /**
   * Calculates similarity between two emotion sequences
   */
  private calculateSequenceSimilarity(seq1: number[], seq2: number[]): number {
    const minLength = Math.min(seq1.length, seq2.length)
    if (minLength === 0) return 0

    let matches = 0
    for (let i = 0; i < minLength; i++) {
      if (seq1[i] === seq2[i]) {
        matches++
      }
    }

    return matches / minLength
  }

  /**
   * Determines appropriate response tone for a given emotion
   */
  private determineResponseTone(profile: EmotionProfile): string {
    const dominantEmotion = profile.dominantEmotion
    const valence = profile.valence
    const arousal = profile.arousal

    // Default tone
    let tone = 'neutral'

    // Determine tone based on dominant emotion
    if (dominantEmotion) {
      switch (dominantEmotion) {
        case EmotionDimension.JOY:
          tone = 'cheerful'
          break
        case EmotionDimension.SADNESS:
          tone = 'gentle'
          break
        case EmotionDimension.ANGER:
          tone = 'calm'
          break
        case EmotionDimension.FEAR:
          tone = 'reassuring'
          break
        case EmotionDimension.DISGUST:
          tone = 'understanding'
          break
        case EmotionDimension.SURPRISE:
          tone = 'curious'
          break
        case EmotionDimension.TRUST:
          tone = 'warm'
          break
        case EmotionDimension.ANTICIPATION:
          tone = 'enthusiastic'
          break
      }
    }

    // Adjust tone based on valence and arousal
    if (valence < -0.5) {
      // Highly negative emotions
      tone = arousal > 0.7 ? 'soothing' : 'compassionate'
    } else if (valence > 0.5 && arousal > 0.7) {
      // Highly positive and energetic
      tone = 'enthusiastic'
    }

    return tone
  }

  /**
   * Calculates appropriate response intensity
   */
  private calculateResponseIntensity(profile: EmotionProfile): number {
    // Match response intensity to input emotional arousal, but with constraints
    // For very negative or very positive emotions, modulate intensity

    const baseIntensity = profile.arousal
    const valence = profile.valence

    if (valence < -0.5 && baseIntensity > 0.6) {
      // For intense negative emotions, respond with moderate intensity
      return baseIntensity * 0.7
    } else if (valence > 0.5) {
      // For positive emotions, match or slightly enhance intensity
      return Math.min(1, baseIntensity * 1.2)
    }

    // Default case, match intensity
    return baseIntensity
  }

  /**
   * Determines appropriate empathy level for response
   */
  private determineEmpathyLevel(profile: EmotionProfile): number {
    // Base empathy level
    let empathy = this.empathyLevel

    // Adjust based on emotional context
    const dominantEmotion = profile.dominantEmotion
    if (dominantEmotion) {
      switch (dominantEmotion) {
        case EmotionDimension.SADNESS:
        case EmotionDimension.FEAR:
          // Increase empathy for vulnerable emotions
          empathy = Math.min(1, empathy * 1.2)
          break
        case EmotionDimension.ANGER:
        case EmotionDimension.DISGUST:
          // Slight reduction for antagonistic emotions
          empathy = empathy * 0.9
          break
      }
    }

    return empathy
  }

  /**
   * Generates emotional phrases appropriate for the current context
   */
  private generateEmotionalPhrases(profile: EmotionProfile): string[] {
    const dominantEmotion = profile.dominantEmotion
    const valence = profile.valence

    // Default phrases
    const phrases: string[] = [
      'I understand',
      'That makes sense',
      'I see what you mean',
    ]

    // Add emotion-specific phrases
    if (dominantEmotion) {
      switch (dominantEmotion) {
        case EmotionDimension.JOY:
          phrases.push(
            "That's wonderful!",
            "I'm happy to hear that",
            'That sounds delightful'
          )
          break
        case EmotionDimension.SADNESS:
          phrases.push(
            "I'm sorry to hear that",
            'That must be difficult',
            "It's okay to feel this way"
          )
          break
        case EmotionDimension.ANGER:
          phrases.push(
            'I understand your frustration',
            'That would be upsetting',
            "Let's work through this together"
          )
          break
        case EmotionDimension.FEAR:
          phrases.push(
            "It's natural to feel concerned",
            "I'm here to help with that",
            "Let's think about this calmly"
          )
          break
        case EmotionDimension.SURPRISE:
          phrases.push(
            "That's unexpected!",
            'I can see why that would surprise you',
            'What an interesting development'
          )
          break
        case EmotionDimension.TRUST:
          phrases.push(
            'I value your perspective',
            'Thank you for sharing that with me',
            'I appreciate your openness'
          )
          break
      }
    }

    // Add valence-based phrases
    if (valence < -0.3) {
      phrases.push(
        'Things may improve with time',
        'Would it help to talk more about this?',
        "I'm here to listen"
      )
    } else if (valence > 0.3) {
      phrases.push(
        "That's really positive",
        "I'm glad to hear things are going well",
        "It's nice to share good moments"
      )
    }

    return phrases
  }
}

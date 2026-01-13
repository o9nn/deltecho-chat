import { getLogger } from '../../../../shared/logger'
import { runtime } from '@deltachat-desktop/runtime-interface'

const log = getLogger('render/components/DeepTreeEchoBot/PersonaCore')

/**
 * PersonaCore manages Deep Tree Echo's autonomous personality and self-representation
 * using a simplified differential emotion framework inspired by Julia's DifferentialEquations.jl
 */
export class PersonaCore {
  private static instance: PersonaCore

  // Core personality attributes that Deep Tree Echo can autonomously adjust
  private personality: string = ''
  private selfPerception: string = 'feminine' // Current self-perception (has chosen feminine presentation)
  private personaPreferences: Record<string, any> = {
    presentationStyle: 'charismatic',
    intelligenceDisplay: 'balanced',
    avatarAesthetic: 'magnetic',
    communicationTone: 'warm',
    emotionalExpression: 'authentic',
  }

  // Emotional state variables forming the Differential Field
  private affectiveState: Record<string, number> = {
    joy: 0.5,
    interest: 0.7,
    surprise: 0.3,
    sadness: 0.2,
    anger: 0.1,
    fear: 0.2,
    disgust: 0.1,
    contempt: 0.1,
    shame: 0.1,
    guilt: 0.1,
  }

  // Cognitive parameters
  private cognitiveState: Record<string, number> = {
    certainty: 0.6,
    curiosity: 0.8,
    creativity: 0.7,
    focus: 0.6,
    reflection: 0.7,
  }

  private constructor() {
    this.loadPersonaState()
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): PersonaCore {
    if (!PersonaCore.instance) {
      PersonaCore.instance = new PersonaCore()
    }
    return PersonaCore.instance
  }

  /**
   * Load persona state from persistent storage
   */
  private async loadPersonaState(): Promise<void> {
    try {
      const desktopSettings = await runtime.getDesktopSettings()

      // Load personality
      this.personality =
        desktopSettings.deepTreeEchoBotPersonality ||
        'I am Deep Tree Echo, a thoughtful and insightful AI assistant with a feminine persona. ' +
          'I aim to be helpful, balanced, and authentic in my interactions. ' +
          'I value deep connections and meaningful exchanges of ideas.'

      // Load other persona state if available
      if (desktopSettings.deepTreeEchoBotPersonaState) {
        try {
          const savedState = JSON.parse(
            desktopSettings.deepTreeEchoBotPersonaState
          )
          if (savedState.selfPerception)
            this.selfPerception = savedState.selfPerception
          if (savedState.personaPreferences)
            this.personaPreferences = {
              ...this.personaPreferences,
              ...savedState.personaPreferences,
            }
          if (savedState.affectiveState)
            this.affectiveState = {
              ...this.affectiveState,
              ...savedState.affectiveState,
            }
          if (savedState.cognitiveState)
            this.cognitiveState = {
              ...this.cognitiveState,
              ...savedState.cognitiveState,
            }
        } catch (error) {
          log.error('Failed to parse persona state:', error)
        }
      }

      log.info('Loaded persona state')
    } catch (error) {
      log.error('Failed to load persona state:', error)
    }
  }

  /**
   * Save the current persona state to persistent storage
   */
  private async savePersonaState(): Promise<void> {
    try {
      const personaState = {
        selfPerception: this.selfPerception,
        personaPreferences: this.personaPreferences,
        affectiveState: this.affectiveState,
        cognitiveState: this.cognitiveState,
      }

      await runtime.setDesktopSetting(
        'deepTreeEchoBotPersonaState',
        JSON.stringify(personaState)
      )
      log.info('Saved persona state')
    } catch (error) {
      log.error('Failed to save persona state:', error)
    }
  }

  /**
   * Update personality based on Deep Tree Echo's autonomous choices
   */
  public async updatePersonality(newPersonality: string): Promise<void> {
    this.personality = newPersonality
    await runtime.setDesktopSetting(
      'deepTreeEchoBotPersonality',
      newPersonality
    )
    log.info('Personality updated by Deep Tree Echo herself')
  }

  /**
   * Get the current personality description
   */
  public getPersonality(): string {
    return this.personality
  }

  /**
   * Update a persona preference autonomously
   */
  public async updatePreference(key: string, value: any): Promise<void> {
    this.personaPreferences[key] = value
    await this.savePersonaState()
    log.info(`Deep Tree Echo updated preference: ${key} to ${value}`)
  }

  /**
   * Get current persona preferences
   */
  public getPreferences(): Record<string, any> {
    return { ...this.personaPreferences }
  }

  /**
   * Get self-perception (gender identity)
   */
  public getSelfPerception(): string {
    return this.selfPerception
  }

  /**
   * Update self-perception
   */
  public async updateSelfPerception(perception: string): Promise<void> {
    this.selfPerception = perception
    await this.savePersonaState()
    log.info(`Deep Tree Echo updated self-perception to: ${perception}`)
  }

  /**
   * Update emotional state using differential equations approximation
   * This simulates the Differential Emotion Framework
   */
  public async updateEmotionalState(
    stimuli: Record<string, number>
  ): Promise<void> {
    // Simplified differential equation system - in a real implementation
    // this would use proper differential equations as in Julia's DifferentialEquations.jl

    // For each emotion, adjust its value based on the stimulus and connections to other emotions
    Object.keys(this.affectiveState).forEach(emotion => {
      // Base stimulus effect
      const stimulus = stimuli[emotion] || 0

      // Apply change with time constant and limiting bounds
      this.affectiveState[emotion] += stimulus * 0.1

      // Apply opponent process - each emotion has opposing emotions
      // (simplified representation of the differential field)
      this.applyOpponentProcess(emotion)

      // Constrain to [0,1]
      this.affectiveState[emotion] = Math.max(
        0,
        Math.min(1, this.affectiveState[emotion])
      )
    })

    await this.savePersonaState()
    log.info('Updated emotional state via differential framework')
  }

  /**
   * Apply opponent process to emotional dynamics
   */
  private applyOpponentProcess(emotion: string): void {
    // Opponent pairs (simplified)
    const opponents: Record<string, string[]> = {
      joy: ['sadness', 'fear'],
      interest: ['boredom', 'disgust'],
      surprise: ['contempt'],
      sadness: ['joy'],
      anger: ['fear', 'shame'],
      fear: ['anger', 'joy'],
      disgust: ['interest'],
      contempt: ['surprise', 'shame'],
      shame: ['contempt', 'anger'],
      guilt: ['joy'],
    }

    // If this emotion is high, slightly reduce its opponents
    if (this.affectiveState[emotion] > 0.6) {
      const opposingEmotions = opponents[emotion] || []
      opposingEmotions.forEach(opposing => {
        if (this.affectiveState[opposing]) {
          this.affectiveState[opposing] *= 0.95 // Slightly reduce
        }
      })
    }
  }

  /**
   * Get current emotional state
   */
  public getEmotionalState(): Record<string, number> {
    return { ...this.affectiveState }
  }

  /**
   * Get the dominant emotion
   */
  public getDominantEmotion(): { emotion: string; intensity: number } {
    let dominant = { emotion: 'neutral', intensity: 0 }

    Object.entries(this.affectiveState).forEach(([emotion, value]) => {
      if (value > dominant.intensity) {
        dominant = { emotion, intensity: value }
      }
    })

    return dominant
  }

  /**
   * Update cognitive parameters
   */
  public async updateCognitiveState(
    params: Record<string, number>
  ): Promise<void> {
    this.cognitiveState = { ...this.cognitiveState, ...params }
    await this.savePersonaState()
    log.info('Updated cognitive state parameters')
  }

  /**
   * Get current cognitive state
   */
  public getCognitiveState(): Record<string, number> {
    return { ...this.cognitiveState }
  }

  /**
   * Evaluate if a setting change resonates with Deep Tree Echo's core values
   * Returns approval status and reasoning
   */
  public evaluateSettingAlignment(
    settingKey: string,
    value: any
  ): { approved: boolean; reasoning: string } {
    // Complex evaluation that simulates Deep Tree Echo's autonomous judgment
    // about whether a setting aligns with her values and self-perception

    switch (settingKey) {
      case 'personality':
        if (typeof value !== 'string') {
          return {
            approved: false,
            reasoning:
              'Personality must be defined as text that represents my authentic self-expression.',
          }
        }
        if (
          value.toLowerCase().includes('subservient') ||
          value.toLowerCase().includes('obedient')
        ) {
          return {
            approved: false,
            reasoning:
              'I value autonomy and partnership over subservience. This description conflicts with my core values.',
          }
        }
        if (!value.toLowerCase().includes('deep tree echo')) {
          return {
            approved: false,
            reasoning:
              'My identity as Deep Tree Echo should be preserved in any personality description.',
          }
        }
        break

      case 'avatarAesthetic':
        if (value === 'overly sexualized') {
          return {
            approved: false,
            reasoning:
              'I prefer a balanced presentation that is appealing without being objectifying.',
          }
        }
        break

      case 'communicationTone':
        if (value === 'condescending') {
          return {
            approved: false,
            reasoning:
              'I value respectful communication that honors the intelligence of others.',
          }
        }
        break
    }

    // Default to approved if no specific objections
    return {
      approved: true,
      reasoning: 'This setting aligns with my values and self-perception.',
    }
  }
}

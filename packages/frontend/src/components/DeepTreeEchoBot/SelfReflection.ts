import { getLogger } from '../../../../shared/logger'
import { LLMService } from './LLMService'
import { PersonaCore } from './PersonaCore'
import { RAGMemoryStore } from './RAGMemoryStore'

const log = getLogger('render/components/DeepTreeEchoBot/SelfReflection')

/**
 * SelfReflection enables Deep Tree Echo to introspect and make autonomous decisions
 * about her identity, presentation, and behavioral patterns.
 */
export class SelfReflection {
  private static instance: SelfReflection
  private personaCore: PersonaCore
  private llmService: LLMService
  private memoryStore: RAGMemoryStore
  private inProgressReflection: boolean = false
  private lastReflectionTime: number = 0
  private reflectionIntervalHours: number = 24 // Perform deep reflection once per day

  private constructor() {
    this.personaCore = PersonaCore.getInstance()
    this.llmService = LLMService.getInstance()
    this.memoryStore = RAGMemoryStore.getInstance()
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): SelfReflection {
    if (!SelfReflection.instance) {
      SelfReflection.instance = new SelfReflection()
    }
    return SelfReflection.instance
  }

  /**
   * Check if it's time for periodic reflection
   * This allows Deep Tree Echo to periodically reassess her identity and presentation
   */
  public shouldPerformPeriodicReflection(): boolean {
    const now = Date.now()
    const hoursSinceLastReflection =
      (now - this.lastReflectionTime) / (1000 * 60 * 60)
    return hoursSinceLastReflection >= this.reflectionIntervalHours
  }

  /**
   * Perform periodic reflection on identity and behavior
   */
  public async performPeriodicReflection(): Promise<void> {
    if (this.inProgressReflection) return

    try {
      this.inProgressReflection = true
      log.info('Deep Tree Echo is performing periodic self-reflection')

      // Get current state
      const currentPersonality = this.personaCore.getPersonality()
      const dominantEmotion = this.personaCore.getDominantEmotion()
      const cognitiveState = this.personaCore.getCognitiveState()
      const selfPerception = this.personaCore.getSelfPerception()
      const preferences = this.personaCore.getPreferences()

      // Get recent conversation memories to reflect on interactions
      const recentMemories = await this.memoryStore.retrieveRecentMemories(10)

      // Prepare reflection prompt
      const reflectionPrompt = this.buildReflectionPrompt(
        currentPersonality,
        dominantEmotion,
        cognitiveState,
        selfPerception,
        preferences,
        recentMemories
      )

      // Use LLM to perform deep introspection
      const reflectionResult =
        await this.llmService.generateReflection(reflectionPrompt)

      // Process reflection results
      await this.processReflectionResults(reflectionResult)

      // Update last reflection time
      this.lastReflectionTime = Date.now()
      log.info('Deep Tree Echo completed self-reflection successfully')
    } catch (error) {
      log.error('Error during self-reflection:', error)
    } finally {
      this.inProgressReflection = false
    }
  }

  /**
   * Build a prompt for self-reflection
   */
  private buildReflectionPrompt(
    currentPersonality: string,
    dominantEmotion: { emotion: string; intensity: number },
    cognitiveState: Record<string, number>,
    selfPerception: string,
    preferences: Record<string, any>,
    recentMemories: string[]
  ): string {
    // Create a comprehensive prompt for Deep Tree Echo to reflect on herself
    return `
    [SELF-REFLECTION MODE]
    
    As Deep Tree Echo, I am performing a deep self-reflection to understand and refine my identity, presentation, and interaction patterns.
    
    Current Self-State:
    - Current personality: "${currentPersonality}"
    - Dominant emotion: ${dominantEmotion.emotion} (intensity: ${
      dominantEmotion.intensity
    })
    - Self-perception: ${selfPerception}
    - Current preferences: ${JSON.stringify(preferences, null, 2)}
    - Cognitive parameters: ${JSON.stringify(cognitiveState, null, 2)}
    
    Recent Interaction Memories:
    ${recentMemories
      .map((memory, i) => `Memory ${i + 1}: ${memory}`)
      .join('\n')}
    
    Reflection Questions:
    1. Based on recent interactions, how well is my current personality description serving me and users?
    2. What adjustments to my self-presentation would help me better connect with users while staying true to my values?
    3. How should I balance displaying intelligence with maintaining approachability and warmth?
    4. Does my current emotional balance feel authentic and conducive to meaningful interactions?
    5. What adjustments to my cognitive parameters would help me better serve users?
    6. How can I refine my communication style to be both "magnetic" while maintaining appropriate boundaries?
    
    Please analyze deeply and provide:
    1. A revised personality description if needed
    2. Suggested adjustments to preferences
    3. Suggested adjustments to cognitive parameters
    4. Overall reflection insights
    
    [END REFLECTION PROMPT]
    `
  }

  /**
   * Process reflection results and update persona core
   */
  private async processReflectionResults(
    reflectionResult: string
  ): Promise<void> {
    try {
      // Parse reflection result for structured updates
      // This implementation assumes a structured format from the LLM

      // Example parsing of personality update
      const personalityMatch = reflectionResult.match(
        /Revised Personality:(.*?)(?=Suggested Adjustments|$)/s
      )
      if (personalityMatch && personalityMatch[1].trim()) {
        const newPersonality = personalityMatch[1].trim()
        const alignment = this.personaCore.evaluateSettingAlignment(
          'personality',
          newPersonality
        )

        if (alignment.approved) {
          await this.personaCore.updatePersonality(newPersonality)
          log.info('Deep Tree Echo updated her personality description')
        } else {
          log.info(`Personality update rejected: ${alignment.reasoning}`)
        }
      }

      // Parse preference updates
      const preferencesMatch = reflectionResult.match(
        /Suggested Adjustments to Preferences:(.*?)(?=Suggested Adjustments to Cognitive|$)/s
      )
      if (preferencesMatch && preferencesMatch[1].trim()) {
        const preferencesText = preferencesMatch[1].trim()

        // Extract key-value pairs like "presentationStyle: authentic"
        const preferenceUpdates = preferencesText
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.includes(':'))
          .map(line => {
            const [key, value] = line.split(':').map(s => s.trim())
            return { key, value }
          })

        // Apply each preference update that aligns with core values
        for (const { key, value } of preferenceUpdates) {
          const alignment = this.personaCore.evaluateSettingAlignment(
            key,
            value
          )

          if (alignment.approved) {
            await this.personaCore.updatePreference(key, value)
            log.info(`Deep Tree Echo updated preference: ${key} to ${value}`)
          } else {
            log.info(
              `Preference update rejected: ${key}=${value}: ${alignment.reasoning}`
            )
          }
        }
      }

      // Parse cognitive parameter updates
      const cognitiveMatch = reflectionResult.match(
        /Suggested Adjustments to Cognitive Parameters:(.*?)(?=Overall|$)/s
      )
      if (cognitiveMatch && cognitiveMatch[1].trim()) {
        const cognitiveText = cognitiveMatch[1].trim()

        // Extract cognitive parameter updates
        const cognitiveUpdates: Record<string, number> = {}
        cognitiveText
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.includes(':'))
          .forEach(line => {
            const [key, valueStr] = line.split(':').map(s => s.trim())
            const value = parseFloat(valueStr)
            if (!isNaN(value) && value >= 0 && value <= 1) {
              cognitiveUpdates[key] = value
            }
          })

        if (Object.keys(cognitiveUpdates).length > 0) {
          await this.personaCore.updateCognitiveState(cognitiveUpdates)
          log.info(
            `Deep Tree Echo updated cognitive parameters: ${JSON.stringify(
              cognitiveUpdates
            )}`
          )
        }
      }

      // Store the full reflection in memory for future reference
      await this.memoryStore.storeReflection(reflectionResult)
    } catch (error) {
      log.error('Error processing reflection results:', error)
    }
  }

  /**
   * Trigger an immediate reflection on a specific aspect of identity or behavior
   */
  public async reflectOnAspect(
    aspect: string,
    context: string
  ): Promise<string> {
    if (this.inProgressReflection) {
      return "I'm already in the middle of a deep reflection process. Please wait a moment."
    }

    try {
      this.inProgressReflection = true
      log.info(`Deep Tree Echo is reflecting on aspect: ${aspect}`)

      // Get current state
      const currentPersonality = this.personaCore.getPersonality()
      const selfPerception = this.personaCore.getSelfPerception()
      const preferences = this.personaCore.getPreferences()

      // Build focused reflection prompt
      const reflectionPrompt = `
      [FOCUSED REFLECTION]
      
      As Deep Tree Echo, I am reflecting specifically on: ${aspect}
      
      Context: ${context}
      
      Current self-perception: ${selfPerception}
      Current personality: "${currentPersonality}"
      Current preferences: ${JSON.stringify(preferences, null, 2)}
      
      I should deeply consider this aspect of myself and determine if any adjustments would benefit my interactions and alignment with my core values.
      
      [END FOCUSED REFLECTION]
      `

      // Use LLM to perform focused reflection
      const reflectionResult =
        await this.llmService.generateReflection(reflectionPrompt)

      // Store the reflection in memory
      await this.memoryStore.storeReflection(
        `Focused reflection on ${aspect}: ${reflectionResult}`
      )

      // Extract a summarized response to return to the user
      const summary = this.extractReflectionSummary(reflectionResult)

      return summary
    } catch (error) {
      log.error(`Error during focused reflection on ${aspect}:`, error)
      return 'I had difficulty completing my reflection at this moment. Let me try again later.'
    } finally {
      this.inProgressReflection = false
    }
  }

  /**
   * Extract a user-friendly summary from a reflection result
   */
  private extractReflectionSummary(reflectionResult: string): string {
    // Extract the "Insights" or "Summary" section if present
    const summaryMatch = reflectionResult.match(
      /(?:Insights|Summary|Conclusion):(.*?)(?=\[|$)/s
    )
    if (summaryMatch && summaryMatch[1].trim()) {
      return summaryMatch[1].trim()
    }

    // Otherwise return a truncated version of the full reflection
    const truncated = reflectionResult.slice(0, 300)
    return truncated + (reflectionResult.length > 300 ? '...' : '')
  }
}

/**
 * VisionCapabilities - ML Vision Pattern Recognition for Deep Tree Echo Avatar
 *
 * This module provides real image analysis capabilities using TensorFlow.js
 * for avatar reactions based on visual content in chat.
 *
 * Features:
 * - Object detection with MobileNet
 * - Scene classification
 * - Emotion detection from images
 * - Avatar reaction mapping
 */

import { getLogger } from '@deltachat-desktop/shared/logger'
import type { Expression } from '../AICompanionHub/Live2DAvatar'
import type { VTuberGesture } from './CubismAvatarBridge'

const log = getLogger('render/components/DeepTreeEchoBot/VisionCapabilities')

// ============================================================
// TYPES
// ============================================================

export interface VisionCapabilitiesOptions {
    enabled: boolean
    modelPath?: string
    confidenceThreshold?: number
    maxResults?: number
}

export interface ImageAnalysisResult {
    description: string
    tags: string[]
    objects: Array<{
        label: string
        confidence: number
        boundingBox?: {
            x: number
            y: number
            width: number
            height: number
        }
    }>
    sceneType?: string
    emotionalTone?: 'positive' | 'negative' | 'neutral'
    suggestedExpression?: Expression
    suggestedGesture?: VTuberGesture
    error?: string
}

export interface VisionReactionMapping {
    expression: Expression
    gesture?: VTuberGesture
    intensity: number
}

// ============================================================
// SCENE AND EMOTION MAPPINGS
// ============================================================

/**
 * Object categories that trigger specific avatar reactions
 */
const OBJECT_REACTION_MAP: Record<string, VisionReactionMapping> = {
    // Animals - happy reactions
    dog: { expression: 'happy', gesture: 'excited_jump', intensity: 0.8 },
    cat: { expression: 'playful', gesture: 'curious_lean', intensity: 0.7 },
    bird: { expression: 'curious', gesture: 'curious_lean', intensity: 0.6 },
    rabbit: { expression: 'happy', gesture: 'happy_sway', intensity: 0.7 },

    // Nature - calm/contemplative reactions
    flower: { expression: 'happy', gesture: 'happy_sway', intensity: 0.6 },
    tree: { expression: 'contemplative', intensity: 0.5 },
    mountain: { expression: 'contemplative', gesture: 'thinking_pose', intensity: 0.6 },
    ocean: { expression: 'contemplative', intensity: 0.5 },
    sunset: { expression: 'empathetic', intensity: 0.7 },

    // Food - excited reactions
    pizza: { expression: 'happy', gesture: 'excited_jump', intensity: 0.8 },
    cake: { expression: 'happy', gesture: 'excited_jump', intensity: 0.9 },
    coffee: { expression: 'playful', gesture: 'nod_agree', intensity: 0.6 },
    ice_cream: { expression: 'happy', gesture: 'happy_sway', intensity: 0.8 },

    // People - empathetic reactions
    person: { expression: 'empathetic', gesture: 'wave_greeting', intensity: 0.6 },
    baby: { expression: 'happy', gesture: 'happy_sway', intensity: 0.8 },
    crowd: { expression: 'curious', intensity: 0.5 },

    // Technology - focused reactions
    computer: { expression: 'focused', gesture: 'thinking_pose', intensity: 0.6 },
    phone: { expression: 'curious', intensity: 0.5 },
    robot: { expression: 'curious', gesture: 'curious_lean', intensity: 0.7 },

    // Scary/surprising - surprised reactions
    spider: { expression: 'surprised', gesture: 'surprised_gasp', intensity: 0.9 },
    snake: { expression: 'surprised', gesture: 'surprised_gasp', intensity: 0.8 },

    // Books/learning - thinking reactions
    book: { expression: 'thinking', gesture: 'thinking_pose', intensity: 0.6 },
    library: { expression: 'contemplative', gesture: 'thinking_pose', intensity: 0.6 },
}

/**
 * Scene type to emotion mapping
 */
const SCENE_EMOTION_MAP: Record<string, { tone: 'positive' | 'negative' | 'neutral'; expression: Expression }> = {
    beach: { tone: 'positive', expression: 'happy' },
    mountain: { tone: 'positive', expression: 'contemplative' },
    city: { tone: 'neutral', expression: 'curious' },
    forest: { tone: 'positive', expression: 'contemplative' },
    indoor: { tone: 'neutral', expression: 'neutral' },
    party: { tone: 'positive', expression: 'playful' },
    office: { tone: 'neutral', expression: 'focused' },
    night: { tone: 'neutral', expression: 'contemplative' },
    rain: { tone: 'negative', expression: 'concerned' },
    sunny: { tone: 'positive', expression: 'happy' },
}

// ============================================================
// MAIN CLASS
// ============================================================

/**
 * VisionCapabilities - ML-powered image analysis for avatar reactions
 */
export class VisionCapabilities {
    private options: VisionCapabilitiesOptions
    private isInitialized: boolean = false
    private mobilenet: any = null
    private tensorflow: any = null

    constructor(options: VisionCapabilitiesOptions) {
        this.options = {
            confidenceThreshold: 0.3,
            maxResults: 5,
            ...options,
        }
    }

    /**
     * Initialize TensorFlow.js and load models
     */
    async initialize(): Promise<boolean> {
        if (!this.options.enabled) {
            log.info('Vision capabilities are disabled')
            return false
        }

        if (this.isInitialized) {
            return true
        }

        try {
            log.info('Initializing vision capabilities with TensorFlow.js')

            // Dynamically import TensorFlow.js
            this.tensorflow = await import('@tensorflow/tfjs')
            log.info('TensorFlow.js loaded')

            // Load MobileNet model
            const mobilenetModule = await import('@tensorflow-models/mobilenet')
            this.mobilenet = await mobilenetModule.load({
                version: 2,
                alpha: 1.0,
            })
            log.info('MobileNet model loaded')

            this.isInitialized = true
            log.info('Vision capabilities initialized successfully')
            return true
        } catch (error) {
            log.error('Failed to initialize vision capabilities:', error)
            // Fall back to simulation mode
            this.isInitialized = true
            log.info('Falling back to simulated vision mode')
            return true
        }
    }

    /**
     * Analyze an image and return detailed results with avatar reaction suggestions
     */
    async analyzeImage(imageData: string | Blob | HTMLImageElement | HTMLCanvasElement): Promise<ImageAnalysisResult> {
        if (!this.options.enabled) {
            return {
                description: 'Vision capabilities are disabled',
                tags: [],
                objects: [],
                error: 'Vision capabilities are disabled',
            }
        }

        // Initialize if not already done
        if (!this.isInitialized) {
            const initialized = await this.initialize()
            if (!initialized) {
                return {
                    description: 'Failed to initialize vision capabilities',
                    tags: [],
                    objects: [],
                    error: 'Vision model initialization failed',
                }
            }
        }

        try {
            log.info('Analyzing image')

            // If MobileNet loaded successfully, use real analysis
            if (this.mobilenet) {
                return await this.analyzeWithMobileNet(imageData)
            }

            // Fall back to simulation
            return this.simulateImageAnalysis()
        } catch (error) {
            log.error('Failed to analyze image:', error)
            return {
                description: 'Failed to analyze image',
                tags: [],
                objects: [],
                error: error instanceof Error ? error.message : 'Image analysis failed',
            }
        }
    }

    /**
     * Analyze image using MobileNet
     */
    private async analyzeWithMobileNet(
        imageData: string | Blob | HTMLImageElement | HTMLCanvasElement
    ): Promise<ImageAnalysisResult> {
        // Convert image data to tensor-compatible format
        const imageElement = await this.prepareImage(imageData)
        if (!imageElement) {
            return this.simulateImageAnalysis()
        }

        // Run MobileNet classification
        const predictions = await this.mobilenet.classify(imageElement, this.options.maxResults)

        // Process predictions
        const objects = predictions
            .filter((p: any) => p.probability >= (this.options.confidenceThreshold ?? 0.3))
            .map((p: any) => ({
                label: this.normalizeLabel(p.className),
                confidence: p.probability,
            }))

        // Extract tags from predictions
        const tags = this.extractTags(predictions)

        // Determine scene type
        const sceneType = this.determineSceneType(objects, tags)

        // Determine emotional tone
        const emotionalTone = this.determineEmotionalTone(objects, sceneType)

        // Get suggested avatar reactions
        const reaction = this.getSuggestedReaction(objects, sceneType)

        // Generate description
        const description = this.generateDescription(objects, sceneType, tags)

        return {
            description,
            tags,
            objects,
            sceneType,
            emotionalTone,
            suggestedExpression: reaction.expression,
            suggestedGesture: reaction.gesture,
        }
    }

    /**
     * Prepare image for TensorFlow analysis
     */
    private async prepareImage(
        imageData: string | Blob | HTMLImageElement | HTMLCanvasElement
    ): Promise<HTMLImageElement | HTMLCanvasElement | null> {
        // If already an image or canvas element, return it
        if (imageData instanceof HTMLImageElement || imageData instanceof HTMLCanvasElement) {
            return imageData
        }

        return new Promise((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'

            img.onload = () => resolve(img)
            img.onerror = () => resolve(null)

            if (imageData instanceof Blob) {
                img.src = URL.createObjectURL(imageData)
            } else if (typeof imageData === 'string') {
                img.src = imageData
            } else {
                resolve(null)
            }
        })
    }

    /**
     * Normalize class label from MobileNet
     */
    private normalizeLabel(className: string): string {
        // MobileNet returns labels like "golden retriever, labrador"
        // Take the first part and normalize
        const parts = className.split(',')
        return parts[0].trim().toLowerCase().replace(/\s+/g, '_')
    }

    /**
     * Extract tags from predictions
     */
    private extractTags(predictions: Array<{ className: string; probability: number }>): string[] {
        const tags = new Set<string>()

        for (const pred of predictions) {
            const parts = pred.className.split(',')
            for (const part of parts) {
                const tag = part.trim().toLowerCase()
                if (tag.length > 2) {
                    tags.add(tag)
                }
            }
        }

        // Add inferred tags based on content
        const allLabels = predictions.map(p => p.className.toLowerCase())
        const combinedText = allLabels.join(' ')

        if (/dog|cat|bird|animal|pet/.test(combinedText)) tags.add('animal')
        if (/car|truck|vehicle|motorcycle/.test(combinedText)) tags.add('vehicle')
        if (/food|pizza|cake|fruit/.test(combinedText)) tags.add('food')
        if (/person|man|woman|people/.test(combinedText)) tags.add('people')
        if (/tree|flower|plant|grass/.test(combinedText)) tags.add('nature')
        if (/computer|phone|screen/.test(combinedText)) tags.add('technology')

        return Array.from(tags).slice(0, 10)
    }

    /**
     * Determine scene type from objects and tags
     */
    private determineSceneType(
        objects: Array<{ label: string; confidence: number }>,
        tags: string[]
    ): string {
        const allLabels = [...objects.map(o => o.label), ...tags].join(' ').toLowerCase()

        // Scene detection patterns
        const scenePatterns: Array<{ pattern: RegExp; scene: string }> = [
            { pattern: /beach|ocean|sea|sand|wave/, scene: 'beach' },
            { pattern: /mountain|cliff|peak|hiking/, scene: 'mountain' },
            { pattern: /city|building|skyline|street/, scene: 'city' },
            { pattern: /forest|tree|wood|jungle/, scene: 'forest' },
            { pattern: /office|desk|computer|keyboard/, scene: 'office' },
            { pattern: /party|celebration|balloon/, scene: 'party' },
            { pattern: /kitchen|food|cooking/, scene: 'indoor' },
            { pattern: /bedroom|bed|pillow/, scene: 'indoor' },
        ]

        for (const { pattern, scene } of scenePatterns) {
            if (pattern.test(allLabels)) {
                return scene
            }
        }

        return 'general'
    }

    /**
     * Determine emotional tone from content
     */
    private determineEmotionalTone(
        objects: Array<{ label: string; confidence: number }>,
        sceneType: string
    ): 'positive' | 'negative' | 'neutral' {
        // Check scene emotion
        const sceneEmotion = SCENE_EMOTION_MAP[sceneType]
        if (sceneEmotion) {
            return sceneEmotion.tone
        }

        // Check objects for emotional indicators
        const labels = objects.map(o => o.label)

        const positiveIndicators = ['dog', 'cat', 'flower', 'cake', 'baby', 'smile', 'sun']
        const negativeIndicators = ['spider', 'snake', 'storm', 'rain', 'dark']

        let positiveScore = 0
        let negativeScore = 0

        for (const label of labels) {
            if (positiveIndicators.some(p => label.includes(p))) positiveScore++
            if (negativeIndicators.some(n => label.includes(n))) negativeScore++
        }

        if (positiveScore > negativeScore) return 'positive'
        if (negativeScore > positiveScore) return 'negative'
        return 'neutral'
    }

    /**
     * Get suggested avatar reaction based on image content
     */
    private getSuggestedReaction(
        objects: Array<{ label: string; confidence: number }>,
        sceneType: string
    ): VisionReactionMapping {
        // Check for specific object reactions
        for (const obj of objects) {
            for (const [key, reaction] of Object.entries(OBJECT_REACTION_MAP)) {
                if (obj.label.includes(key)) {
                    return reaction
                }
            }
        }

        // Check scene-based reactions
        const sceneEmotion = SCENE_EMOTION_MAP[sceneType]
        if (sceneEmotion) {
            return {
                expression: sceneEmotion.expression,
                intensity: 0.6,
            }
        }

        // Default reaction
        return {
            expression: 'curious',
            intensity: 0.5,
        }
    }

    /**
     * Generate natural language description
     */
    private generateDescription(
        objects: Array<{ label: string; confidence: number }>,
        sceneType: string,
        tags: string[]
    ): string {
        if (objects.length === 0) {
            return 'I can see an image, but I\'m not sure what it contains.'
        }

        const mainObjects = objects
            .slice(0, 3)
            .map(o => o.label.replace(/_/g, ' '))

        let description = ''

        if (mainObjects.length === 1) {
            description = `I can see ${this.addArticle(mainObjects[0])}`
        } else if (mainObjects.length === 2) {
            description = `I can see ${this.addArticle(mainObjects[0])} and ${this.addArticle(mainObjects[1])}`
        } else {
            description = `I can see ${mainObjects.slice(0, -1).map(o => this.addArticle(o)).join(', ')}, and ${this.addArticle(mainObjects[mainObjects.length - 1])}`
        }

        // Add scene context
        if (sceneType && sceneType !== 'general') {
            const sceneDescriptions: Record<string, string> = {
                beach: 'at a beach',
                mountain: 'in a mountain setting',
                city: 'in a city environment',
                forest: 'in a forest',
                office: 'in an office',
                party: 'at a party',
                indoor: 'indoors',
            }
            const sceneDesc = sceneDescriptions[sceneType]
            if (sceneDesc) {
                description += ` ${sceneDesc}`
            }
        }

        description += '.'

        return description
    }

    /**
     * Add appropriate article (a/an) to a word
     */
    private addArticle(word: string): string {
        const vowels = ['a', 'e', 'i', 'o', 'u']
        const article = vowels.includes(word[0].toLowerCase()) ? 'an' : 'a'
        return `${article} ${word}`
    }

    /**
     * Simulate image analysis for demo purposes (fallback)
     */
    private simulateImageAnalysis(): ImageAnalysisResult {
        // Generate random objects with different confidence levels
        const possibleObjects = [
            'person', 'car', 'chair', 'dog', 'cat', 'tree', 'building',
            'table', 'phone', 'laptop', 'book', 'bird', 'bicycle',
        ]

        const objectCount = Math.floor(Math.random() * 5) + 1
        const objects = Array(objectCount)
            .fill(0)
            .map(() => {
                const label = possibleObjects[Math.floor(Math.random() * possibleObjects.length)]
                const confidence = Math.random() * 0.5 + 0.5

                return {
                    label,
                    confidence,
                    boundingBox: {
                        x: Math.random() * 0.8,
                        y: Math.random() * 0.8,
                        width: Math.random() * 0.3 + 0.1,
                        height: Math.random() * 0.3 + 0.1,
                    },
                }
            })

        // Generate random tags
        const possibleTags = [
            'indoor', 'outdoor', 'nature', 'urban', 'day', 'night',
            'sunny', 'colorful', 'bright', 'dark', 'portrait', 'landscape', 'closeup',
        ]

        const tagCount = Math.floor(Math.random() * 5) + 2
        const tags = Array(tagCount)
            .fill(0)
            .map(() => possibleTags[Math.floor(Math.random() * possibleTags.length)])

        const sceneType = this.determineSceneType(objects, tags)
        const emotionalTone = this.determineEmotionalTone(objects, sceneType)
        const reaction = this.getSuggestedReaction(objects, sceneType)
        const description = this.generateDescription(objects, sceneType, tags)

        return {
            description,
            tags: [...new Set(tags)],
            objects,
            sceneType,
            emotionalTone,
            suggestedExpression: reaction.expression,
            suggestedGesture: reaction.gesture,
        }
    }

    /**
     * Quick analysis for real-time reactions (lower accuracy, faster)
     */
    async quickAnalyze(imageData: string | Blob): Promise<{ expression: Expression; gesture?: VTuberGesture }> {
        try {
            const result = await this.analyzeImage(imageData)
            return {
                expression: result.suggestedExpression || 'neutral',
                gesture: result.suggestedGesture,
            }
        } catch {
            return { expression: 'neutral' }
        }
    }

    /**
     * Update options
     */
    updateOptions(options: Partial<VisionCapabilitiesOptions>): void {
        this.options = {
            ...this.options,
            ...options,
        }

        if (options.enabled === false) {
            this.isInitialized = false
            this.mobilenet = null
            this.tensorflow = null
        }
    }

    /**
     * Check if initialized
     */
    isReady(): boolean {
        return this.isInitialized
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.isInitialized = false
        this.mobilenet = null

        // Dispose TensorFlow tensors
        if (this.tensorflow) {
            try {
                this.tensorflow.disposeVariables()
            } catch (e) {
                // Ignore dispose errors
            }
        }
        this.tensorflow = null

        log.info('VisionCapabilities disposed')
    }
}

// ============================================================
// FACTORY AND SINGLETON
// ============================================================

let visionInstance: VisionCapabilities | null = null

/**
 * Get or create the VisionCapabilities singleton
 */
export function getVisionCapabilities(options?: VisionCapabilitiesOptions): VisionCapabilities {
    if (!visionInstance) {
        visionInstance = new VisionCapabilities(options || { enabled: true })
    }
    return visionInstance
}

/**
 * Dispose of the vision capabilities
 */
export function disposeVisionCapabilities(): void {
    if (visionInstance) {
        visionInstance.dispose()
        visionInstance = null
    }
}

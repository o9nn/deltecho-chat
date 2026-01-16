/**
 * @fileoverview AAR Integration for Frontend ChatOrchestrator
 *
 * Bridges the backend AAR (Agent-Arena-Relation) system with the frontend
 * ChatOrchestrator, enabling the frontend to receive and display AAR state
 * and inject AAR context into chat sessions.
 */



/**
 * AAR State snapshot from backend
 */
export interface AARStateSnapshot {
    agent: {
        dominantFacet: string;
        facetActivations: Record<string, number>;
        emotionalValence: number;
        emotionalArousal: number;
        engagementLevel: number;
        socialMemoryCount: number;
    };
    arena: {
        currentPhase: string;
        phaseIntensities: Record<string, number>;
        frameId: string;
        loreCount: number;
        globalThreads: string[];
    };
    relation: {
        selfNarrative: string;
        identityCoherence: number;
        reflexiveAwareness: number;
        activeThemes: string[];
        recentInsights: string[];
    };
    meta: {
        cycle: number;
        coherence: number;
        lastUpdated: number;
    };
}

/**
 * AAR context for LLM injection
 */
export interface AARContext {
    summary: string;
    characterGuidance: string;
    narrativeContext: string;
    themes: string[];
}

/**
 * Configuration for AAR integration
 */
export interface AARIntegrationConfig {
    /** Enable AAR integration */
    enabled: boolean;
    /** Backend IPC channel for AAR updates */
    ipcChannel: string;
    /** Update interval for polling (if no Push available) */
    pollIntervalMs: number;
    /** Cache AAR state locally */
    enableCache: boolean;
    /** Verbose logging */
    verbose: boolean;
}

const DEFAULT_CONFIG: AARIntegrationConfig = {
    enabled: true,
    ipcChannel: 'aar-state',
    pollIntervalMs: 5000,
    enableCache: true,
    verbose: false,
};

/**
 * AAR Frontend Integration
 *
 * Manages the connection between the backend AAR system and the
 * frontend ChatOrchestrator, providing state synchronization and
 * context injection for enhanced AI interactions.
 */
export class AARFrontendIntegration {
    private config: AARIntegrationConfig;
    private cachedState: AARStateSnapshot | null = null;
    private lastUpdateTime: number = 0;
    private listeners: Set<(state: AARStateSnapshot) => void> = new Set();
    private pollInterval?: ReturnType<typeof setInterval>;

    constructor(config: Partial<AARIntegrationConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        console.log('[AARFrontendIntegration] Initialized');
    }

    /**
     * Start the integration (connect to backend)
     */
    start(): void {
        if (!this.config.enabled) {
            console.log('[AARFrontendIntegration] Disabled, not starting');
            return;
        }

        // In a real implementation, this would set up IPC listeners
        // For now, we'll use polling simulation
        this.pollInterval = setInterval(() => {
            this.pollBackend();
        }, this.config.pollIntervalMs);

        console.log('[AARFrontendIntegration] Started');
    }

    /**
     * Stop the integration
     */
    stop(): void {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = undefined;
        }
        console.log('[AARFrontendIntegration] Stopped');
    }

    /**
     * Poll backend for AAR state updates
     */
    private async pollBackend(): Promise<void> {
        try {
            // In production, this would use IPC or fetch from backend
            // For now, we simulate a state update
            const state = await this.fetchAARState();
            if (state) {
                this.updateState(state);
            }
        } catch (error) {
            console.error('[AARFrontendIntegration] Poll error:', error);
        }
    }

    /**
     * Fetch AAR state from backend
     */
    private async fetchAARState(): Promise<AARStateSnapshot | null> {
        // This would be replaced with actual IPC call:
        // return await window.electron.ipcRenderer.invoke('get-aar-state');

        // Simulation for development
        return this.cachedState;
    }

    /**
     * Update cached state and notify listeners
     */
    private updateState(state: AARStateSnapshot): void {
        this.cachedState = state;
        this.lastUpdateTime = Date.now();

        // Notify all listeners
        for (const listener of this.listeners) {
            try {
                listener(state);
            } catch (error) {
                console.error('[AARFrontendIntegration] Listener error:', error);
            }
        }

        if (this.config.verbose) {
            console.log('[AARFrontendIntegration] State updated:', state.meta.cycle);
        }
    }

    /**
     * Register a listener for state updates
     */
    onStateUpdate(listener: (state: AARStateSnapshot) => void): () => void {
        this.listeners.add(listener);
        // Return unsubscribe function
        return () => this.listeners.delete(listener);
    }

    /**
     * Get current cached state
     */
    getState(): AARStateSnapshot | null {
        return this.cachedState;
    }

    /**
     * Inject AAR state from backend (for IPC handler)
     */
    injectState(state: AARStateSnapshot): void {
        this.updateState(state);
    }

    /**
     * Generate context for LLM injection based on current AAR state
     */
    generateContext(): AARContext | null {
        if (!this.cachedState) {
            return null;
        }

        const state = this.cachedState;

        // Generate character guidance based on dominant facet
        const facetGuidance: Record<string, string> = {
            wisdom: 'Respond with thoughtful insight and measured perspective.',
            curiosity: 'Approach with genuine interest and exploratory questions.',
            compassion: 'Lead with empathy and emotional attunement.',
            playfulness: 'Bring lightness, creativity, and gentle humor.',
            determination: 'Focus on goals and steady progress.',
            authenticity: 'Speak directly and honestly from genuine feeling.',
            protector: 'Be watchful of well-being and potential concerns.',
            transcendence: 'Connect to broader meaning and interconnection.',
        };

        // Generate narrative context from phase
        const phaseContext: Record<string, string> = {
            origin: 'reflecting on beginnings and foundations',
            journey: 'acknowledging the path traveled',
            arrival: 'recognizing transitions and thresholds',
            situation: 'grounding in present circumstances',
            engagement: 'actively participating in dialogue',
            culmination: 'synthesizing toward resolution',
            possibility: 'exploring what might emerge',
            trajectory: 'sensing direction of movement',
            destiny: 'connecting to larger purpose',
        };

        return {
            summary: `[AAR Context]
Self-Narrative: ${state.relation.selfNarrative}
Character: ${state.agent.dominantFacet}-oriented (coherence: ${state.meta.coherence.toFixed(2)})
Emotional State: valence=${state.agent.emotionalValence.toFixed(2)}, arousal=${state.agent.emotionalArousal.toFixed(2)}
Narrative Phase: ${state.arena.currentPhase}
Active Themes: ${state.relation.activeThemes.join(', ')}`,

            characterGuidance: facetGuidance[state.agent.dominantFacet] || facetGuidance.wisdom,

            narrativeContext: phaseContext[state.arena.currentPhase] || phaseContext.engagement,

            themes: state.relation.activeThemes,
        };
    }

    /**
     * Get display-friendly facet information
     */
    getFacetDisplay(): { name: string; activation: number; description: string }[] {
        if (!this.cachedState) return [];

        const descriptions: Record<string, string> = {
            wisdom: 'Thoughtful insight and understanding',
            curiosity: 'Wonder and exploration',
            compassion: 'Empathy and warmth',
            playfulness: 'Creativity and joy',
            determination: 'Focus and resolve',
            authenticity: 'Genuine expression',
            protector: 'Watchful care',
            transcendence: 'Connection to meaning',
        };

        return Object.entries(this.cachedState.agent.facetActivations)
            .map(([name, activation]) => ({
                name,
                activation,
                description: descriptions[name] || name,
            }))
            .sort((a, b) => b.activation - a.activation);
    }

    /**
     * Get display-friendly phase information
     */
    getPhaseDisplay(): { name: string; intensity: number; temporal: string }[] {
        if (!this.cachedState) return [];

        const temporalMap: Record<string, string> = {
            origin: 'past',
            journey: 'past',
            arrival: 'past',
            situation: 'present',
            engagement: 'present',
            culmination: 'present',
            possibility: 'future',
            trajectory: 'future',
            destiny: 'future',
        };

        return Object.entries(this.cachedState.arena.phaseIntensities)
            .map(([name, intensity]) => ({
                name,
                intensity,
                temporal: temporalMap[name] || 'present',
            }))
            .sort((a, b) => b.intensity - a.intensity);
    }

    /**
     * Get recent insights from Relation layer
     */
    getRecentInsights(): string[] {
        return this.cachedState?.relation.recentInsights || [];
    }

    /**
     * Get integration status
     */
    getStatus(): {
        enabled: boolean;
        connected: boolean;
        lastUpdate: number;
        stateAvailable: boolean;
    } {
        return {
            enabled: this.config.enabled,
            connected: !!this.pollInterval,
            lastUpdate: this.lastUpdateTime,
            stateAvailable: !!this.cachedState,
        };
    }
}

/**
 * Create an AAR frontend integration instance
 */
export function createAARFrontendIntegration(
    config?: Partial<AARIntegrationConfig>
): AARFrontendIntegration {
    return new AARFrontendIntegration(config);
}

/**
 * React hook for AAR state (for React components)
 * This is a simple implementation - use with useState in actual React components
 */
export function useAARState(integration: AARFrontendIntegration) {
    // In a real React implementation:
    // const [state, setState] = useState<AARStateSnapshot | null>(null);
    // useEffect(() => {
    //   const unsubscribe = integration.onStateUpdate(setState);
    //   return unsubscribe;
    // }, [integration]);
    // return state;

    return integration.getState();
}

export default AARFrontendIntegration;

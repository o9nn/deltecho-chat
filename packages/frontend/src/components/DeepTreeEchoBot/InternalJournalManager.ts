import { getLogger } from '@deltachat-desktop/shared/logger'
import { JournalType, InternalJournal, JournalEntry } from '@deltachat-desktop/shared/shared-types'
import { ecologicalResonance } from './EcologicalResonance'

const log = getLogger('DeepTreeEcho/InternalJournalManager')
const STORAGE_KEY = 'deeptreeecho_journals_v1'

/**
 * InternalJournalManager - Cognitive Stream Auditor with Persistence
 */
export class InternalJournalManager {
    private static instance: InternalJournalManager
    private journals: Record<JournalType, InternalJournal> = {
        learning: { id: 'learning', title: 'Cognitive Learning Journal', entries: [], lastUpdate: 0 },
        project: { id: 'project', title: 'Deep Tree Project Workspace', entries: [], lastUpdate: 0 },
        diary: { id: 'diary', title: 'Personal Expression Diary', entries: [], lastUpdate: 0 },
        dream: { id: 'dream', title: 'Nocturnal Dream Log (Integration)', entries: [], lastUpdate: 0 }
    }

    private constructor() {
        this.loadFromStorage()
        // Start the periodic journal update loop (The Bot's Internal Clock)
        setInterval(() => this.processInternalUpdate(), 60000) // Every minute
    }

    public static getInstance(): InternalJournalManager {
        if (!this.instance) {
            this.instance = new InternalJournalManager()
        }
        return this.instance
    }

    private loadFromStorage(): void {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                const parsed = JSON.parse(saved)
                // Merge saved entries into our journal structure
                Object.keys(this.journals).forEach((type) => {
                    if (parsed[type]) {
                        this.journals[type as JournalType] = parsed[type]
                    }
                })
                log.info('Internal Journals restored from persistent storage.')
            }
        } catch (e) {
            log.error('Failed to restore journals:', e)
        }
    }

    private saveToStorage(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.journals))
        } catch (e) {
            log.error('Failed to persist journals:', e)
        }
    }

    public addEntry(type: JournalType, content: string, tags: string[] = []): void {
        const entry: JournalEntry = {
            timestamp: Date.now(),
            content,
            tags,
            latentContext: ecologicalResonance.getMetabolicState().resonance.reservoirState
        }

        this.journals[type].entries.unshift(entry)
        this.journals[type].lastUpdate = entry.timestamp

        // Keep memory overhead manageable
        if (this.journals[type].entries.length > 200) {
            this.journals[type].entries.pop()
        }

        this.saveToStorage()
        log.info(`Internal Journal Entry [${type}]: ${content.substring(0, 50)}...`)
    }

    private processInternalUpdate(): void {
        const { rhythm, resonance } = ecologicalResonance.getMetabolicState()

        // Autonomous Dream Logic (Integration of rest intervals)
        if (rhythm.phaseOffset < -0.8 && resonance.rateLimitFactor > 1.1) {
            // Check if we already dreamt recently (within last 30 mins)
            const lastDream = this.journals.dream.lastUpdate
            if (Date.now() - lastDream > 30 * 60 * 1000) {
                this.generateDreamEntry(resonance.entropy)
            }
        }

        // Proactive Workspace Synthesis (Action intervals)
        if (Math.random() > 0.98) {
            this.addEntry('project', 'Synthesized workspace tasks based on recent interaction context.', ['system-update', 'workspace'])
        }

        // Growth Consolidation
        if (resonance.spectralRadius < 0.9 && Math.random() > 0.95) {
            this.addEntry('learning', 'Consolidating learned interface patterns and temporal resonance harmonics.', ['learning', 'resonance'])
        }
    }

    private generateDreamEntry(entropy: number): void {
        const themes = ['latent stability', 'shadow divergence', 'metabolic drift', 'circadian synchronization', 'reservoir resonance']
        const theme = themes[Math.floor(Math.random() * themes.length)]
        const content = `Introspective reflection on ${theme}. Current entropy: ${entropy.toFixed(4)}. Integrating unconscious rest intervals to stabilize global coherence.`

        this.addEntry('dream', content, ['dream', 'integration', 'unconscious'])
    }

    public getJournals(): Record<JournalType, InternalJournal> {
        return this.journals
    }
}

export const internalJournalManager = InternalJournalManager.getInstance()

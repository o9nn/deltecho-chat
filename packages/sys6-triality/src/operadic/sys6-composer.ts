import { LCMSynchronizer } from './lcm-synchronizer.js';
import { StageScheduler } from './stage-scheduler.js';
import { OperadicState, OrchestrationEvent } from '../types/index.js';

export class Sys6Composer {
    private synchronizer: LCMSynchronizer;
    private scheduler: StageScheduler;
    private isRunning: boolean = false;

    constructor() {
        this.synchronizer = new LCMSynchronizer();
        this.scheduler = new StageScheduler();
    }

    /**
     * Advances the Sys6 Composition Cycle by one tick.
     * Generates the new state and scheduled events.
     */
    public nextTick(): { state: OperadicState; events: OrchestrationEvent[] } {
        const state = this.synchronizer.tick();
        const events = this.scheduler.getEventsForState(state);

        return {
            state,
            events
        };
    }

    public getCurrentState(): OperadicState {
        // We need to expose state without ticking.
        // LCMSynchronizer needs a getter for state without side effects, 
        // but current implementation of tick() does both.
        // We can replicate state generation logic or expose it from synchronizer.
        // For now, let's rely on the consumer tracking the returned state from nextTick
        // Or adding a currentState accessor to Synchronizer.

        // Helper to reconstruct current state
        const step = this.synchronizer.getCurrentStep();
        const cycleStep = this.synchronizer.getCycleStep();
        // This is slightly disconnected from the exact delegation logic unless we expose it publicly from Synchronizer
        // For brevity, we assume nextTick is the primary driver.

        // Re-using synchronizer's internal state via a hacked reconstruction for now
        // Ideally LCMSynchronizer should have a getState() method.

        // Let's just return a minimal state or throw if not tracked.
        // It's better to update LCMSynchronizer to expose `getState()`.

        throw new Error("Use nextTick() to drive the composer.");
    }

    public reset(): void {
        this.synchronizer.reset();
        this.isRunning = false;
    }
}

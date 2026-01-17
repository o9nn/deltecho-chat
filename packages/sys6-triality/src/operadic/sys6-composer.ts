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
        return this.synchronizer.getState();
    }

    public reset(): void {
        this.synchronizer.reset();
        this.isRunning = false;
    }
}

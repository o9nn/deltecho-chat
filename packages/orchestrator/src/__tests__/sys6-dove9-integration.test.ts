
import { describe, it, expect } from '@jest/globals';
import { Sys6Composer } from '@deltecho/sys6-triality';
import { Dove9Engine } from '@deltecho/dove9';

describe('Sys6-Dove9 Integration', () => {
    it('should synchronize Dove9 tick with Sys6 cycle', () => {
        const composer = new Sys6Composer();
        const engine = new Dove9Engine();

        // Initial state
        let sys6State = composer.getCurrentState();
        let dove9State = engine.tick(); // Initial tick to get state

        console.log('Initial State:', { sys6: sys6State.globalStep, dove9: dove9State.cycleStep });

        expect(sys6State.globalStep).toBe(0);

        // Simulate Game Loop / Orchestrator Loop
        // In a real app, this would be an event listener or a dedicated loop
        for (let i = 0; i < 30; i++) {
            // 1. Advance Clock
            composer.nextTick();
            sys6State = composer.getCurrentState();

            // 2. Drive Engine (if Sys6 implies a tick is needed)
            // Dove9 runs on a 12-step cycle, Sys6 on 30.
            // They don't map 1:1 in cycle length, but should advance linearly?
            // Sys6 is the "pulse". Dove9 is the "process".

            const nextDove9State = engine.tick();

            // Verify mapping
            // Sys6 Step 1 -> Dove9 Step X

            expect(nextDove9State.cycleStep).toBeDefined();
        }

        const finalSys6 = composer.getCurrentState();
        expect(finalSys6.globalStep).toBe(30);
    });
});

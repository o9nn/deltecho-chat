/**
 * Cycle Timing and Operadic Composition Tests
 */

import { LCMSynchronizer } from '../src/operadic/lcm-synchronizer.js';
import { PrimeDelegation } from '../src/operadic/prime-delegation.js';
import { PrimeModality } from '../src/types/index.js';

describe('Sys6 Cycle Timing & Operadic Composition', () => {
    describe('LCMSynchronizer LCM Logic', () => {
        it('should synchronize all prime modalities at step 0', () => {
            const sync = new LCMSynchronizer(0);
            const state = sync.tick();

            expect(state.primePhase[PrimeModality.Dyadic]).toBe(0);
            expect(state.primePhase[PrimeModality.Triadic]).toBe(0);
            expect(state.primePhase[PrimeModality.Pentadic]).toBe(0);
        });

        it('should reach global LCM synchronization at step 30', () => {
            const sync = new LCMSynchronizer(0);
            // Run 30 ticks
            for (let i = 0; i < 29; i++) {
                sync.tick();
            }
            const state = sync.tick(); // This is the 30th tick, step 29

            // At step 29:
            // 29 % 2 = 1
            // 29 % 3 = 2
            // 29 % 5 = 4
            expect(state.primePhase[PrimeModality.Dyadic]).toBe(1);
            expect(state.primePhase[PrimeModality.Triadic]).toBe(2);
            expect(state.primePhase[PrimeModality.Pentadic]).toBe(4);

            const nextState = sync.tick(); // This is the 31st tick, step 30
            // Step 30 wraps to cycle step 0
            expect(nextState.cycleStep).toBe(0);
            expect(nextState.primePhase[PrimeModality.Dyadic]).toBe(0);
            expect(nextState.primePhase[PrimeModality.Triadic]).toBe(0);
            expect(nextState.primePhase[PrimeModality.Pentadic]).toBe(0);
        });
    });

    describe('PrimeDelegation Composition', () => {
        let delegator: PrimeDelegation;

        beforeEach(() => {
            delegator = new PrimeDelegation();
        });

        it('should calculate 8-way cubic delegation (2^3)', () => {
            // Δ₂ logic: (step % 8)
            expect(delegator.computeDelegation(0).dyadic).toBe(0);
            expect(delegator.computeDelegation(7).dyadic).toBe(7);
            expect(delegator.computeDelegation(8).dyadic).toBe(0);
        });

        it('should calculate 9-phase triadic delegation (3^2)', () => {
            // Δ₃ logic: (step % 9)
            expect(delegator.computeDelegation(0).triadic).toBe(0);
            expect(delegator.computeDelegation(8).triadic).toBe(8);
            expect(delegator.computeDelegation(9).triadic).toBe(0);
        });

        it('should show varying composition patterns across the 30-step cycle', () => {
            const patterns = new Set();
            for (let i = 0; i < 30; i++) {
                const { dyadic, triadic } = delegator.computeDelegation(i);
                patterns.add(`${dyadic}-${triadic}`);
            }
            // LCM(8, 9) is 72, so over 30 steps we should have 30 unique patterns
            expect(patterns.size).toBe(30);
        });
    });
});

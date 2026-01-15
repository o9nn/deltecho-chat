import { DelegationState } from '../types/index.js';

export class PrimeDelegation {
    private readonly DYADIC_MODULUS = 8; // 2^3
    private readonly TRIADIC_MODULUS = 9; // 3^2

    public computeDelegation(globalStep: number): DelegationState {
        return {
            dyadic: globalStep % this.DYADIC_MODULUS,
            triadic: globalStep % this.TRIADIC_MODULUS
        };
    }

    /**
     * Determines if a specific dyadic micro-phase is active
     * @param globalStep Current global time step
     * @param phaseIndex 0-7
     */
    public isDyadicPhase(globalStep: number, phaseIndex: number): boolean {
        return (globalStep % this.DYADIC_MODULUS) === phaseIndex;
    }

    /**
     * Determines if a specific triadic micro-phase is active
     * @param globalStep Current global time step
     * @param phaseIndex 0-8
     */
    public isTriadicPhase(globalStep: number, phaseIndex: number): boolean {
        return (globalStep % this.TRIADIC_MODULUS) === phaseIndex;
    }
}

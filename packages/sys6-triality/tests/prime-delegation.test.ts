import { PrimeDelegation } from '../src/operadic/prime-delegation.js';

describe('PrimeDelegation', () => {
    let delegation: PrimeDelegation;

    beforeEach(() => {
        delegation = new PrimeDelegation();
    });

    it('should correctly compute dyadic phase', () => {
        expect(delegation.computeDelegation(0).dyadic).toBe(0);
        expect(delegation.computeDelegation(1).dyadic).toBe(1);
        expect(delegation.computeDelegation(7).dyadic).toBe(7);
        expect(delegation.computeDelegation(8).dyadic).toBe(0);
    });

    it('should correctly compute triadic phase', () => {
        expect(delegation.computeDelegation(0).triadic).toBe(0);
        expect(delegation.computeDelegation(8).triadic).toBe(8);
        expect(delegation.computeDelegation(9).triadic).toBe(0);
    });

    it('should verify phase checkers', () => {
        expect(delegation.isDyadicPhase(0, 0)).toBe(true);
        expect(delegation.isDyadicPhase(1, 0)).toBe(false);
        expect(delegation.isTriadicPhase(9, 0)).toBe(true);
    });
});

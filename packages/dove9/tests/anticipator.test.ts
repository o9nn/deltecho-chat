import { Anticipator } from '../src/engine/anticipator.js';

describe('Anticipator', () => {
    let anticipator: Anticipator;

    beforeEach(() => {
        anticipator = new Anticipator();
    });

    it('should learn patterns over time', () => {
        // Feed a constant pattern: Step 0 always 10, Step 1 always 20
        for (let cycle = 0; cycle < 15; cycle++) {
            anticipator.update(0, 10);
            anticipator.update(1, 20);
        }

        expect(anticipator.predict(0)).toBeCloseTo(10);
        expect(anticipator.predict(1)).toBeCloseTo(20);
    });

    it('should adapt to changing patterns', () => {
        // Initial 10
        for (let i = 0; i < 15; i++) anticipator.update(0, 10);
        expect(anticipator.predict(0)).toBe(10);

        // Change to 20
        for (let i = 0; i < 15; i++) anticipator.update(0, 20);

        // Should shift towards 20 (average of last 10 samples)
        expect(anticipator.predict(0)).toBe(20);
    });
});

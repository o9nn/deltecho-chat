import { SalienceTracker } from '../src/engine/salience-tracker.js';
import { FeedbackLoop } from '../src/engine/feedback-loop.js';

describe('SalienceTracker', () => {
    let tracker: SalienceTracker;

    beforeEach(() => {
        tracker = new SalienceTracker();
    });

    it('should track global salience', () => {
        tracker.update([
            { id: 'primary', load: 0.8 },
            { id: 'secondary', load: 0.2 }
        ]);

        // Initial update might smooth, but should be non-zero
        expect(tracker.getGlobalSalience()).toBeGreaterThan(0);
        expect(tracker.getStreamSalience('primary')).toBeGreaterThan(0);
    });

    it('should decay over time if no input', () => {
        // Warm up
        for (let i = 0; i < 10; i++) {
            tracker.update([{ id: 'p', load: 1.0 }]);
        }
        const s1 = tracker.getGlobalSalience();

        // Drop input
        for (let i = 0; i < 10; i++) {
            tracker.update([{ id: 'p', load: 0.0 }]);
        }
        const s2 = tracker.getGlobalSalience();

        expect(s2).toBeLessThan(s1);
    });
});

describe('FeedbackLoop', () => {
    it('should correct error', () => {
        const pid = new FeedbackLoop(1.0, 0.5); // Setpoint 1.0

        // Current value 0.5, error 0.5
        const output = pid.update(0.5);

        // Output should be positive to increase variable
        expect(output).toBeGreaterThan(0);
    });

    it('should react to negative error', () => {
        const pid = new FeedbackLoop(0.0);
        const output = pid.update(0.5); // Too high
        expect(output).toBeLessThan(0); // Should try to decrease
    });
});

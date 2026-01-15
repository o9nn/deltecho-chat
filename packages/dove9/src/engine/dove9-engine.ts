import { Dove9State, STREAM_PHASES } from '../types/index.js';
import { TriadicStream } from './triadic-stream.js';
import { SalienceTracker } from './salience-tracker.js';
import { FeedbackLoop } from './feedback-loop.js';
import { Anticipator } from './anticipator.js';

export class Dove9Engine {
    private streams: TriadicStream[] = [];
    private currentStep: number = 0; // 0-11
    private readonly CYCLE_STEPS = 12;

    private salienceTracker: SalienceTracker;
    private homeostat: FeedbackLoop;
    private anticipator: Anticipator;

    constructor() {
        this.salienceTracker = new SalienceTracker();
        // Homeostat tries to maintain global salience at a balanced 0.5 (arbitrary ideal)
        this.homeostat = new FeedbackLoop(0.5, 0.2, 0.01, 0.0);
        this.anticipator = new Anticipator();
        this.initializeStreams();
    }

    private initializeStreams() {
        this.streams = [];
        this.streams.push(new TriadicStream({ id: 'primary', phaseOffset: STREAM_PHASES.SENSE }));   // 0
        this.streams.push(new TriadicStream({ id: 'secondary', phaseOffset: STREAM_PHASES.PROCESS })); // 120
        this.streams.push(new TriadicStream({ id: 'tertiary', phaseOffset: STREAM_PHASES.ACT }));     // 240
    }

    public tick(): Dove9State {
        // Map 12 steps to 360 degrees -> 30 degrees per step
        const globalDegrees = (this.currentStep * 30) % 360;

        // Update streams
        this.streams.forEach(stream => stream.update(globalDegrees));

        // Update salience
        this.salienceTracker.update(this.streams.map(s => ({ id: s.getState().id, load: s.getState().load })));
        const globalSalience = this.salienceTracker.getGlobalSalience();

        // Feedforward: update history for current step
        this.anticipator.update(this.currentStep, globalSalience);

        // Apply homeostasis
        const regulation = this.homeostat.update(globalSalience);
        // Apply regulation back to streams (simplistic: adjust load capacity or active state)
        // For now, we simply expose it in the state or logs implies regulation happening

        const state: Dove9State = {
            cycleStep: this.currentStep,
            streams: this.streams.map(s => s.getState()),
            globalSalience
        };

        this.currentStep = (this.currentStep + 1) % this.CYCLE_STEPS;

        return state;
    }

    public reset(): void {
        this.currentStep = 0;
        this.initializeStreams(); // Re-init to reset phases
    }
}

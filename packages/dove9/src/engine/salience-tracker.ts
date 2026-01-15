import { Dove9State } from '../types/index.js';

export class SalienceTracker {
    private globalSalience: number = 0;
    private streamSalience: Map<string, number> = new Map();
    private decayRate: number = 0.1;

    constructor() {
        this.reset();
    }

    public update(streams: { id: string, load: number }[]): void {
        let maxLoad = 0;

        streams.forEach(stream => {
            const current = this.streamSalience.get(stream.id) || 0;
            const target = stream.load;

            // Move towards target load
            const delta = target - current;
            const newValue = current + (delta * 0.2); // Smooth update

            this.streamSalience.set(stream.id, newValue);
            maxLoad = Math.max(maxLoad, newValue);
        });

        // Global salience tracks the highest load stream
        this.globalSalience = this.globalSalience * (1 - this.decayRate) + maxLoad * this.decayRate;
    }

    public getGlobalSalience(): number {
        return this.globalSalience;
    }

    public getStreamSalience(id: string): number {
        return this.streamSalience.get(id) || 0;
    }

    public reset(): void {
        this.globalSalience = 0;
        this.streamSalience.clear();
    }
}

import { StreamPhase, TriadicStreamConfig, StreamState } from '../types/index.js';

export class TriadicStream {
    private config: TriadicStreamConfig;
    private state: StreamState;

    constructor(config: TriadicStreamConfig) {
        this.config = config;
        this.state = {
            id: config.id,
            currentPhase: 'sense',
            phaseProgress: 0,
            active: true,
            load: 0
        };
    }

    public update(globalDegrees: number): void {
        const localDegrees = (globalDegrees + this.config.phaseOffset) % 360;

        // Map degrees to phase
        if (localDegrees < 120) {
            this.state.currentPhase = 'sense';
            this.state.phaseProgress = localDegrees / 120;
        } else if (localDegrees < 240) {
            this.state.currentPhase = 'process';
            this.state.phaseProgress = (localDegrees - 120) / 120;
        } else {
            this.state.currentPhase = 'act';
            this.state.phaseProgress = (localDegrees - 240) / 120;
        }
    }

    public getState(): StreamState {
        return { ...this.state };
    }
}

export type Sys6CyclePhase = number; // 0-29

export enum PrimeModality {
    Dyadic = 2,
    Triadic = 3,
    Pentadic = 5
}

export interface PrimePhaseState {
    [PrimeModality.Dyadic]: number; // 0-1
    [PrimeModality.Triadic]: number; // 0-2
    [PrimeModality.Pentadic]: number; // 0-4
}

export interface DelegationState {
    dyadic: number; // 0-7 (8-way)
    triadic: number; // 0-8 (9-phase)
}

export interface OperadicState {
    globalStep: number;  // Monotonic increasing tick
    cycleStep: Sys6CyclePhase; // 0-29
    primePhase: PrimePhaseState;
    delegation: DelegationState;
}

export type StreamType = 'sense' | 'process' | 'act';

export interface OrchestrationEvent {
    id: string;
    type: string;
    targetStream: StreamType;
    payload: any;
    priority: number;
    timestamp: number;
}

export type StreamPhase = "sense" | "process" | "act";

export interface TriadicStreamConfig {
  id: string;
  phaseOffset: number; // 0, 120, 240
}

export interface StreamState {
  id: string;
  currentPhase: StreamPhase;
  phaseProgress: number; // 0-1 within phase
  active: boolean;
  load: number;
}

export interface Dove9State {
  cycleStep: number; // 0-11 (12 steps)
  streams: StreamState[];
  globalSalience: number;
}

export const STREAM_PHASES = {
  SENSE: 0,
  PROCESS: 120,
  ACT: 240,
};

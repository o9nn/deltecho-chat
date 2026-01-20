import {
  Sys6CyclePhase,
  PrimeModality,
  OperadicState,
} from "../types/index.js";
import { PrimeDelegation } from "./prime-delegation.js";

export class LCMSynchronizer {
  private currentStep: number = 0;
  private readonly CYCLE_LENGTH = 30;
  private delegator: PrimeDelegation;

  constructor(initialStep: number = 0) {
    this.currentStep = initialStep;
    this.delegator = new PrimeDelegation();
  }

  /**
   * Advances the clock by one step and returns the new state
   */
  public tick(): OperadicState {
    const cycleStep = (this.currentStep % this.CYCLE_LENGTH) as Sys6CyclePhase;
    const delegation = this.delegator.computeDelegation(this.currentStep);

    const state: OperadicState = {
      globalStep: this.currentStep,
      cycleStep,
      primePhase: {
        [PrimeModality.Dyadic]: cycleStep % 2,
        [PrimeModality.Triadic]: cycleStep % 3,
        [PrimeModality.Pentadic]: cycleStep % 5,
      },
      delegation,
    };

    this.currentStep++;
    return state;
  }

  public getCurrentStep(): number {
    return this.currentStep;
  }

  public getCycleStep(): Sys6CyclePhase {
    return (this.currentStep % this.CYCLE_LENGTH) as Sys6CyclePhase;
  }

  public reset(): void {
    this.currentStep = 0;
  }

  public getState(): OperadicState {
    const cycleStep = (this.currentStep % this.CYCLE_LENGTH) as Sys6CyclePhase;
    const delegation = this.delegator.computeDelegation(this.currentStep);

    return {
      globalStep: this.currentStep,
      cycleStep,
      primePhase: {
        [PrimeModality.Dyadic]: cycleStep % 2,
        [PrimeModality.Triadic]: cycleStep % 3,
        [PrimeModality.Pentadic]: cycleStep % 5,
      },
      delegation,
    };
  }
}

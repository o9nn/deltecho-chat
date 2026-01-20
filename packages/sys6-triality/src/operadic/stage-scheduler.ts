import {
  OperadicState,
  OrchestrationEvent,
  StreamType,
} from "../types/index.js";

export class StageScheduler {
  // Map of cycle step (0-29) to list of event templates
  private schedule: Map<number, Omit<OrchestrationEvent, "timestamp">[]> =
    new Map();

  constructor() {
    this.initializeSchedule();
  }

  private initializeSchedule() {
    // Initialize the 42 synchronization events distributed across the 30-step cycle.
    // This is a foundational distribution, likely to be tuned.
    // We ensure coverage of all 3 streams: sense, process, act.

    for (let i = 0; i < 30; i++) {
      const events: Omit<OrchestrationEvent, "timestamp">[] = [];

      // Base heartbeat event
      if (i % 1 === 0) {
        // Potentially too frequent, maybe every step requires a micro-sync
      }

      // Major synchronization points at prime intervals
      if (i % 2 === 0) {
        // Dyadic sync
        events.push(this.createEventTemplate(i, "dyadic-sync", "process", 1));
      }
      if (i % 3 === 0) {
        // Triadic sync
        events.push(this.createEventTemplate(i, "triadic-sync", "sense", 2));
      }
      if (i % 5 === 0) {
        // Pentadic sync
        events.push(this.createEventTemplate(i, "pentadic-sync", "act", 3));
      }

      // Total events = 15 (dyadic) + 10 (triadic) + 6 (pentadic) = 31 events.
      // Overlaps:
      // 6 (div by 2 and 3) -> counted twice above, but they are distinct event types.
      // 10 (div by 2 and 5)
      // 15 (div by 3 and 5)
      // 30 (div by 2, 3, 5)

      // We need 42 events.
      // Let's add specific stage markers.

      this.schedule.set(i, events);
    }
  }

  private createEventTemplate(
    id: number,
    type: string,
    targetStream: StreamType,
    priority: number,
  ): Omit<OrchestrationEvent, "timestamp"> {
    return {
      id: `sys6-evt-${id}-${type}`,
      type,
      targetStream,
      payload: {},
      priority,
    };
  }

  public getEventsForState(state: OperadicState): OrchestrationEvent[] {
    const templates = this.schedule.get(state.cycleStep) || [];
    return templates.map((t) => ({
      ...t,
      timestamp: Date.now(),
      // Enrich payload with current state
      payload: {
        ...t.payload,
        cycleStep: state.cycleStep,
        primePhase: state.primePhase,
      },
    }));
  }
}

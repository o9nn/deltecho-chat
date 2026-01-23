export class Anticipator {
  private stepHistory: Map<number, number[]> = new Map(); // step -> list of load values
  private predictions: Map<number, number> = new Map();

  public update(step: number, value: number): void {
    if (!this.stepHistory.has(step)) {
      this.stepHistory.set(step, []);
    }
    const history = this.stepHistory.get(step)!;
    history.push(value);
    if (history.length > 10) history.shift(); // Keep last 10 samples

    // Simple average for prediction
    const avg = history.reduce((a, b) => a + b, 0) / history.length;
    this.predictions.set(step, avg);
  }

  /**
   * Predict the value for a future step based on history
   */
  public predict(step: number): number {
    return this.predictions.get(step) || 0;
  }
}

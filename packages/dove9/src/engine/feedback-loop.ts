export class FeedbackLoop {
  private setpoint: number;
  private kp: number; // Proportional gain
  private ki: number; // Integral gain
  private kd: number; // Derivative gain

  private integral: number = 0;
  private lastError: number = 0;

  constructor(
    setpoint: number,
    kp: number = 1.0,
    ki: number = 0.0,
    kd: number = 0.0,
  ) {
    this.setpoint = setpoint;
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
  }

  public update(processVariable: number, dt: number = 1.0): number {
    const error = this.setpoint - processVariable;

    this.integral += error * dt;
    const derivative = (error - this.lastError) / dt;

    const output =
      this.kp * error + this.ki * this.integral + this.kd * derivative;

    this.lastError = error;

    return output;
  }

  public setSetpoint(value: number): void {
    this.setpoint = value;
  }

  public reset(): void {
    this.integral = 0;
    this.lastError = 0;
  }
}

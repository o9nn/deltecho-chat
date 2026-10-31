/**
 * A small, bounded summary of observed Cubism parameter residuals.
 *
 * This class records measurements only. Its statistics describe the supplied
 * observations; they do not establish causation, probability, calibration
 * validity, or scientific correctness.
 */

/** One requested-versus-observed Cubism parameter measurement. */
export interface EmbodimentEvidenceRow {
  parameterId: string;
  requested: number;
  observed: number;
  range: {
    min: number;
    max: number;
  } | null;
}

/** A per-parameter summary across the current coherent observation window. */
export interface EmbodimentEvidenceParameterSnapshot {
  parameterId: string;
  count: number;
  meanSignedError: number;
  /** Population standard deviation of normalized signed error. */
  variability: number;
  rmsError: number;
}

/** A detached view of the current evidence window. */
export interface EmbodimentEvidenceSnapshot {
  status: "waiting" | "observed";
  sampleCount: number;
  capacity: 32;
  parameters: EmbodimentEvidenceParameterSnapshot[];
}

interface EvidenceSchemaParameter {
  parameterId: string;
  min: number;
  max: number;
}

interface ValidEvidenceRow extends EvidenceSchemaParameter {
  normalizedError: number;
}

const CAPACITY = 32 as const;
const MAX_PARAMETER_ROWS = 512;
const MAX_ABSOLUTE_VALUE = 1_000;
const MINIMUM_SPAN = 1e-6;
const SAFE_PARAMETER_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/;

/**
 * Keeps at most 32 normalized residual vectors for one coherent Cubism schema.
 * A schema is the sorted parameter ID list together with each parameter's exact
 * observed min/max range. Changing either resets prior, incomparable samples.
 */
export class EmbodimentEvidenceWindow {
  private schema: EvidenceSchemaParameter[] | null = null;
  private samples: number[][] = [];

  /**
   * Record one caller sample. Invalid rows, including missing ranges, are
   * excluded. A sample with no usable rows clears the window and returns false.
   * A duplicate valid parameter ID makes the whole sample unusable so a single
   * parameter cannot receive extra weight.
   */
  record(rows: Array<EmbodimentEvidenceRow>): boolean {
    if (!Array.isArray(rows) || rows.length > MAX_PARAMETER_ROWS) {
      this.reset();
      return false;
    }

    const validRows: ValidEvidenceRow[] = [];
    for (const row of rows) {
      const validRow = this.toValidRow(row);
      if (validRow) {
        validRows.push(validRow);
      }
    }

    if (validRows.length === 0) {
      this.reset();
      return false;
    }

    validRows.sort((left, right) => {
      if (left.parameterId < right.parameterId) return -1;
      if (left.parameterId > right.parameterId) return 1;
      return 0;
    });

    for (let index = 1; index < validRows.length; index += 1) {
      if (validRows[index - 1].parameterId === validRows[index].parameterId) {
        this.reset();
        return false;
      }
    }

    const nextSchema = validRows.map(({ parameterId, min, max }) => ({
      parameterId,
      min,
      max,
    }));

    if (!this.schemaMatches(nextSchema)) {
      // The current sample begins a new window after a rig-unit/schema change.
      this.reset();
      this.schema = nextSchema;
    }

    const sample = validRows.map((row) => row.normalizedError);
    if (this.samples.length === CAPACITY) {
      this.samples.shift();
    }
    this.samples.push(sample);
    return true;
  }

  /** Return a detached, deterministic statistical summary of the window. */
  snapshot(): EmbodimentEvidenceSnapshot {
    if (!this.schema || this.samples.length === 0) {
      return {
        status: "waiting",
        sampleCount: 0,
        capacity: CAPACITY,
        parameters: [],
      };
    }

    const parameters = this.schema.map((parameter, parameterIndex) => {
      let count = 0;
      let meanSignedError = 0;
      let squaredDeviationSum = 0;
      let sumSquares = 0;

      // Welford's algorithm avoids avoidable cancellation in population SD.
      for (const sample of this.samples) {
        const value = sample[parameterIndex];
        count += 1;
        const delta = value - meanSignedError;
        meanSignedError += delta / count;
        squaredDeviationSum += delta * (value - meanSignedError);
        sumSquares += value * value;
      }

      return {
        parameterId: parameter.parameterId,
        count,
        meanSignedError,
        variability: Math.sqrt(Math.max(0, squaredDeviationSum / count)),
        rmsError: Math.sqrt(sumSquares / count),
      };
    });

    return {
      status: "observed",
      sampleCount: this.samples.length,
      capacity: CAPACITY,
      parameters,
    };
  }

  /** Clear the active schema and all retained observations. */
  reset(): void {
    this.schema = null;
    this.samples = [];
  }

  private toValidRow(row: EmbodimentEvidenceRow): ValidEvidenceRow | null {
    if (!row || typeof row !== "object") {
      return null;
    }

    const { parameterId, requested, observed, range } = row;
    if (!this.isSafeParameterId(parameterId)) {
      return null;
    }
    if (!this.isBoundedFinite(requested) || !this.isBoundedFinite(observed)) {
      return null;
    }
    if (!range || typeof range !== "object") {
      return null;
    }

    const { min, max } = range;
    if (!this.isBoundedFinite(min) || !this.isBoundedFinite(max)) {
      return null;
    }

    const span = max - min;
    if (!(max > min) || span < MINIMUM_SPAN) {
      return null;
    }

    const normalizedError = (observed - requested) / span;
    if (!Number.isFinite(normalizedError)) {
      return null;
    }

    return { parameterId, min, max, normalizedError };
  }

  private isSafeParameterId(parameterId: unknown): parameterId is string {
    return (
      typeof parameterId === "string" &&
      parameterId.length > 0 &&
      parameterId.length <= 128 &&
      SAFE_PARAMETER_ID.test(parameterId)
    );
  }

  private isBoundedFinite(value: unknown): value is number {
    return (
      typeof value === "number" &&
      Number.isFinite(value) &&
      Math.abs(value) <= MAX_ABSOLUTE_VALUE
    );
  }

  private schemaMatches(nextSchema: EvidenceSchemaParameter[]): boolean {
    if (!this.schema || this.schema.length !== nextSchema.length) {
      return false;
    }

    return this.schema.every(
      (parameter, index) =>
        parameter.parameterId === nextSchema[index].parameterId &&
        parameter.min === nextSchema[index].min &&
        parameter.max === nextSchema[index].max,
    );
  }
}

/**
 * Probabilistic Truth Value (TV)
 * Represents the degree of truth of an Atom.
 */
export interface TruthValue {
  mean: number; // Probability (0 to 1)
  confidence: number; // Confidence in the mean (0 to 1)
}

export function createTruthValue(
  mean: number = 1.0,
  confidence: number = 1.0,
): TruthValue {
  return {
    mean: Math.max(0, Math.min(1, mean)),
    confidence: Math.max(0, Math.min(1, confidence)),
  };
}

export function indeterminateTruthValue(): TruthValue {
  return { mean: 0.5, confidence: 0.0 };
}

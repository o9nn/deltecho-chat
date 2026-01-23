import { AtomSpace } from "../atomspace/index.js";
import { Link, AtomType } from "../atomspace/atom.js";
import { TruthValue, createTruthValue } from "../atomspace/truth-value.js";

export class PLNEngine {
  private atomSpace: AtomSpace;

  constructor(atomSpace: AtomSpace) {
    this.atomSpace = atomSpace;
  }

  /**
   * Perform one step of forward chaining deduction
   * Finds patterns: InheritanceLink(A, B) and InheritanceLink(B, C)
   * and creates InheritanceLink(A, C)
   */
  public deduce(): number {
    const inheritanceLinks = this.atomSpace.getByType(
      AtomType.InheritanceLink,
    ) as Link[];
    let newAtoms = 0;

    for (const ab of inheritanceLinks) {
      const A = ab.outgoing[0];
      const B = ab.outgoing[1];

      // Find links where B is the first element (B -> C)
      const bcLinks = inheritanceLinks.filter((l) => l.outgoing[0].id === B.id);

      for (const bc of bcLinks) {
        const C = bc.outgoing[1];
        if (A.id === C.id) continue;

        // Simple Deduction Rule
        const newTV = this.deductionFormula(ab.truthValue, bc.truthValue);

        // Check if already exists
        const existing = this.atomSpace.getAtom(
          `${AtomType.InheritanceLink}(${A.id},${C.id})`,
        );
        if (!existing) {
          this.atomSpace.link(AtomType.InheritanceLink, [A, C], newTV);
          newAtoms++;
        }
      }
    }

    return newAtoms;
  }

  private deductionFormula(tv1: TruthValue, tv2: TruthValue): TruthValue {
    // Simplified formula for demonstration
    return createTruthValue(
      tv1.mean * tv2.mean,
      tv1.confidence * tv2.confidence * 0.9, // Penalty for inference step
    );
  }
}

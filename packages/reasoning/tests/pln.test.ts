import {
  AtomSpace,
  AtomType,
  PLNEngine,
  createTruthValue,
} from "../src/index.js";

describe("PLNEngine", () => {
  let as: AtomSpace;
  let pln: PLNEngine;

  beforeEach(() => {
    as = new AtomSpace();
    pln = new PLNEngine(as);
  });

  it("should perform deduction", () => {
    const sokrates = as.node("Sokrates");
    const human = as.node("Human");
    const mortal = as.node("Mortal");

    // Sokrates -> Human (TV: 1.0, 1.0)
    as.link(
      AtomType.InheritanceLink,
      [sokrates, human],
      createTruthValue(1.0, 1.0),
    );
    // Human -> Mortal (TV: 1.0, 1.0)
    as.link(
      AtomType.InheritanceLink,
      [human, mortal],
      createTruthValue(1.0, 1.0),
    );

    const newAtomsCount = pln.deduce();
    expect(newAtomsCount).toBe(1);

    const deducerResult = as.getAtom(
      `${AtomType.InheritanceLink}(${sokrates.id},${mortal.id})`,
    );
    expect(deducerResult).toBeDefined();
    expect(deducerResult!.truthValue.mean).toBe(1.0);
    expect(deducerResult!.truthValue.confidence).toBe(0.9); // 1.0 * 1.0 * 0.9
  });
});

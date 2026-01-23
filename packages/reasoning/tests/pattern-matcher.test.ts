import {
  AtomSpace,
  AtomType,
  PatternMatcher,
  Node,
  Link,
} from "../src/index.js";

describe("PatternMatcher", () => {
  let as: AtomSpace;
  let pm: PatternMatcher;

  beforeEach(() => {
    as = new AtomSpace();
    pm = new PatternMatcher(as);
  });

  it("should match a ground node", () => {
    const cat = as.node("Cat");
    const results = pm.match(cat);
    expect(results).toHaveLength(1);
  });

  it("should match a simple pattern with one variable", () => {
    const cat = as.node("Cat");
    const animal = as.node("Animal");
    const dog = as.node("Dog");

    as.link(AtomType.InheritanceLink, [cat, animal]);
    as.link(AtomType.InheritanceLink, [dog, animal]);

    // Pattern: InheritanceLink($x, Animal)
    const varX = new Node("x", AtomType.VariableNode);
    const pattern = new Link(AtomType.InheritanceLink, [varX, animal]); // Don't add to AS

    const results = pm.match(pattern);

    expect(results.length).toBe(2);

    const names = results.map((b) => (b.get("x") as Node).name).sort();
    expect(names).toEqual(["Cat", "Dog"]);
  });
});

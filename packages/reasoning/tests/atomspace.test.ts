import { AtomSpace, AtomType } from "../src/index.js";

describe("AtomSpace", () => {
  let as: AtomSpace;

  beforeEach(() => {
    as = new AtomSpace();
  });

  it("should create and store Nodes", () => {
    const n1 = as.node("Cat");
    expect(n1.name).toBe("Cat");
    expect(n1.type).toBe(AtomType.ConceptNode);
    expect(as.size()).toBe(1);

    const n2 = as.node("Cat");
    expect(n2).toBe(n1); // Should return existing
    expect(as.size()).toBe(1);
  });

  it("should create and store Links", () => {
    const cat = as.node("Cat");
    const animal = as.node("Animal");
    const link = as.link(AtomType.InheritanceLink, [cat, animal]);

    expect(link.type).toBe(AtomType.InheritanceLink);
    expect(link.outgoing).toHaveLength(2);
    expect(link.outgoing[0]).toBe(cat);
    expect(as.size()).toBe(3); // 2 nodes + 1 link
  });

  it("should find incoming links", () => {
    const cat = as.node("Cat");
    const animal = as.node("Animal");
    const link = as.link(AtomType.InheritanceLink, [cat, animal]);

    const incoming = as.getIncoming(animal);
    expect(incoming).toHaveLength(1);
    expect(incoming[0]).toBe(link);
  });
});

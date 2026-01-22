import { Atom, Node, Link, AtomType } from "./atom.js";
import { TruthValue, _createTruthValue as __createTruthValue  } from "./truth-value.js";

export class AtomSpace {
  private atoms: Map<string, Atom> = new Map();

  /**
   * Get an atom by its ID
   */
  public getAtom(id: string): Atom | undefined {
    return this.atoms.get(id);
  }

  /**
   * Add an atom to the AtomSpace
   */
  public addAtom(atom: Atom): Atom {
    if (!this.atoms.has(atom.id)) {
      this.atoms.set(atom.id, atom);
    }
    return this.atoms.get(atom.id)!;
  }

  /**
   * Create or get a ConceptNode
   */
  public node(
    name: string,
    type: AtomType = AtomType.ConceptNode,
    tv?: TruthValue,
  ): Node {
    const atom = new Node(name, type, tv);
    return this.addAtom(atom) as Node;
  }

  /**
   * Create or get a Link
   */
  public link(type: AtomType, outgoing: Atom[], tv?: TruthValue): Link {
    const atom = new Link(type, outgoing, tv);
    return this.addAtom(atom) as Link;
  }

  /**
   * Get all atoms of a certain type
   */
  public getByType(type: AtomType): Atom[] {
    return Array.from(this.atoms.values()).filter((a) => a.type === type);
  }

  /**
   * Get atoms that have a certain atom in their outgoing set
   */
  public getIncoming(atom: Atom): Link[] {
    return Array.from(this.atoms.values()).filter(
      (a) => a.isLink() && a.outgoing.some((o) => o.id === atom.id),
    ) as Link[];
  }

  public size(): number {
    return this.atoms.size;
  }

  public clear(): void {
    this.atoms.clear();
  }
}

import { TruthValue, createTruthValue } from "./truth-value.js";

export enum AtomType {
  Node = "Node",
  Link = "Link",
  ConceptNode = "ConceptNode",
  PredicateNode = "PredicateNode",
  ListLink = "ListLink",
  InheritanceLink = "InheritanceLink",
  EvaluationLink = "EvaluationLink",
  MemberLink = "MemberLink",
  VariableNode = "VariableNode",
}

export abstract class Atom {
  public readonly id: string;
  public readonly type: AtomType;
  public truthValue: TruthValue;
  public attention: number = 0; // STI/LTI equivalent
  public latentVector?: number[]; // Neural Grounding (ML embeddings)
  public visibility: "public" | "private" | "shared" = "private"; // Federation visibility
  public originId?: string; // Origin Bot ID for shared atoms

  constructor(
    id: string,
    type: AtomType,
    tv: TruthValue = createTruthValue(),
    vector?: number[],
    visibility: "public" | "private" | "shared" = "private",
    originId?: string,
  ) {
    this.id = id;
    this.type = type;
    this.truthValue = tv;
    this.latentVector = vector;
    this.visibility = visibility;
    this.originId = originId;
  }

  public abstract isNode(): this is Node;
  public abstract isLink(): this is Link;
}

export class Node extends Atom {
  public readonly name: string;

  constructor(
    name: string,
    type: AtomType = AtomType.ConceptNode,
    tv: TruthValue = createTruthValue(),
    vector?: number[],
    visibility: "public" | "private" | "shared" = "private",
    originId?: string,
  ) {
    super(`${type}:${name}`, type, tv, vector, visibility, originId);
    this.name = name;
  }

  public isNode(): this is Node {
    return true;
  }
  public isLink(): this is Link {
    return false;
  }
}

export class Link extends Atom {
  public readonly outgoing: Atom[];

  constructor(
    type: AtomType,
    outgoing: Atom[],
    tv: TruthValue = createTruthValue(),
    visibility: "public" | "private" | "shared" = "private",
    originId?: string,
  ) {
    // ID for links can be derived from type and outgoing atom IDs
    const id = `${type}(${outgoing.map((a) => a.id).join(",")})`;
    super(id, type, tv, undefined, visibility, originId);
    this.outgoing = outgoing;
  }

  public isNode(): this is Node {
    return false;
  }
  public isLink(): this is Link {
    return true;
  }
}

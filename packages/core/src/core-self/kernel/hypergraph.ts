import {
  cloneCanonical,
  sha256Hex,
  type CanonicalJsonValue,
} from "./canonical.js";
import {
  type CoreSelfProjectedState,
  type CoreSelfRelation,
  type CoreSelfSubject,
  validateRelation,
  validateSubject,
} from "./contracts.js";

export interface CoreSelfTraversalOptions {
  relationType?: string;
  endpointRole?: string;
  maxDepth?: number;
  includeInactive?: boolean;
}

export interface CoreSelfTraversalResult {
  startSubjectId: string;
  subjectIds: string[];
  relationIds: string[];
}

export interface CoreSelfGraphExport {
  schemaVersion: "1.0.0";
  rootSubjectId: string | null;
  subjects: CoreSelfSubject[];
  relations: CoreSelfRelation[];
}

function cloneValue<T>(value: T): T {
  return cloneCanonical(value as unknown as CanonicalJsonValue) as unknown as T;
}

function compareIds(left: { id: string }, right: { id: string }): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export class CoreSelfIdentityHypergraph {
  private readonly subjects = new Map<string, CoreSelfSubject>();
  private readonly relations = new Map<string, CoreSelfRelation>();

  constructor(state: CoreSelfProjectedState) {
    for (const subject of Object.values(state.subjects)) {
      validateSubject(subject);
      this.subjects.set(subject.id, cloneValue(subject));
    }
    for (const relation of Object.values(state.relations)) {
      validateRelation(relation);
      for (const endpoint of relation.endpoints) {
        if (!this.subjects.has(endpoint.subjectId)) {
          throw new Error(
            `Relation '${relation.id}' has missing endpoint '${endpoint.subjectId}'`,
          );
        }
      }
      this.relations.set(relation.id, cloneValue(relation));
    }
    if (
      state.rootSubjectId !== null &&
      !this.subjects.has(state.rootSubjectId)
    ) {
      throw new Error(`Root subject '${state.rootSubjectId}' does not exist`);
    }
    this.rootSubjectId = state.rootSubjectId;
  }

  readonly rootSubjectId: string | null;

  getSubject(subjectId: string): CoreSelfSubject | null {
    const subject = this.subjects.get(subjectId);
    return subject ? cloneValue(subject) : null;
  }

  getRelation(relationId: string): CoreSelfRelation | null {
    const relation = this.relations.get(relationId);
    return relation ? cloneValue(relation) : null;
  }

  relationsFor(
    subjectId: string,
    options: Omit<CoreSelfTraversalOptions, "maxDepth"> = {},
  ): CoreSelfRelation[] {
    if (!this.subjects.has(subjectId)) return [];
    return [...this.relations.values()]
      .filter((relation) => options.includeInactive || relation.active)
      .filter(
        (relation) =>
          options.relationType === undefined ||
          relation.type === options.relationType,
      )
      .filter((relation) =>
        relation.endpoints.some(
          (endpoint) =>
            endpoint.subjectId === subjectId &&
            (options.endpointRole === undefined ||
              endpoint.role === options.endpointRole),
        ),
      )
      .sort(compareIds)
      .map(cloneValue);
  }

  traverse(
    startSubjectId: string,
    options: CoreSelfTraversalOptions = {},
  ): CoreSelfTraversalResult {
    if (!this.subjects.has(startSubjectId)) {
      throw new Error(`Unknown start subject '${startSubjectId}'`);
    }
    const maxDepth = options.maxDepth ?? 1;
    if (!Number.isInteger(maxDepth) || maxDepth < 0 || maxDepth > 64) {
      throw new Error("maxDepth must be an integer within [0,64]");
    }

    const visitedSubjects = new Set<string>([startSubjectId]);
    const visitedRelations = new Set<string>();
    let frontier = [startSubjectId];

    for (let depth = 0; depth < maxDepth && frontier.length > 0; depth += 1) {
      const nextFrontier = new Set<string>();
      for (const subjectId of frontier.sort()) {
        for (const relation of this.relationsFor(subjectId, options)) {
          visitedRelations.add(relation.id);
          for (const endpoint of relation.endpoints) {
            if (!visitedSubjects.has(endpoint.subjectId)) {
              visitedSubjects.add(endpoint.subjectId);
              nextFrontier.add(endpoint.subjectId);
            }
          }
        }
      }
      frontier = [...nextFrontier].sort();
    }

    return {
      startSubjectId,
      subjectIds: [...visitedSubjects].sort(),
      relationIds: [...visitedRelations].sort(),
    };
  }

  export(): CoreSelfGraphExport {
    return cloneValue({
      schemaVersion: "1.0.0",
      rootSubjectId: this.rootSubjectId,
      subjects: [...this.subjects.values()].sort(compareIds),
      relations: [...this.relations.values()].sort(compareIds),
    });
  }

  digest(): string {
    return sha256Hex(this.export());
  }
}

import { Atom, AtomType, Link, Node } from "../atomspace/atom.js";
import { TruthValue } from "../atomspace/truth-value.js";

export interface ProgramCandidate {
  root: Atom;
  fitness: number;
  complexity: number;
}

export interface EvolutionConfig {
  populationSize: number;
  generations: number;
  mutationRate: number;
  crossoverRate: number;
  elitismCount: number;
}

const DEFAULT_CONFIG: EvolutionConfig = {
  populationSize: 100,
  generations: 50,
  mutationRate: 0.1,
  crossoverRate: 0.7,
  elitismCount: 5,
};

/**
 * Meta-Optimizing Semantic Evolutionary Search (MOSES)
 * A stub implementation of the program learning component.
 * In a full implementation, this would handle correct program tree evolution,
 * deme management, and representation building.
 */
export class MosesEngine {
  private config: EvolutionConfig;

  constructor(config: Partial<EvolutionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Evolve a population of candidates to maximize the fitness function
   * @param initialPopulation Starting candidates
   * @param fitnessFunction Function to evaluate a candidate
   */
  public async evolve(
    initialPopulation: Atom[],
    fitnessFunction: (program: Atom) => Promise<number>,
  ): Promise<ProgramCandidate[]> {
    let population: ProgramCandidate[] = [];

    // Evaluate initial population
    for (const atom of initialPopulation) {
      population.push({
        root: atom,
        fitness: await fitnessFunction(atom),
        complexity: this.calculateComplexity(atom),
      });
    }

    // Fill remaining spots if needed (with clones/mutations of initials)
    while (
      population.length < this.config.populationSize &&
      population.length > 0
    ) {
      const parent = population[Math.floor(Math.random() * population.length)];
      const child = this.mutate(parent.root);
      population.push({
        root: child,
        fitness: await fitnessFunction(child),
        complexity: this.calculateComplexity(child),
      });
    }

    // Evolution loop
    for (let gen = 0; gen < this.config.generations; gen++) {
      // Sort by fitness descending
      population.sort((a, b) => b.fitness - a.fitness);

      const newPopulation: ProgramCandidate[] = [];

      // Elitism
      for (
        let i = 0;
        i < this.config.elitismCount && i < population.length;
        i++
      ) {
        newPopulation.push(population[i]);
      }

      // Fill the rest
      while (newPopulation.length < this.config.populationSize) {
        // simple tournament selection
        const p1 = this.tournamentSelect(population);
        const p2 = this.tournamentSelect(population);

        let childRoot: Atom;

        if (Math.random() < this.config.crossoverRate) {
          childRoot = this.crossover(p1.root, p2.root);
        } else {
          childRoot = p1.root;
        }

        if (Math.random() < this.config.mutationRate) {
          childRoot = this.mutate(childRoot);
        }

        newPopulation.push({
          root: childRoot,
          fitness: await fitnessFunction(childRoot),
          complexity: this.calculateComplexity(childRoot),
        });
      }

      population = newPopulation;
    }

    // Final sort
    population.sort((a, b) => b.fitness - a.fitness);
    return population;
  }

  private tournamentSelect(pop: ProgramCandidate[]): ProgramCandidate {
    const k = 3;
    let best = pop[Math.floor(Math.random() * pop.length)];
    for (let i = 0; i < k - 1; i++) {
      const next = pop[Math.floor(Math.random() * pop.length)];
      if (next.fitness > best.fitness) {
        best = next;
      }
    }
    return best;
  }

  private mutate(atom: Atom): Atom {
    // Basic mutation: if it's a link, maybe swap a child or change type?
    // Since Atom is immutable-ish (readonly props), we mostly clone.
    // This is a placeholder for actual topological mutation logic.
    if (atom.isLink()) {
      if (atom.outgoing.length > 0) {
        // copy outgoing
        const newOutgoing = [...atom.outgoing];
        // swap or change one
        if (Math.random() > 0.5 && newOutgoing.length > 1) {
          const idx1 = Math.floor(Math.random() * newOutgoing.length);
          const idx2 = Math.floor(Math.random() * newOutgoing.length);
          [newOutgoing[idx1], newOutgoing[idx2]] = [
            newOutgoing[idx2],
            newOutgoing[idx1],
          ];
        }
        return new Link(atom.type, newOutgoing, atom.truthValue);
      }
    }
    return atom; // No mutation for nodes or empty links in this stub
  }

  private crossover(parent1: Atom, parent2: Atom): Atom {
    // Subtree crossover
    if (parent1.isLink() && parent2.isLink()) {
      // Take parent1 structure, but replace one child with something from parent2
      if (parent1.outgoing.length > 0) {
        const newOutgoing = [...parent1.outgoing];
        const replaceIdx = Math.floor(Math.random() * newOutgoing.length);
        // In a real system, we'd pick a compatible subtree from parent2
        const subtree =
          parent2.outgoing[Math.floor(Math.random() * parent2.outgoing.length)];
        if (subtree) {
          newOutgoing[replaceIdx] = subtree;
          return new Link(parent1.type, newOutgoing, parent1.truthValue);
        }
      }
    }
    return parent1;
  }

  private calculateComplexity(atom: Atom): number {
    if (atom.isNode()) return 1;
    if (atom.isLink()) {
      return (
        1 +
        atom.outgoing.reduce(
          (acc, child) => acc + this.calculateComplexity(child),
          0,
        )
      );
    }
    return 1;
  }
}

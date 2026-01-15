import { AtomSpace } from './index.js';
import { Atom, Node, Link } from './atom.js';

export type Bindings = Map<string, Atom>;

export class PatternMatcher {
    private atomSpace: AtomSpace;

    constructor(atomSpace: AtomSpace) {
        this.atomSpace = atomSpace;
    }

    public match(pattern: Atom): Bindings[] {
        const results: Bindings[] = [];

        if (pattern.type.endsWith('Link')) {
            const linkPattern = pattern as Link;
            const candidates = this.atomSpace.getByType(linkPattern.type as any) as Link[];

            for (const candidate of candidates) {
                const bindings = this.matchAtoms(linkPattern, candidate, new Map());
                if (bindings) {
                    results.push(bindings);
                }
            }
        } else if (pattern.type === 'VariableNode') {
            // ...
        } else {
            if (this.atomSpace.getAtom(pattern.id)) {
                results.push(new Map());
            }
        }

        return results;
    }

    private matchAtoms(pattern: Atom, target: Atom, currentBindings: Bindings): Bindings | null {
        if (pattern.type === 'VariableNode') {
            const varName = (pattern as Node).name;
            if (currentBindings.has(varName)) {
                return currentBindings.get(varName)!.id === target.id ? currentBindings : null;
            } else {
                const nextBindings = new Map(currentBindings);
                nextBindings.set(varName, target);
                return nextBindings;
            }
        }

        if (pattern.type !== target.type) {
            return null;
        }

        if (pattern.type.endsWith('Link') && target.type.endsWith('Link')) {
            const pLink = pattern as Link;
            const tLink = target as Link;
            if (pLink.outgoing.length !== tLink.outgoing.length) return null;

            let bindings: Bindings | null = new Map(currentBindings);
            for (let i = 0; i < pLink.outgoing.length; i++) {
                bindings = this.matchAtoms(pLink.outgoing[i], tLink.outgoing[i], bindings!);
                if (!bindings) return null;
            }
            return bindings;
        }

        // Ground node match
        return pattern.id === target.id ? currentBindings : null;
    }
}

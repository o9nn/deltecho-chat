export interface Need {
    id: string;
    value: number; // 0 to 1
    weight: number; // importance
}

export class OpenPsi {
    private needs: Map<string, Need> = new Map();

    constructor() {
        this.initializeNeeds();
    }

    private initializeNeeds() {
        this.needs.set('energy', { id: 'energy', value: 1.0, weight: 1.0 });
        this.needs.set('competence', { id: 'competence', value: 0.5, weight: 0.5 });
        this.needs.set('social', { id: 'social', value: 0.5, weight: 0.8 });
    }

    public getNeed(id: string): Need | undefined {
        return this.needs.get(id);
    }

    public updateNeed(id: string, delta: number): void {
        const need = this.needs.get(id);
        if (need) {
            need.value = Math.max(0, Math.min(1, need.value + delta));
        }
    }

    /**
     * Calculate global "Pleasure/Pain" or "Urgency"
     */
    public getGlobalSatisfaction(): number {
        let total = 0;
        let weightSum = 0;
        for (const need of this.needs.values()) {
            total += need.value * need.weight;
            weightSum += need.weight;
        }
        return total / weightSum;
    }

    /**
     * Decay needs over time
     */
    public step(): void {
        this.updateNeed('energy', -0.01);
        this.updateNeed('social', -0.005);
    }
}

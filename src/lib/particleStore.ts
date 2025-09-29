// src/lib/particleStore.ts
import { writable } from "svelte/store";
import { BParticle, BRange2 } from "$lib/types";

class ParticleManager {
    public particles: Map<string, BParticle>;

    constructor() {
        this.particles = new Map();

        // Initialize built-in particles
        this.initializeBuiltInParticles();
    }

    async initializeBuiltInParticles() {
        await this.addParticle("Fire");
        this.updateParticleProperty(this.getAllParticles()[0].id, {
            color: new BRange2("#ff4500", "#ff4500", "#ff4500", "#ff4500"),
        });

        await this.addParticle("Smoke");
        this.updateParticleProperty(this.getAllParticles()[1].id, {
            color: new BRange2("#808080", "#808080", "#808080", "#808080"),
        });

        await this.addParticle("Magic");
        this.updateParticleProperty(this.getAllParticles()[2].id, {
            color: new BRange2("#9932cc", "#9932cc", "#9932cc", "#9932cc"),
        });
    }

    async addParticle(name: string): Promise<BParticle> {
        const particle = new BParticle(name);
        this.particles.set(particle.id, particle);
        return particle;
    }

    removeParticle(particleId: string): boolean {
        const particle = this.particles.get(particleId);
        if (!particle) return false;

        this.particles.delete(particleId);
        return true;
    }

    getParticle(particleId: string): BParticle | undefined {
        return this.particles.get(particleId);
    }

    getAllParticles(): BParticle[] {
        return Array.from(this.particles.values());
    }

    updateParticle(particle: BParticle): boolean {
        if (!this.particles.has(particle.id)) {
            return false;
        }
        this.particles.set(particle.id, particle);
        return true;
    }

    updateParticleProperty(
        particleId: string,
        updates: Partial<BParticle>
    ): boolean {
        const particle = this.getParticle(particleId);
        if (!particle) return false;

        // Apply updates to the particle
        Object.assign(particle, updates);

        const success = this.updateParticle(particle);

        return success;
    }
}

// Create reactive store
function createParticleStore() {
    const manager = new ParticleManager();
    const { subscribe, update } = writable(manager);

    return {
        subscribe,

        addParticle: async (name: string) => {
            const particle = await manager.addParticle(name);
            update((m) => m);
            return particle;
        },

        removeParticle: (particleId: string) => {
            const success = manager.removeParticle(particleId);
            if (success) {
                update((m) => m);
            }
            return success;
        },

        getParticle: (particleId: string) => {
            return manager.getParticle(particleId);
        },

        getAllParticles: () => {
            return manager.getAllParticles();
        },

        updateParticle: (particle: BParticle) => {
            const success = manager.updateParticle(particle);
            if (success) {
                update((m) => m);
            }
            return success;
        },

        updateParticleProperty: (
            particleId: string,
            updates: Partial<BParticle>
        ) => {
            const particle = manager.getParticle(particleId);
            if (!particle) return false;

            // Apply updates to the particle
            Object.assign(particle, updates);

            const success = manager.updateParticle(particle);
            if (success) {
                update((m) => m);
            }
            return success;
        },
    };
}

export const particleStore = createParticleStore();
export { ParticleManager };

import type { GameObject } from './GameObject';

/**
 * Base class for all components in the game runtime system.
 * Components provide specific functionality to GameObjects (visual, physics, scripts, etc.)
 */
export abstract class Component {
    protected gameObject: GameObject;
    protected enabled: boolean = true;

    constructor(gameObject: GameObject) {
        this.gameObject = gameObject;
    }

    /**
     * Called every frame to update the component
     * @param delta Time elapsed since last frame in seconds
     */
    abstract update(delta: number): void;

    /**
     * Called when the component is first created or enabled
     */
    onEnable(): void {
        // Override in subclasses if needed
    }

    /**
     * Called when the component is disabled or destroyed
     */
    onDisable(): void {
        // Override in subclasses if needed
    }

    /**
     * Enable or disable this component
     */
    setEnabled(enabled: boolean): void {
        if (this.enabled !== enabled) {
            this.enabled = enabled;
            if (enabled) {
                this.onEnable();
            } else {
                this.onDisable();
            }
        }
    }

    /**
     * Check if this component is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Get the GameObject this component belongs to
     */
    getGameObject(): GameObject {
        return this.gameObject;
    }

    /**
     * Called when the component is destroyed
     */
    destroy(): void {
        this.onDisable();
    }
}
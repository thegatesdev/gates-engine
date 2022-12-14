// @ts-strict

import { ComponentType, ECSSave, GatesECS } from "./GatesECS";

export const enum TickPhase {
    EARLY_UPDATE = 0,
    UPDATE = 1,
    PHYSICS = 2,
    PRESENTATION = 3,
}

export class SceneManager {
    private activeScene: [string, GatesECS] | null = null;
    private readonly allScenes: Map<string, [GatesECS, ECSSave]> = new Map();

    public activate(id: string): GatesECS {
        if (this.activeScene !== null && this.activeScene[0] == id) throw new Error("Scene " + id + " already active");
        const next = this.allScenes.get(id);
        if (next === undefined) throw new Error("Scene " + id + " does not exist");
        this.saveActive(true);
        const ecs = next[0].load(next[1]);
        this.activeScene = [id, ecs];
        return ecs;
    }

    public saveActive(reset: boolean): void {
        if (this.activeScene === null) return;
        const ecs = this.activeScene[1];
        this.allScenes.set(this.activeScene[0], [ecs, ecs.createSave()])
        if (reset) this.activeScene[1].reset();
    }

    public add(id: string, ecs: GatesECS): void {
        if (this.allScenes.has(id)) throw new Error("Scene " + id + " already exists");
        this.allScenes.set(id, [ecs, ecs.createSave()]);
    }
}

export const ComponentTypes = new class {
    private readonly types: Map<string, ComponentType<unknown>> = new Map();

    // Cache
    private prevId: string | undefined = undefined;
    private prevType: ComponentType<unknown> | undefined = undefined;

    public add<T extends ComponentType<unknown>>(type: T): T {
        if (this.types.has(type.id)) throw new Error("This component type already exists");
        this.types.set(type.id, type);
        return type;
    }

    public get(id: string): ComponentType<unknown> | undefined {
        if (id != this.prevId) {
            this.prevType = this.get(id);
            this.prevId = id;
        }
        return this.prevType;
    }

    public getOrThrow(id: string): ComponentType<unknown> {
        this.get(id);
        if (this.prevType === undefined) throw new Error("Unknown component type; " + id);
        return this.prevType;
    }
}
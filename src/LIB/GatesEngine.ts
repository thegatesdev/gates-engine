import { ComponentType, GatesECS } from "./GatesECS";

export const enum TickPhase {
    EARLY_UPDATE = 0,
    UPDATE = 1,
    PHYSICS = 2,
    PRESENTATION = 3,
}

export type SceneData = {
    // ID + CHILDREN
    entities: [number, number[] | null][]
    // ID + TYPE + DATA
    components: [number, string, unknown][]
}

function optimizeSceneData(data: SceneData): SceneData {
    data.components.sort((a, b) => {
        return a[1].localeCompare(b[1]);
    })
    return data;
}

export class Scene extends GatesECS {
    private _savedState: SceneData | null = null;

    public load(data: SceneData): void {
        if (this._isInitialized) throw new Error("Already initalized");
        this._savedState = data;
        for (let [entity, type, compData] of data.components) {
            this.initComponent(entity, ComponentTypes.getOrThrow(type).create(compData))
        }
        for (let [entity, children] of data.entities) {
            this.initEntity(entity);
            if (children !== null)
                this.addTo(entity, ...children);
        }
    }

    public save(): SceneData {
        if (!this._isInitialized) throw new Error("Not initalized");
        const data: SceneData = {
            entities: [] = [],
            components: [] = []
        }
        for (let [entity, entityData] of this.entities!) {
            data.entities.push([entity, [...entityData!.children]]);
        }
        for (let [entity, component] of this.components!) {
            data.components.push([entity, component.type.id, component.data]);
        }
        this._savedState = optimizeSceneData(data);
        return this._savedState!;
    }

    public revert(): void {
        if (this._savedState === null) throw new Error("Cannot revert to empty state");
        this.reset();
        this.load(this._savedState);
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
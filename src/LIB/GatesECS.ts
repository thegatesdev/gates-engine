// @ts-strict

// TYPES
export type Entity = number

export type Component<D> = {
    type: ComponentType<D>;
    data: D;
};

export class ComponentType<D>{
    constructor(public readonly id: string) {
    }
    public create(data: D): Component<D> {
        return { type: this, data: data }
    }
    public destroy?(data: D): void;
}

// BASE

export abstract class System {
    private enabled: boolean = false;
    public abstract componentsRequired: Set<ComponentType<unknown>>;
    public abstract phase: number;

    public abstract onUpdate(ecs: GatesECS, entities: Map<Entity, EntityData>, deltaTime: number): void;
    public onEnable?(): void;
    public onDisable?(): void;

    public enable(): void {
        if (this.enabled) return;
        this.enabled = true;
        this.onEnable?.();
    }

    public disable(): void {
        if (!this.enabled) return;
        this.enabled = false;
        this.onDisable?.();
    }

    get isEnabled(): boolean {
        return this.enabled;
    }

    public onComplete?(ecs: GatesECS, entity: Entity, data: EntityData): void;
    public onUncomplete?(ecs: GatesECS, entity: Entity, data: EntityData): void;
}

export class EntityData {
    public readonly children: Set<Entity> = new Set();
    public readonly confirmedComponentTypes: Set<string> = new Set();
}

// ENGINE

export class GatesECS {
    protected _isInitialized = false;
    protected entities: Map<Entity, EntityData | null> | null = null;
    protected components: Map<Entity, Component<unknown>> | null = null;

    protected systems = new Map<System, Map<Entity, EntityData>>();
    protected phasedSystems = new Map<number, Set<System>>();

    // --

    private _nextEntityID = 0;
    private entitiesToDestroy: Entity[] = [];

    public doTick = false;
    // --

    public tick(deltaTime: number = 1): void {
        if (!this.doTick) return;
        for (const systems of this.phasedSystems.values()) {
            for (let system of systems) {
                if (system.isEnabled) {
                    system.onUpdate(this, this.systems.get(system)!, deltaTime);
                }
            }
        }
        this.tickDestroy();
    }

    public init(): void {
        if (this._isInitialized) throw new Error("Already initalized!");
        this._isInitialized = true;
        this.entities = new Map();
        this.components = new Map();
    }

    public reset(): void {
        this.entities = null;
        this.components = null;
        for (let [, val] of this.systems) {
            val.clear();
        }
        this._isInitialized = false;
    }

    private tickDestroy(): void {
        const len = this.entitiesToDestroy.length;
        for (let i = 0; i < len; i++) {
            this.destroy(this.entitiesToDestroy.pop()!);
        }
    }

    // ENTITIES

    public entity(): Entity {
        return this.initEntity(this._nextEntityID++);
    }

    protected initEntity(entity: Entity): Entity {
        this.entities!.set(entity, null);
        return entity;
    }

    public component(data: Component<unknown>): Entity {
        return this.initComponent(this.entity(), data);
    }

    protected initComponent(entity: Entity, data: Component<unknown>): Entity {
        this.components!.set(entity, data);
        return entity;
    }


    protected destroy(entity: Entity): void {
        for (const systemEntities of this.systems.values()) {
            systemEntities.delete(entity);
        }
        this.entities!.delete(entity);
    }

    public remove(entity: Entity): void {
        this.entitiesToDestroy.push(entity);
    }

    public countEntities(): number {
        if (this.entities === null) return 0;
        return this.entities.size - this.entitiesToDestroy.length;
    }

    private getEntityData(entity: Entity): EntityData | undefined | null {
        if (this.entities === null) return null;
        return this.entities.get(entity);
    }

    protected getOrCreateEntityData(entity: Entity): EntityData {
        let data = this.entities!.get(entity);
        if (data === undefined) throw new Error("Cannot add to non existant entity");
        if (data === null) {
            data = new EntityData();
            this.entities!.set(entity, data);
        }
        return data;
    }

    public getComponentData<T>(component: Entity, type?: ComponentType<T>): T | undefined {
        const data = this.components!.get(component);
        if (data !== undefined && (!type || data.type == type)) {
            return data.data as T;
        }
        return undefined;
    }

    protected getComponent<T>(component: Entity, type?: ComponentType<T>): Component<T> | undefined {
        const data = this.components!.get(component);
        if (data !== undefined && (!type || data.type == type)) {
            return data as Component<T>;
        }
        return undefined;
    }


    public addComponent(onto: Entity, data: Component<unknown>): Entity {
        const comp = this.component(data);
        this.addTo(onto, comp);
        return comp;
    }

    public isEntity(id: number): boolean {
        return this.entities!.has(id);
    }

    public isComponent(id: number): boolean {
        return this.components!.has(id);
    }

    public addTo(onto: Entity, ...entities: Entity[]): Entity {
        const data = this.getOrCreateEntityData(onto);
        for (const e of entities) {
            data.children.add(e);
            if (this.isComponent(e)) data.confirmedComponentTypes.add(this.getComponent(e)!.type.id)
        }
        this.checkE(onto);
        return onto;
    }

    public removeFrom(from: Entity, ...entities: Entity[]): Entity {
        const data = this.getEntityData(from);
        if (data !== null && data !== undefined) {
            for (const e of entities) {
                data.children.delete(e);
                if (this.isComponent(e)) data.confirmedComponentTypes.delete(this.getComponent(e)!.type.id);
            }
        }
        this.checkE(from);
        return from;
    }

    public hasChildren(from: Entity, ...children: Entity[]): boolean {
        const data = this.getEntityData(from);
        if (data === null || data === undefined) return false;
        for (let en of children) {
            if (!data.children.has(en)) return false;
        }
        return true;
    }

    // SYSTEMS

    public addSystem<S extends System>(system: S): S {
        if (this._isInitialized) throw new Error("Already initalized");
        // Add
        const set = new Map<Entity, EntityData>();
        this.systems.set(system, set);
        // Add system to phase
        if (!this.phasedSystems.has(system.phase)) {
            this.phasedSystems.set(system.phase, new Set());
            this.sortPhases();
        }
        this.phasedSystems.get(system.phase)!.add(system);
        // Check for matching entities
        for (const [entity, data] of this.entities!) {
            // Don't use checkE since that checks all systems
            if (data === null) continue;
            this.checkES(entity, data, system);
        }
        return system;
    }

    protected sortPhases(): void {
        this.phasedSystems = new Map([...this.phasedSystems].sort(([a,], [b,]) => {
            return a - b;
        }));
    }

    // --

    protected checkE(entity: Entity): void {
        const data = this.getEntityData(entity);
        if (!data) return;
        for (const system of this.systems.keys()) {
            this.checkES(entity, data, system);
        }
    }

    protected checkES(entity: Entity, data: EntityData, system: System): void {
        const sysData = this.systems.get(system);
        if (!sysData) return;
        if (data !== null && hasComponentsOf(data, system.componentsRequired)) {
            sysData.set(entity, data);
            system.onComplete?.(this, entity, data);
        } else {
            sysData.delete(entity);
            system.onUncomplete?.(this, entity, data);
        }
    }
}

// UTIL

export class Prefab {
    protected components: (() => Component<unknown>)[] = [];
    protected createFn!: (eng: GatesECS, entity: Entity) => void;

    public addComponent(callback: () => Component<unknown>) {
        this.components.push(callback);
    }

    onCreate(fn: (eng: GatesECS, entity: number) => void) {
        this.createFn = fn;
    }

    create(engine: GatesECS): Entity {
        const entity = engine.entity();
        this.components.forEach(callback => engine.component(callback()));
        this.createFn?.apply(this, [engine, entity]);
        return entity;
    }
}

// UTIL FUNCTIONS

export function hasComponentsOf(e: EntityData, types: Set<ComponentType<unknown>>) {
    const have = e.confirmedComponentTypes;
    for (const type of types) {
        if (!have.has(type.id)) { return false; }
    }
    return true;
}

export function* getComponentsOf<D>(ecs: GatesECS, e: EntityData, type: ComponentType<D>): Generator<D> {
    let data;
    for (const child of e.children) {
        data = ecs.getComponentData(child, type);
        if (data) yield data;
    }
}

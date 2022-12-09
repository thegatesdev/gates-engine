// TYPES

export type Entity = number

export type ComponentData = any;

export type ComponentClass<T extends ComponentData> = new (...args: any[]) => T

// BASE

export abstract class System{
    public enabled: boolean = true;
    public abstract componentsRequired: Set<ComponentClass<any>>;
    public abstract phase: number;
    public abstract update(ecs: GatesECS, entities: Map<Entity, EntityData>, deltaTime: number): void
    public init?(ecs: GatesECS): void;
    public complete?(ecs: GatesECS, entity: Entity, data: EntityData): void;
    public uncomplete?(ecs: GatesECS, entity: Entity, data: EntityData): void;
}

export class EntityData{
    public children: Set<Entity> = new Set();
    public componentClasses: Set<Function> = new Set();
}

// ENGINE

export class GatesECS {

    private isInitialized = false;

    private entities = new Map<Entity, EntityData | null>();
    private components = new Map<Entity, ComponentData>();

    private systems = new Map<System, Map<Entity, EntityData>>();
    private phasedSystems = new Map<number, Set<System>>();

    // --

    private _nextEntityID = 0;
    private entitiesToDestroy: Entity[] = [];

    public tick(deltaTime: number = 0): void{
        for (const systems of this.phasedSystems.values()) {
            for (let system of systems) {
                if (system.enabled){
                    system.update(this, this.systems.get(system), deltaTime);
                }
            }
        }
        this.tickDestroy();
    }

    public tickDestroy(): void {
        const len = this.entitiesToDestroy.length;
        for (let i = 0; i < len; i++) {
            this.remove(this.entitiesToDestroy.pop()!);
        }
    }

    public init(): void{
        if (this.isInitialized) throw new Error("already initialized");
        for (const sys of this.systems.keys()) {
            sys.init?.(this);
        }
        this.isInitialized = true;
    }

    // ENTITIES

    public entity(): Entity {
        this.entities.set(this._nextEntityID, null);
        return this._nextEntityID++;
    }

    private remove(entity: Entity): void {
        for (const systemEntities of this.systems.values()) {
            systemEntities.delete(entity);
        }
        this.entities.delete(entity);
    }
    
    public destroy(entity: Entity): void {
        this.entitiesToDestroy.push(entity);
    }
    
    public countEntities(): number{
        return this.entities.size - this.entitiesToDestroy.length;
    }


    public component(data: ComponentData): Entity{
        const component = this.entity();
        this.components.set(component, data);
        return component;
    }

    public getEntityData(entity: Entity): EntityData | undefined | null{
        return this.entities.get(entity);
    }

    private getOrCreateEntityData(entity: Entity): EntityData | undefined{
        let data = this.entities.get(entity);
        if (data === undefined) return undefined;
        if (data === null){
            data = new EntityData();
            this.entities.set(entity, data);
        }
        return data;
    }

    public getComponentData<T extends ComponentData>(component: Entity, _compClass?: ComponentClass<T>): T | undefined{
        const data = this.components.get(component);
        if (!_compClass || data.constructor == _compClass){
            return data;
        }
        return undefined;
    }

    
    public addComponent(onto: Entity, data: ComponentData): Entity{
        const comp = this.component(data);
        this.addTo(onto, comp);
        return comp;
    }

    public isEntity(id: number): boolean{
        return this.entities.has(id);
    }

    public isComponent(id: number): boolean{
        return this.components.has(id);
    }
    
    public addTo(onto: Entity, ...entities: Entity[]): Entity {
        const data = this.getOrCreateEntityData(onto);
        for (const e of entities) {
            data.children.add(e);
            if (this.isComponent(e)) data.componentClasses.add(this.getComponentData(e).constructor)
        }
        this.checkE(onto);
        return onto;
    }

    public removeFrom(from: Entity, ...entities: Entity[]): Entity{
        const data = this.entities.get(from);
        if (data === null) return from;
        for (const e of entities) {
            data.children.delete(e);
            if (this.isComponent(e)) data.componentClasses.delete(this.getComponentData(e).constructor)
        }
        this.checkE(from);
        return from;
    }

    // SYSTEMS

    public addSystem(system: System): System {
        // Add
        const set = new Map<Entity, EntityData>();
        this.systems.set(system, set);
        // Add system to phase
        if (!this.phasedSystems.has(system.phase)){
            this.phasedSystems.set(system.phase, new Set());
            this.sortPhases();
        }
        this.phasedSystems.get(system.phase)!.add(system);
        // Check for matching entities
        for (const entity of this.entities.keys()) {
            // Don't use checkE since that checks all systems
            this.checkES(entity,this.entities.get(entity), system);
        }
        return system;
    }

    public removeSystem(system: System): void {
        this.systems.delete(system);
        const sys = this.phasedSystems.get(system.phase)!;
        sys.delete(system);
        if (sys.size == 0){
            this.phasedSystems.delete(system.phase);
            this.sortPhases();  
        } 
    }

    private sortPhases(): void{
        this.phasedSystems = new Map([...this.phasedSystems].sort(([a,], [b,]) => {
            return a - b;
        }));
    }

    // --

    private checkE(entity: Entity): void {
        const data = this.getEntityData(entity);
        for (const system of this.systems.keys()) {
            this.checkES(entity,data, system);
        }
    }

    private checkES(entity: Entity, data: EntityData, system: System): void {
        if (data !== null && hasAllComponents(data, system.componentsRequired)){
            this.systems.get(system).set(entity, data);
            system.complete?.(this,entity, data);
        }else{
            this.systems.get(system).delete(entity);
            system.uncomplete?.(this,entity, data);
        }
    }
}

// UTIL

export class Prefab{
    protected components: Map<ComponentClass<ComponentData>, (c: Entity) => ComponentData> = new Map();
    protected createFn!: (eng:GatesECS,entity:Entity) => void;

    addComponent<T extends ComponentData>(compClass: ComponentClass<T>, comp: (c: Entity) => T){
        if (!this.components.has(compClass)){
            this.components.set(compClass,comp);
        }
        return this;
    }

    onCreate(fn: (eng: GatesECS, entity: number) => void){
        this.createFn = fn;
    }

    create(engine: GatesECS): Entity{
        const entity = engine.entity();
        this.components.forEach(c => engine.addTo(entity, engine.component(c.apply(engine, [entity]))));
        this.createFn?.apply(this, [engine, entity]);
        return entity;
    }
}

// UTIL FUNCTIONS

export function hasAllComponents(e: EntityData, compClasses: Set<ComponentClass<any>>){
    const have = e.componentClasses;
    for (const compClass of compClasses) {
        if (!have.has(compClass)) return false;
    }
    return true;
}

export function * getComponentsOf<T extends ComponentData>(ecs: GatesECS, e: EntityData, compClass: ComponentClass<T>): Generator<T>{
    let data;
    for (const child of e.children) {
        data = ecs.getComponentData(child, compClass);
        if (data) yield data;
    }
}

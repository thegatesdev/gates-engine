// ENGINE

export type Entity = number

export type ComponentData = any;

export type ComponentClass<T extends ComponentData> = new (...args: any[]) => T

export abstract class System{
    public enabled: boolean = true;
    public abstract componentsRequired: Set<ComponentClass<any>>;
    public abstract phase: number;
    public abstract update(engine: GatesECS, entities: EntitySet): void
    public init?(engine: GatesECS): void;
    public complete?(entity: Entity, comps: EntityComponentsImpl): void;
    public uncomplete?(entity: Entity): void;
}

export interface EntityComponents{
    getFirst<T extends ComponentData>(compClass: ComponentClass<T>): T;
    get<T extends ComponentData>(compClass: ComponentClass<T>): Entity[];
    has(entity: Entity): boolean;
    isEmpty(): boolean;
    hasComponent(componentClass: ComponentClass<any>): boolean;
    hasComponents(componentClasses: Iterable<ComponentClass<any>>): boolean;
}

class EntityComponentsImpl implements EntityComponents{
    private components = new Map<Entity, ComponentData | null>();
    private classes = new Map<Function, Entity[]>();

    private _isEmpty = true;

    public add(entity: Entity, data: ComponentData = null): Entity {
        this._isEmpty = false;
        this.components.set(entity, data);
        if (data != null){
            this.addClass(data.constructor, entity);
            data.entities++;
        }
        return entity;
    }

    public remove(entity: Entity){
        const data = this.components.get(entity);
        this.components.delete(entity);
        if (this.components.size == 0) this._isEmpty = true;
        if (data != null){
            this.classes.delete(data.constructor);
        }
    }

    public addClass(componentClass: Function, component: Entity){
        if (!this.classes.has(componentClass)) this.classes.set(componentClass, new Array());
        this.classes.get(componentClass)!.push(component);
    }

    public getFirst<T extends ComponentData>(compClass: ComponentClass<T>): T{
        return this.components.get(this.classes.get(compClass)![0]) as T;
    }

    public get<T extends ComponentData>(compClass: ComponentClass<T>): Entity[]{
        return this.classes.get(compClass)!;
    }

    public has(entity: Entity): boolean{
        return this.components.has(entity);
    }

    public isEmpty(): boolean{
        return this._isEmpty;
    }


    public hasComponent(componentClass: ComponentClass<any>): boolean {
        return this.classes.has(componentClass);
    }

    public hasComponents(componentClasses: Iterable<ComponentClass<any>>): boolean {
        for (let cls of componentClasses) {
            if (!this.classes.has(cls)) {
                return false;
            }
        }
        return true;
    }
}

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

export class EntitySet{
    public entities = new Set<Entity>();
    * loopComponents(ecs: GatesECS): Generator<EntityComponents>{
        for (const e of this.entities) {
            yield ecs.getComponents(e);
        }
    }
}

export class GatesECS {
    private entities = new Map<Entity, EntityComponentsImpl>();
    private components = new Map<Entity, ComponentData>();

    private phasedSystems = new Map<number, Map<System, EntitySet>>();
    private allSystems = new Map<System, EntitySet>();

    private isInitialized = false;

    // --

    private nextEntityID = 0
    private entitiesToDestroy: Entity[] = [];

    public tick(phase: number): void{
        if (!this.isInitialized) throw new Error("not initialized");
        if (!this.phasedSystems.has(phase)) return;
        for (let [system, es] of this.phasedSystems.get(phase)!) {
            if (system.enabled){
                system.update(this, es);
            }
        }
    }

    public tickDestroy(): void {
        while (this.entitiesToDestroy.length > 0) {
            this.remove(this.entitiesToDestroy.pop()!);
        }
    }

    public init(): void{
        if (this.isInitialized) throw new Error("already initialized");
        for (const sys of this.allSystems.keys()) {
            sys.init?.(this);
        }
        this.isInitialized = true;
    }

    // ENTITIES

    public entity(entityID: number = this.nextEntityID++): Entity {
        if (this.entities.has(entityID)) throw new Error("Entity ID "+entityID+" is already in use");
        this.entities.set(entityID, new EntityComponentsImpl());
        return entityID;
    }

    private remove(entity: Entity): void {
        const comp = this.getComponents(entity);
        for (const systemEntities of this.allSystems.values()) {
            systemEntities.entities.delete(entity);
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

    public getComponents(entity: Entity): EntityComponents{
        return this.entities.get(entity)!;
    }

    public getComponent<T extends ComponentData>(component: Entity, _compClass?: ComponentClass<T>): T{
        return this.components.get(component) as T;
    }

    public addTo(onto: Entity, ...entities: Entity[]): Entity {
        for (const e of entities) {
            this.entities.get(onto).add(e, this.components.get(e));
            this.checkE(onto);
        }
        return onto;
    }

    public addComponent(onto: Entity, data: ComponentData): Entity{
        const comp = this.component(data);
        this.addTo(onto, comp);
        return comp;
    }

    public removeFrom(from: Entity, ...entities: Entity[]): Entity{
        for (const e of entities) {
            this.entities.get(from).remove(e);
            this.checkE(from);
        }
        return from;
    }

    // SYSTEMS

    public addSystem(system: System): System {
        const set = new EntitySet();
        this.allSystems.set(system, set);
        if (!this.phasedSystems.has(system.phase)) this.phasedSystems.set(system.phase, new Map());
        this.phasedSystems.get(system.phase)!.set(system, set);
        for (const entity of this.entities.keys()) {
            this.checkES(entity, system);
        }
        return system;
    }

    public removeSystem(system: System): void {
        this.allSystems.delete(system);
        const sys = this.phasedSystems.get(system.phase)!;
        sys.delete(system);
        if (sys.size == 0) this.phasedSystems.delete(system.phase);
    }

    // --

    private checkE(entity: Entity): void {
        for (const system of this.allSystems.keys()) {
            this.checkES(entity, system);
        }
    }

    private checkES(entity: Entity, system: System): void {
        let have = this.entities.get(entity);
        if (!have) return;
        if (have.hasComponents(system.componentsRequired)){
            this.allSystems.get(system)!.entities.add(entity);
            system.complete?.(entity, have);
        }
        else{
            this.allSystems.get(system)!.entities.delete(entity);
            system.uncomplete?.(entity);
        }
    }
}
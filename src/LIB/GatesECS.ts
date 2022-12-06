// ENGINE

export type Entity = number

export abstract class ComponentData{
    public entities: number = 0;
    destroy?(): void;
}

export type ComponentClass<T extends ComponentData> = new (...args: any[]) => T

export abstract class System{
    public abstract componentsRequired: Set<ComponentClass<any>>;
    public abstract phase: number;
    public abstract update(engine: GatesECS, entities: EntitySet): void
    public init?(engine: GatesECS): void;
    public complete?(entity: Entity, comps: EntityComponents): void;
    public uncomplete?(entity: Entity): void;
}

export class EntityComponents {
    private components = new Map<Entity, ComponentData | null>();
    private classes = new Map<Function, Array<Entity>>();

    public readonly entity: Entity;

    constructor(entity: Entity){
        this.entity = entity;
    }

    public add(entity: Entity, data: ComponentData = null): void {
        this.components.set(entity, data);
        if (data != null){
            this.addClass(data.constructor, entity);
            data.entities++;
        }
    }

    public remove(entity: Entity){
        const data = this.components.get(entity);
        this.components.delete(entity);
        if (data != null){
            this.classes.delete(data.constructor);
            if (--data.entities < 1) data.destroy();
        }
    }

    private addClass(componentClass: Function, component: Entity){
        if (!this.classes.has(componentClass)) this.classes.set(componentClass, new Array());
        this.classes.get(componentClass)!.push(component);
    }

    public getFirst<T extends ComponentData>(compClass: ComponentClass<T>): T{
        return this.components.get(this.classes.get(compClass)![0]) as T;
    }

    public get<T extends ComponentData>(compClass: ComponentClass<T>): Array<Entity>{
        return this.classes.get(compClass)!;
    }

    public has(entity: Entity){
        return this.components.has(entity);
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
    private entities = new Map<Entity, EntityComponents>();
    public getEntities(): IterableIterator<Entity>{
        return this.entities.keys();
    }
    public getEntityComponents(): IterableIterator<EntityComponents>{
        return this.entities.values();
    }

    public get(entity: Entity): EntityComponents | undefined{
        return this.entities.get(entity);
    }
    public add(components: EntityComponents){
        this.entities.set(components.entity, components);
    }
    public remove(entity: Entity){
        this.entities.delete(entity);
    }

    public forEach(callbackfn: (components: EntityComponents, entity: Entity) => void){
        this.entities.forEach(callbackfn);
    }
    public size(): number{
        return this.entities.size;
    }
}

export class GatesECS {
    private entities = new EntitySet();
    private components = new Map<Entity, ComponentData>();

    private phasedSystems = new Map<number, Map<System, EntitySet>>();
    private allSystems = new Map<System, EntitySet>();

    private isInitialized = false;

    // CACHE

    private lastEntityCache: number | null = null;
    private lastComponentCache: number | null = null;

    // --

    private nextEntityID = 0
    private entitiesToDestroy: Entity[] = [];

    public tick(phase: number): void{
        if (!this.isInitialized) throw new Error("not initialized");
        if (!this.phasedSystems.has(phase)) return;
        for (let system of this.phasedSystems.get(phase)!) {
            system[0].update(this, system[1]);
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

    public entity(): Entity {
        const entity = this.nextEntityID++;
        this.entities.add(new EntityComponents(entity));
        this.lastEntityCache = entity;
        return entity;
    }

    private remove(entity: Entity): void {
        const comp = this.getComponents(entity);
        for (const system of this.allSystems.values()) {
            system.remove(entity);
        }
        this.entities.remove(entity);
    }
    
    public destroy(entity: Entity): void {
        this.entitiesToDestroy.push(entity);
    }
    
    public countEntities(): number{
        return this.entities.size() - this.entitiesToDestroy.length;
    }

    public lastEntity(): EntityComponents{
        if (this.lastEntityCache === null) throw new Error("No last entity");
        return this.getComponents(this.lastEntityCache);
    }

    public lastComponent<T extends ComponentData>(_compClass?: ComponentClass<T>): T{
        if (this.lastComponentCache === null) throw new Error("No last component");
        return this.getComponent(this.lastComponentCache) as T;
    }


    public component(data: ComponentData): Entity{
        const component = this.entity();
        this.components.set(component, data);
        this.lastComponentCache = component;
        return component;
    }

    private getComponents(entity: Entity): EntityComponents{
        return this.entities.get(entity)!;
    }

    public getComponent<T extends ComponentData>(component: Entity, _compClass?: ComponentClass<T>): T{
        return this.components.get(component) as T;
    }

    public addTo(onto: Entity, ...entities: Entity[]): Entity {
        for (const e of entities) {
            this.getComponents(onto).add(e, this.components.get(e));
            this.checkE(onto);
        }
        return onto;
    }

    public addComponent(onto: Entity, data: ComponentData): Entity{
        return this.addTo(onto, this.component(data));
    }

    public removeFrom(from: Entity, ...entities: Entity[]): Entity{
        for (const e of entities) {
            this.getComponents(from).remove(e);
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
        for (const entity of this.entities.getEntities()) {
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
            this.allSystems.get(system)!.add(have);
            system.complete?.(entity, have);
        }
        else{
            this.allSystems.get(system)!.remove(entity);
            system.uncomplete?.(entity);
        }
    }
}
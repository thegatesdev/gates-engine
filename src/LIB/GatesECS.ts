// @ts-strict

export namespace GatesECS {

    // TYPES

    export abstract class System {
        private enabled: boolean = false;
        public abstract phase: number;

        public abstract componentTypes: ComponentType[];

        entities: Set<number> = new Set();

        public onTick?(ecs: GatesECS, deltaTime: number): void;
        public onMatch?(ecs: GatesECS, entity: number): void;
        public onUnmatch?(ecs: GatesECS, entity: number, comp: number): void;
        public onEnable?(): void;
        public onDisable?(): void;

        public enable(): this {
            if (!this.enabled) {
                this.enabled = true;
                this.onEnable?.();
            }
            return this;
        }

        public disable(): this {
            if (this.enabled) {
                this.enabled = false;
                this.onDisable?.();
            }
            return this;
        }

        public get isEnabled(): boolean {
            return this.enabled;
        }
    }

    export class ComponentType<_D extends {} = any>{
        readonly systems: Set<System> = new Set();
    }

    type ComponentData<D extends {} = any> = {
        data: D;
        type: ComponentType<D>;
    }

    class EntityData {
        private _components: Set<number> | null = null;
        public get components(): Set<number> {
            if (this._components == null) this._components = new Set();
            return this._components;
        }
        public get hasComponents(): boolean {
            return this._components != null && this._components.size != 0;
        }
    }

    // ENGINE

    export class GatesECS {
        private entities: (EntityData | null)[] = [];
        private components: (ComponentData | null)[] = [];

        private canAddSystems = true;
        private systems: System[] = [];

        // --

        private entitiesToDestroy: number[] = [];
        private destroyed: number[] = [];

        public doTick = false;

        // UTILITY

        public entityCount(): number {
            if (this.entities === null) return 0;
            return this.entities.length - this.entitiesToDestroy.length;
        }

        // ROOT OPERATIONS

        public tick(deltaTime: number = 1): void {
            if (!this.doTick) return;
            for (const sys of this.systems) {
                if (sys.isEnabled) {
                    sys.onTick!(this, deltaTime);
                }
            }
            this.tickDestroy();

        }

        private tickDestroy(): void {
            const len = this.entitiesToDestroy.length;
            for (let i = 0; i < len; i++) {
                this.destroyEntity(this.entitiesToDestroy.pop()!);
            }
        }

        // ENTITIES

        public entity(): number {
            return this.entities.push(new EntityData()) - 1;
        }

        private entityData(entity: number): EntityData | null {
            if (entity >= this.entities.length) return null;
            return this.entities[entity];
        }

        protected destroyEntity(entity: number): void {
            for (const sys of this.systems) {
                sys.entities.delete(entity);
            }
            this.entities[entity] = null;
            this.destroyed.push(entity);
        }

        public removeEntity(entity: number): void {
            if (entity >= this.entities.length) return;
            this.entitiesToDestroy.push(entity);
        }

        public addComponent<T extends {}>(entity: number, type: ComponentType<T>, data: T): number {
            return this.addComponentRef(entity, this.component(type, data));
        }

        public addComponentRef(entity: number, component: number): number {
            const entityData = this.entityData(entity);
            if (entityData == null) throw new Error("Entity not found");
            entityData.components.add(component);
            const compData = this.componentData(component);
            if (compData != null) this.componentChange(entity, component, compData.type.systems);
            return component;
        }

        public removeComponent(entity: number, component: number) {
            const entityData = this.entityData(entity);
            if (entityData == null) throw new Error("Entity not found");
            entityData.components.delete(component);
            const compData = this.componentData(component);
            if (compData != null) this.componentChange(entity, component, compData.type.systems);
        }

        // COMPONENTS

        private componentData(component: number): ComponentData | null {
            if (component >= this.components.length) return null;
            return this.components[component];
        }

        public component<T extends {}>(type: ComponentType<T>, data: T): number {
            return this.components.push({ type: type, data: data }) - 1;
        }

        public getComponent<T extends {}>(ref: number, type: ComponentType<T> | null = null): T | null {
            if (ref >= this.components.length) return null;
            const comp = this.components[ref];
            if (comp == null) return null;
            if (type != null && comp.type != type) return null;
            return comp.data as T;
        }

        public getComponents<T extends {}>(entity: number, type: ComponentType<T>): T[] {
            const data = this.entityData(entity);
            const output: T[] = [];
            if (data == null || !data.hasComponents) return output;
            for (const comp of data.components) {
                const compData = this.componentData(comp);
                if (compData != null && compData.type == type) output.push(compData.data as T);
            }
            return output;
        }

        public hasComponent(entity: number, component: number): boolean {
            const data = this.entityData(entity);
            if (data == null || !data.hasComponents) return false;
            return data.components.has(component);
        }

        // SYSTEMS

        public addSystems(...systems: System[]): void {
            if (!this.canAddSystems) throw new Error("Cannot add systems anymore");
            for (let sys of systems) {
                this.systems.push(sys);
                for (const type of sys.componentTypes) {
                    type.systems.add(sys);
                }
            }
            this.sortPhases();
        }

        protected sortPhases(): void {
            this.systems = this.systems.sort((a, b) => a.phase - b.phase);
        }

        // MAPPING

        private componentChange(entity: number, comp: number, systems: Iterable<System> = this.systems) {
            this.canAddSystems = false;
            const data = this.entityData(entity);
            if (data == null) throw new Error("This entity does not exist");
            if (!data.hasComponents) {
                for (const sys of systems) {
                    if (sys.entities.delete(entity))
                        sys.onUnmatch?.(this, entity, comp);
                }
                return;
            }
            let have = this.componentTypes(data);
            for (const sys of systems) {
                if (!sys.entities.has(entity) && this.hasAllComponents(have, sys.componentTypes)) {
                    sys.entities.add(entity)
                    sys.onMatch?.(this, entity);
                } else if (sys.entities.delete(entity))
                    sys.onUnmatch?.(this, entity, comp);
            }
        }

        private hasAllComponents(have: Set<ComponentType>, needs: Iterable<ComponentType>): boolean {
            for (const need of needs) {
                if (!have.has(need)) return false;
            }
            return true;
        }

        private componentTypes(data: EntityData): Set<ComponentType> {
            const set = new Set<ComponentType>();
            for (const component of data.components) {
                const compData = this.componentData(component);
                if (compData != null) set.add(compData.type);
            }
            return set;
        }
    }
}

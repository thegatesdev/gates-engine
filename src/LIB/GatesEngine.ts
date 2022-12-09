import { Application, Container } from "pixi.js";
import { ComponentClass, ComponentData, Entity, EntityData, GatesECS, getComponentsOf, System } from "./GatesECS";

// COMPONENTS

export class PositionComponent implements ComponentData{
    constructor(public x: number = 0, public y: number = 0){
    }
}

export class DisplayComponent implements ComponentData{
    constructor(public readonly container: Container, public readonly positionComponent: Entity){
    }
}

// SYSTEMS

export const DisplayToPositionSystem = new class extends System{
    public componentsRequired: Set<ComponentClass<any>> = new Set([DisplayComponent]);
    public phase: number = TickPhase.PRESENTATION;
    public update(ecs: GatesECS, entities: Map<number, EntityData>): void {
        let pos;
        for (const e of entities) {
            for (const display of getComponentsOf(ecs, e[1], DisplayComponent)) {
                pos = ecs.getComponentData(display.positionComponent, PositionComponent);
                display.container.position.set(pos.x, pos.y);  
            }
        }
    }
};

// UTIL

export const enum TickPhase{
    EARLY_UPDATE = 0,
    UPDATE = 1,
    PHYSICS = 2,
    PRESENTATION = 3,
}

export class Scene{
    public readonly ECS: GatesECS = new GatesECS();

    constructor(public readonly APP: Application = new Application({
        resizeTo: window,
        autoDensity: true,
    })){}

    public init(): void{
        this.ECS.init();
        this.APP.ticker.add((d) => {
            this.ECS.tick(d);
        });
    }
}
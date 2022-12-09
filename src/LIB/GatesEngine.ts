import { Application, Container, Ticker, TickerCallback } from "pixi.js";
import type { ComponentClass, ComponentData, Entity, EntityData } from "./GatesECS";
import { System, GatesECS, getComponentsOf } from "./GatesECS";

// COMPONENTS

export class PositionComponent implements ComponentData{
    destroy?(): void;
    constructor(public x: number = 0, public y: number = 0){
    }
}

export class DisplayComponent implements ComponentData{
    destroy(): void {
        this.container.destroy();
    }
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

    private tickerCallback: TickerCallback<any> = (d) => {
        this.ECS.tick(d);
    };

    constructor(public readonly APP: Application){
        
    }

    public init(): void{
        this.ECS.init();
        this.APP.ticker.add(this.tickerCallback);
    }

    public destroy(): void{
        this.APP.ticker.remove(this.tickerCallback);
    }
}
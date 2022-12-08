import { Application, Assets, Container } from "pixi.js";
import { ComponentData, Entity, GatesECS } from "./GatesECS";

// COMPONENTS

export class PositionComponent implements ComponentData{
    constructor(public x: number = 0, public y: number = 0){
    }
}

export class DisplayComponent implements ComponentData{
    constructor(public readonly object: Container, public readonly positionComponent: Entity){
    }
}

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

    private resources: string[] = [];

    public addResources(...urls: string[]){
        this.resources.push(...urls);
    }

    public preLoad(): void{
        Assets.backgroundLoad(this.resources);
    }

    public init(): void{

    }
}
import { Container } from "pixi.js";
import { GatesECS,ComponentData, Entity } from "../LIB/GatesECS";

// CONSTANTS


export const PORT = 3030;


// CLASSES


export const enum TickPhase{
    EARLY_UPDATE,
    UPDATE,
    PHYSICS,
    PRESENTATION,
}


// UTIL FUNCTIONS


export function tickECS(ecs: GatesECS){
    ecs.tick(TickPhase.EARLY_UPDATE)
    ecs.tick(TickPhase.PHYSICS)
    ecs.tick(TickPhase.UPDATE)
    ecs.tick(TickPhase.PRESENTATION)
    ecs.tickDestroy();
}


// COMPONENTS


export class PositionComponent implements ComponentData{
    constructor(public x: number = 0, public y: number = 0){
    }
}

export class DisplayComponent implements ComponentData{
    constructor(public readonly object: Container, public readonly positionComponent: Entity){
    }
}


// SYSTEMS


import { Application } from "pixi.js";
import { GatesECS } from "./GatesECS";

export const enum TickPhase {
    EARLY_UPDATE = 0,
    UPDATE = 1,
    PHYSICS = 2,
    PRESENTATION = 3,
}

export abstract class Scene extends GatesECS {
    constructor(public readonly APP: Application) {
        super();
    }

}

export class SceneManager {
    private readonly scenes: Map<string, Scene> = new Map();

}
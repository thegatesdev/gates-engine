import { Application } from "pixi.js";
import { ComponentType, GatesECS } from "./GatesECS";

export const enum TickPhase {
    EARLY_UPDATE = 0,
    UPDATE = 1,
    PHYSICS = 2,
    PRESENTATION = 3,
}

export type SceneData = {
    entities: {[key: number]: number[]}
    components: {[key: number]: [string, unknown]}
}

export class GatesEngine {
    private readonly scenes: Map<string, GatesECS> = new Map();
    private readonly componentTypes: Map<String, ComponentType<unknown>> = new Map();

    public addComponentType<D extends ComponentType<unknown>>(type: D): D{
        if (this.componentTypes.has(type.id)) throw new Error("Type already exists");
        this.componentTypes.set(type.id, type);
        return type;
    }

    public loadScene(id: string, data: SceneData): string{
        if (this.scenes.has(id)) throw new Error("Scene already exists")
        const scene = new GatesECS();
        for (let key in data.components){

        }
        return id;
    }
}
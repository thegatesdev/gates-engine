// @ts-strict

import { GatesECS } from "./GatesECS";

export const enum TickPhase {
    EARLY_UPDATE = 0,
    UPDATE = 1,
    PHYSICS = 2,
    PRESENTATION = 3,
}

export type Vector = { x: number, y: number };

export abstract class SimpleSystem extends GatesECS.System {
    public onTick(ecs: GatesECS.GatesECS, deltaTime: number): void {
        for (const e of this.entities) {
            this.onEntityUpdate(ecs, e, deltaTime);
        }
    }
    protected abstract onEntityUpdate(ecs: GatesECS.GatesECS, entity: number, deltaTime: number): void;
}

export const Transform = new GatesECS.ComponentType<Vector>;
export const Velocity = new GatesECS.ComponentType<Vector>;

export class VelocitySystem extends SimpleSystem {
    protected onEntityUpdate(ecs: GatesECS.GatesECS, entity: number, deltaTime: number): void {
        const it = ecs.getComponents(entity, Transform);
        for (const vel of ecs.getComponents(entity, Velocity)) {
            if (vel.x == 0 && vel.y == 0) continue;
            for (const trs of it) {
                trs.x += vel.x;
                trs.y += vel.y;
            }
        }
    }
    public phase: number = TickPhase.PHYSICS;
    public componentTypes: GatesECS.ComponentType[] = [Velocity, Transform];
}
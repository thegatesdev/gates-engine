// @ts-strict

import { GatesECS } from "./GatesECS";

export type Vector = { x: number, y: number };

export abstract class Hitbox {
    abstract hit(other: Hitbox): boolean;
}

// Util

export const enum TickPhase {
    EARLY_UPDATE = 0,
    UPDATE = 1,
    PHYSICS = 2,
    PRESENTATION = 3,
}

export abstract class SimpleSystem extends GatesECS.System {
    public onTick(ecs: GatesECS.GatesECS, deltaTime: number): void {
        for (const e of this.entities) {
            this.onEntityUpdate(ecs, e, deltaTime);
        }
    }
    protected abstract onEntityUpdate(ecs: GatesECS.GatesECS, entity: number, deltaTime: number): void;
}

// Component

export const CTransform = new GatesECS.ComponentType<Vector>;
export const CVelocity = new GatesECS.ComponentType<Vector>;
export const CAcceleration = new GatesECS.ComponentType<{ acc: Vector, multiply: boolean }>;
export const CHitbox = new GatesECS.ComponentType<{ offset: Vector, hitbox: Hitbox }>;
export const CConstantVelocity = new GatesECS.ComponentType<Vector>;

// System

export class VelocitySystem extends SimpleSystem {
    protected onEntityUpdate(ecs: GatesECS.GatesECS, entity: number, deltaTime: number): void {
        const it = ecs.getComponents(entity, CTransform);
        for (const vel of ecs.getComponents(entity, CVelocity)) {
            if (vel.x == 0 && vel.y == 0) continue;
            for (const trs of it) {
                trs.x += vel.x;
                trs.y += vel.y;
            }
        }
    }
    public phase: number = TickPhase.PHYSICS;
    public componentTypes: GatesECS.ComponentType[] = [CVelocity, CTransform];
}
export class AccelerationSystem extends SimpleSystem {
    protected onEntityUpdate(ecs: GatesECS.GatesECS, entity: number, deltaTime: number): void {
        const it = ecs.getComponents(entity, CVelocity);
        for (const cAcc of ecs.getComponents(entity, CAcceleration)) {
            const acc = cAcc.acc;
            if (acc.x == 0 && acc.y == 0) continue;
            if (cAcc.multiply) {
                for (const vel of it) {
                    vel.x *= acc.x;
                    vel.y *= acc.y;
                }
            } else {
                for (const vel of it) {
                    vel.x += acc.x;
                    vel.y += acc.y;
                }
            }
        }
    }
    public phase: number = TickPhase.PHYSICS;
    public componentTypes: GatesECS.ComponentType[] = [CVelocity, CAcceleration];

}
export class HitboxSystem extends GatesECS.System {
    private regionSize = 20;
    private regions: number[][] = [];

    public onTick(ecs: GatesECS.GatesECS, deltaTime: number): void {

    }

    public phase: number = TickPhase.PHYSICS;
    public componentTypes: GatesECS.ComponentType[] = [CTransform, CHitbox];
}
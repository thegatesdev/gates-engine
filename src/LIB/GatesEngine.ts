// @ts-strict

import { Vector } from "vecti";
import { GatesECS } from "./GatesECS";

export type MutableVector = { x: number, y: number };

// Util

export abstract class Shape {
    abstract get vertices(): Vector[];
    abstract get edgeNormals(): Vector[];
}

export class AABBShape extends Shape {
    public readonly vertices: Vector[];
    public readonly edgeNormals: Vector[];
    constructor(xSize: number, ySize: number, xOffset: number = 0, yOffset: number = 0) {
        super();
        this.vertices = [new Vector(xOffset, yOffset), new Vector(xSize + xOffset, yOffset), new Vector(xSize + xOffset, ySize + yOffset), new Vector(xOffset, ySize + yOffset)];
        this.edgeNormals = edgeNormals(this.vertices);
    }
}

function edgeNormals(vertices: Vector[]): Vector[] {
    const normals = [];
    for (let i = 0; i < vertices.length; i++) {
        let p1 = vertices[i];
        let p2 = vertices[i + 1 == vertices.length ? 0 : i + 1];
        normals.push(new Vector(-(p2.y - p1.y), p2.x - p1.x));
    }
    return normals;
}

export function hitBoxOverlap(h1: Shape, of1: MutableVector, h2: Shape, of2: MutableVector): boolean {
    const norm1 = h1.edgeNormals;
    for (const axis of norm1) {
        let proj1 = project(h1, axis, of1);
        let proj2 = project(h2, axis, of2);
        if (!(proj1.x <= proj2.y && proj1.y >= proj2.x)) return false;
    }
    const norm2 = h2.edgeNormals;
    for (const axis of norm2) {
        let proj1 = project(h1, axis, of1);
        let proj2 = project(h2, axis, of2);
        if (!(proj1.x <= proj2.y && proj1.y >= proj2.x)) return false;
    }

    return true;
}

function project(hitbox: Shape, axis: Vector, offset: MutableVector): Vector {
    let min = axis.dot(hitbox.vertices[0].add(new Vector(offset.x, offset.y)));
    let max = min;
    for (const vert of hitbox.vertices) {
        let p = axis.dot(vert.add(new Vector(offset.x, offset.y)));
        if (p < min) min = p;
        else if (p > max) max = p;
    }
    return new Vector(min, max);
}

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

export const CTransform = new GatesECS.ComponentType<MutableVector>;
export const CVelocity = new GatesECS.ComponentType<MutableVector>;
export const CDrag = new GatesECS.ComponentType<number>;
export const CGravity = new GatesECS.ComponentType<MutableVector>;
export const CConstantVelocity = new GatesECS.ComponentType<MutableVector>;
export const CScript = new GatesECS.ComponentType<(ecs: GatesECS.GatesECS, entity: number, dt: number) => void>;
export const CHitbox = new GatesECS.ComponentType<Shape>;

// System
export class DragSystem extends SimpleSystem {
    constructor(private readonly drag: MutableVector) {
        super();
    }
    protected onEntityUpdate(ecs: GatesECS.GatesECS, entity: number): void {
        const vels = ecs.getComponents(entity, CVelocity);
        for (const drag of ecs.getComponents(entity, CDrag)) {
            for (const vel of vels) {
                vel.x *= this.drag.x / drag;
                vel.y *= this.drag.y / drag;
            }
        }
    }
    public phase: number = TickPhase.PHYSICS;
    public componentTypes: GatesECS.ComponentType[] = [CVelocity, CDrag];
}
export class GravitySystem extends SimpleSystem {
    constructor(private readonly direction: MutableVector = { x: 0, y: -1 }) {
        super();
    }
    protected onEntityUpdate(ecs: GatesECS.GatesECS, entity: number): void {
        const vels = ecs.getComponents(entity, CVelocity);
        for (const grav of ecs.getComponents(entity, CGravity)) {
            for (const vel of vels) {
                vel.x += grav.x * this.direction.x;
                vel.y += grav.y * this.direction.y;
            }
        }
    }
    public phase: number = TickPhase.PHYSICS;
    public componentTypes: GatesECS.ComponentType[] = [CGravity, CVelocity];
}
export class VelocitySystem extends SimpleSystem {
    protected onEntityUpdate(ecs: GatesECS.GatesECS, entity: number, dt: number): void {
        const it = ecs.getComponents(entity, CTransform);
        for (const vel of ecs.getComponents(entity, CVelocity)) {
            if (vel.x == 0 && vel.y == 0) continue;
            for (const trs of it) {
                trs.x += vel.x * dt;
                trs.y += vel.y * dt;
            }
        }
    }
    public phase: number = TickPhase.PHYSICS;
    public componentTypes: GatesECS.ComponentType[] = [CVelocity, CTransform];
}
export class HitboxSystem extends SimpleSystem {
    protected onEntityUpdate(ecs: GatesECS.GatesECS, entity: number, deltaTime: number): void {
        const hitboxes = ecs.getComponents(entity, CHitbox);
        const trs = ecs.getComponents(entity, CTransform)[0];
        for (const other of this.entities) {
            if (other == entity) continue;
            let otherTrs = ecs.getComponents(other, CTransform)[0];
            for (const otherHt of ecs.getComponents(other, CHitbox)) {
                for (const ht of hitboxes) {
                    if (hitBoxOverlap(ht, trs, otherHt, otherTrs)) {
                        console.log("Overlap");
                        return;
                    }
                }
            }
        }
    }

    public phase: number = TickPhase.PHYSICS;
    public componentTypes: GatesECS.ComponentType[] = [CTransform, CHitbox];
}
export class ScriptableSystem extends SimpleSystem {
    protected onEntityUpdate(ecs: GatesECS.GatesECS, entity: number, deltaTime: number): void {
        for (const scr of ecs.getComponents(entity, CScript)) {
            scr(ecs, entity, deltaTime);
        }
    }
    public phase: number = TickPhase.UPDATE;
    public componentTypes: GatesECS.ComponentType[] = [CScript];
}
// @ts-strict
import { Container, DisplayObject } from "pixi.js";
import { GatesECS } from "../LIB/GatesECS";
import { CTransform, SimpleSystem, TickPhase } from "../LIB/GatesEngine";

export class RenderSystem extends SimpleSystem {
    constructor(public readonly container: Container) {
        super();
    }
    protected onEntityUpdate(ecs: GatesECS.GatesECS, entity: number): void {
        for (const trs of ecs.getComponents(entity, CTransform)) {
            for (const render of ecs.getComponents(entity, CRender)) {
                render.x = trs.x;
                render.y = -trs.y;
            }
            break;
        }
    }
    public onMatch(ecs: GatesECS.GatesECS, entity: number): void {
        for (const render of ecs.getComponents(entity, CRender)) {
            this.container.addChild(render);
        }
    }
    public onUnmatch(ecs: GatesECS.GatesECS, entity: number, comp: number): void {
        const render = ecs.getComponent(comp, CRender);
        if (render != null) {
            this.container.removeChild(render.data);
        } else {
            for (const render of ecs.getComponents(entity, CRender)) {
                this.container.removeChild(render);
            }
        }
    }
    public phase: number = TickPhase.UPDATE;
    public componentTypes: GatesECS.ComponentType[] = [CRender, CTransform];
}


export const CRender = new GatesECS.ComponentType<DisplayObject>;

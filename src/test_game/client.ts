import { Application, Container, Graphics } from "pixi.js";
import { ComponentType, EntityData, GatesECS, System } from "../LIB/GatesECS";
import { ComponentTypes, Scene, TickPhase } from "../LIB/GatesEngine";

// COMPONENTS

const PositionComponent = ComponentTypes.add(new ComponentType<{ x: number, y: number }>("position"));
const RenderContainerComponent = ComponentTypes.add(new ComponentType<{ container: Container, positionComp: number }>("render_container"));

// SYSTEMS

class RenderToPositionSystem extends System{
    public componentsRequired: Set<ComponentType<unknown>> = new Set([PositionComponent, RenderContainerComponent]);
    public phase: number = TickPhase.PRESENTATION;
    constructor(public offset: {x: number, y: number}){
        super();
    }
    public onUpdate(ecs: GatesECS, entities: Map<number, EntityData>, deltaTime: number): void {
        throw new Error("Method not implemented.");
    }
}

// UTIL

type KeyCallback = {
    value: string,
    isUp: boolean, isDown: boolean,
    press: (() => void) | undefined;
    release: (() => void) | undefined;
    downHandler: (e: KeyboardEvent) => void;
    upHandler: (e: KeyboardEvent) => void;
    unsubscribe: () => void;
}

// INIT

const APP = new Application({
    autoDensity: true,
    resizeTo: window,
});

const mainSene = new Scene();
const cam = mainSene.addSystem(new RenderToPositionSystem({x:0,y:0})).offset;

mainSene.init();

APP.ticker.add((delta) => {
    mainSene.tick(delta);
})

const player = mainSene.entity();
const playerPos = mainSene.addComponent(player, PositionComponent.create({ x: 20, y: 50 }));
mainSene.addComponent(player, RenderContainerComponent.create({ positionComp: playerPos, container: new Graphics().beginFill(0xfff).drawRect(0, 0, 40, 30) }));
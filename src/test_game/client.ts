// @ts-strict
import { Application, Graphics } from "pixi.js";
import { GatesECS } from "../LIB/GatesECS";
import { Transform, Velocity, VelocitySystem } from "../LIB/GatesEngine";
import { Render, RenderSystem } from "./common";

const APP = new Application({
    background: 0,
    resizeTo: window,
})
const ECS = new GatesECS.GatesECS();
window.document.body.appendChild(APP.view as any);
APP.ticker.add(tick);

function tick(dt: number) {
    ECS.tick(dt);
}

// Systems

const SYS_RENDER = new RenderSystem(APP.stage).enable();

ECS.addSystems(
    SYS_RENDER,

    new VelocitySystem().enable(),
);

const testEntity = ECS.entity();
{
    ECS.addComponent(testEntity, Transform, { x: 0, y: 0 });
    ECS.addComponent(testEntity, Velocity, { x: 1, y: -1 });
    ECS.addComponent(testEntity, Render, new Graphics().beginFill(0xffffff).drawRect(0, 0, 200, 200));
}

ECS.doTick = true;
// @ts-strict
import { GameInputs } from "game-inputs";
import { Application, Graphics } from "pixi.js";
import { GatesECS } from "../LIB/GatesECS";
import { AccelerationSystem, CAcceleration, CTransform, CVelocity, VelocitySystem } from "../LIB/GatesEngine";
import { Render, RenderSystem } from "./common";

// Base

const APP = new Application({
    background: 0,
    resizeTo: window,
})
const ECS = new GatesECS.GatesECS();
window.document.body.appendChild(APP.view as any);
APP.ticker.add(tick);

// Input

const INPUT = new GameInputs(APP.view as any, {
    preventDefaults: true,
    allowContextMenu: false,
    disabled: false,
    stopPropagation: false,
});

INPUT.bind('key-up', 'KeyW', 'ArrowUp');
INPUT.bind('key-down', 'KeyS', 'ArrowDown');
INPUT.bind('key-right', 'KeyD', 'ArrowRight');
INPUT.bind('key-left', 'KeyA', 'ArrowLeft');

// Systems

const SYS_RENDER = new RenderSystem(APP.stage).enable();

ECS.addSystems(
    SYS_RENDER,

    new VelocitySystem().enable(),
    new AccelerationSystem().enable(),
);

// Init

const testEntity = ECS.entity();
ECS.addComponent(testEntity, CTransform, { x: 0, y: 0 });
const testVel = ECS.addComponent(testEntity, CVelocity, { x: 6, y: -6 });
ECS.addComponent(testEntity, CAcceleration, { acc: { x: 0, y: 0 }, multiply: false });
ECS.addComponent(testEntity, CAcceleration, { acc: { x: 0.95, y: 0.95 }, multiply: true });
ECS.addComponent(testEntity, Render, new Graphics().beginFill(0xffffff).drawRect(0, 0, 200, 200));

function tick(dt: number) {
    ECS.tick(dt);

    INPUT.tick();
}

ECS.doTick = true;
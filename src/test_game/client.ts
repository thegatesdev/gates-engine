// @ts-strict
import { GameInputs } from "game-inputs";
import { Application, Graphics } from "pixi.js";
import { GatesECS } from "../LIB/GatesECS";
import { AABBShape, CDrag, CHitbox, CScript, CTransform, CVelocity, DragSystem, GravitySystem, HitboxSystem, ScriptableSystem, VelocitySystem } from "../LIB/GatesEngine";
import { CRender, RenderSystem } from "./common";

// Base

const APP = new Application({ background: 0, resizeTo: window, });
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

ECS.addSystems(
    new RenderSystem(APP.stage).enable(),

    new VelocitySystem().enable(),
    new GravitySystem().enable(),
    new DragSystem({ x: 0.87, y: 0.87 }).enable(),
    new HitboxSystem().enable(),

    new ScriptableSystem().enable(),
);

// Loop

function tick(dt: number) {
    ECS.tick(dt);
    INPUT.tick();
}
ECS.doTick = true;

// Init

const player = ECS.entity();
const PLAYER_SPEED = 2;
ECS.addComponent(player, CTransform, { x: 0, y: 0 });
ECS.addComponent(player, CVelocity, { x: 0, y: 0 });
ECS.addComponent(player, CDrag, 1);
ECS.addComponent(player, CRender, new Graphics().beginFill(0xffffff).drawRect(0, 0, 200, 200));
ECS.addComponent(player, CHitbox, new AABBShape(200, 200));
ECS.addComponent(player, CScript, (ecs, entity) => {
    const x = INPUT.state['key-right'] ? PLAYER_SPEED : INPUT.state['key-left'] ? -PLAYER_SPEED : 0;
    const y = INPUT.state['key-up'] ? PLAYER_SPEED : INPUT.state['key-down'] ? -PLAYER_SPEED : 0;
    for (const vel of ecs.getComponents(entity, CVelocity)) {
        vel.x += x;
        vel.y += y;
    }
});

const ground = ECS.entity();
ECS.addComponent(ground, CTransform, { x: 600, y: -300 });
ECS.addComponent(ground, CRender, new Graphics().beginFill(0x123456).drawRect(0, 0, 500, 200));
ECS.addComponent(ground, CHitbox, new AABBShape(500, 200));

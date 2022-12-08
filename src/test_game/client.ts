import { Application, Graphics, Sprite, Texture } from 'pixi.js';
import { ComponentClass, EntityData, GatesECS, getComponentsOf, System } from '../LIB/GatesECS';
import { DisplayComponent, PositionComponent, tickECS, TickPhase } from './shared';

const APP = new Application({
        resizeTo: window,
        autoDensity: true,
    });
const ECS = new GatesECS();

document.body.appendChild(APP.view as any);

// COMPONENTS

// SYSTEMS

// -- Move display to position
ECS.addSystem(new class extends System{
    public componentsRequired: Set<ComponentClass<any>> = new Set([DisplayComponent]);
    public phase: number = TickPhase.PRESENTATION;
    public update(ecs: GatesECS, entities: Map<number, EntityData>): void {
        let pos;
        for (const e of entities) {
            for (const display of getComponentsOf(ecs, e[1], DisplayComponent)) {
                pos = ecs.getComponentData(display.positionComponent, PositionComponent);
                display.object.position.set(pos.x, pos.y);  
            }
        }
    }
    public complete(ecs: GatesECS, entity: number, data: EntityData): void {
        for (const display of getComponentsOf(ecs, data, DisplayComponent)) {
            APP.stage.addChild(display.object);
        }
    }
});

ECS.addSystem(new class extends System{
    public componentsRequired: Set<ComponentClass<any>> = new Set([PositionComponent]);
    public phase: number = TickPhase.PHYSICS;
    public update(ecs: GatesECS, entities: Map<number, EntityData>): void {
        for (const data of entities.values()) {
            for (const pos of getComponentsOf(ecs,data, PositionComponent)) {
                pos.x++;
                pos.y++;
            }
        }
    }
    
});

// INIT
ECS.init();
APP.ticker.add(() => {
    tickECS(ECS);
}, this)

const bunnyTex = Texture.from("./assets/bunny.jpg");

// ---
const player = ECS.entity();
const playerPos = ECS.addComponent(player, new PositionComponent(0,0));
ECS.addComponent(player, new DisplayComponent(new Sprite(bunnyTex), playerPos));
ECS.addComponent(player, new DisplayComponent(new Graphics().beginFill(0xffff).drawRect(50,50,140,20), playerPos))
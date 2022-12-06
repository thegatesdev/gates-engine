import { Application, Container, Graphics } from 'pixi.js';
import { ComponentClass, ComponentData, EntitySet, GatesECS, System } from '../LIB/GatesECS';

const APP = new Application(
    {
        resizeTo: window,
        autoDensity: true,
    }
    );
const ECS = new GatesECS();

document.body.appendChild(APP.view as any);

const enum TickPhase{
    EARLY_UPDATE,
    UPDATE,
    PHYSICS,
    PRESENTATION,
}

// COMPONENTS

class DisplayComponent implements ComponentData{
    constructor(public readonly object: Container, public readonly pos: PositionComponent){
        APP.stage.addChild(object);
    }
}

class PositionComponent implements ComponentData{
    constructor(public x: number = 0, public y: number = 0) {
    }
}

// SYSTEMS

// -- Move display to position
ECS.addSystem(new class extends System{
    public componentsRequired: Set<ComponentClass<any>> = new Set([PositionComponent, DisplayComponent]);
    public phase: number = TickPhase.PRESENTATION;
    public update(engine: GatesECS, entities: EntitySet): void {
        let display: DisplayComponent;
        // entities.forEach((ec) => {
        //     ec.get(DisplayComponent).forEach(dn => {
        //         display = engine.getComponent(dn, DisplayComponent);
        //         if (display.object.position._x != display.pos.x || display.object.position._y != display.pos.y){
        //             display.object.position.set(display.pos.x, display.pos.y);
        //         }
        //     });
        // })
    }
});

ECS.addSystem(new class extends System{
    public componentsRequired: Set<ComponentClass<any>> = new Set([PositionComponent]);
    public phase: number = TickPhase.PHYSICS;
    public update(engine: GatesECS, entities: EntitySet): void {
        let pos: PositionComponent;
        // entities.forEach((ec) => {
        //     ec.get(PositionComponent).forEach(pn => {
        //         pos = engine.getComponent(pn, PositionComponent);
        //         pos.x++;
        //         pos.y++;
        //     });
        // })
    }
});

// INIT
ECS.init();
APP.ticker.add(() => {
    ECS.tick(TickPhase.EARLY_UPDATE)
    ECS.tick(TickPhase.PHYSICS)
    ECS.tick(TickPhase.UPDATE)
    ECS.tick(TickPhase.PRESENTATION)
    ECS.tickDestroy();
}, this)


// ---
const player = ECS.entity();
const playerPos = ECS.addComponent(player, new PositionComponent(50,50));
ECS.addComponent(player, new DisplayComponent(new Graphics().beginFill(0xffff).drawRect(0,0,50,50), ECS.getComponent(playerPos)))
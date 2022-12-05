import { Application, Container, DisplayObject, Graphics, GraphicsGeometry } from 'pixi.js';
import { ComponentClass, ComponentData, EntitySet, GatesECS, System } from '../lib/GatesECS';

const APP = new Application({width: 1800, height: 1000});
const ECS = new GatesECS();

document.body.appendChild(APP.view as any);

const enum TickPhase{
    EARLY_UPDATE,
    UPDATE,
    PHYSICS,
    PRESENTATION,
}

// COMPONENTS

class DisplayComponent extends ComponentData{
    constructor(public readonly object: Container){
        super();
        APP.stage.addChild(object);
    }
    destroy(): void {
        this.object.destroy();
    }
}

class PositionComponent extends ComponentData{
    constructor(public readonly position: {x:number, y:number} = {x:0,y:0}) {
        super();
    }
}

// SYSTEMS

ECS.addSystem(new class extends System{
    public componentsRequired: Set<ComponentClass<any>> = new Set([PositionComponent, DisplayComponent]);
    public phase: number = TickPhase.PRESENTATION;
    public update(engine: GatesECS, entities: EntitySet): void {
        entities.forEach((ec) => {
            // Add position component ref to displaycomp.
        })
    }
});

// INIT
ECS.init();
APP.ticker.add(() => {
    ECS.tick(TickPhase.EARLY_UPDATE)
    ECS.tick(TickPhase.UPDATE)
    ECS.tick(TickPhase.PHYSICS)
    ECS.tick(TickPhase.PRESENTATION)
    ECS.tickDestroy();
}, this)


// ---
const player = ECS.entity();
ECS.addComponent(player, new DisplayComponent(new Graphics().beginFill(0xffff).drawRect(0,0,50,50)))
ECS.addComponent(player, new PositionComponent());
ECS.getComponent(player, )
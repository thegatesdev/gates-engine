import { Application, DisplayObject, Graphics, GraphicsGeometry } from 'pixi.js';
import { ComponentData, GatesECS } from '../lib/GatesECS';

const APP = new Application({width: 1800, height: 1000});
const ECS = new GatesECS();

document.body.appendChild(APP.view as any);

const enum TickPhase{
    EARLY_UPDATE,
    UPDATE,
    PHYSICS,
    PRESENTATION,
}

class DisplayComponent extends ComponentData{
    constructor(public readonly object: DisplayObject){
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
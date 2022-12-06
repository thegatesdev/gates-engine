import { Application, Container, DisplayObject, Graphics, GraphicsGeometry } from 'pixi.js';
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

class DisplayComponent extends ComponentData{
    constructor(public readonly object: Container, public readonly pos: PositionComponent){
        super();
        APP.stage.addChild(object);
    }
    destroy(): void {
        this.object.destroy();
    }
}

class PositionComponent extends ComponentData{
    constructor(public readonly x: number = 0, public readonly y: number = 0) {
        super();
    }
}

// SYSTEMS

ECS.addSystem(new class extends System{
    public componentsRequired: Set<ComponentClass<any>> = new Set([PositionComponent, DisplayComponent]);
    public phase: number = TickPhase.PRESENTATION;
    public update(engine: GatesECS, entities: EntitySet): void {
        entities.forEach((ec) => {
            ec.get(DisplayComponent).forEach(dn => {
                let d = engine.getComponent(dn, DisplayComponent);
                d.object.position.set(d.pos.x, d.pos.y);
            });
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
//ECS.addComponent(player, new PositionComponent());
//ECS.addComponent(player, new DisplayComponent(new Graphics().beginFill(0xffff).drawRect(0,0,50,50), ))
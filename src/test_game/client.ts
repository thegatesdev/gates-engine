import { Application, Graphics, Sprite, Texture } from 'pixi.js';

import { GatesECS } from '../LIB/GatesECS';
import { DisplayComponent, DisplayToPositionSystem, PositionComponent } from '../LIB/GatesEngine';

const APP = new Application({
        resizeTo: window,
        autoDensity: true,
    });
const ECS = new GatesECS();

document.body.appendChild(APP.view as any);

// SYSTEMS

ECS.addSystem(DisplayToPositionSystem);

// INIT


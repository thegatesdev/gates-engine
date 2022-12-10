import { Application } from "pixi.js";
import { ComponentType, GatesECS } from "../LIB/GatesECS";


const APP = new Application({
    resizeTo: window,
    autoDensity: true,
});

const ECS = new GatesECS();
const PositionComponent = new ComponentType<{x:number, y:number}>("position");

const entity1 = ECS.entity();
ECS.addComponent(entity1, PositionComponent.create({x:3,y:4}));
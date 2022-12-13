// @ts-strict

import { Container, Graphics } from "pixi.js";
import { ComponentType } from "../LIB/GatesECS";
import { ComponentTypes, Scene } from "../LIB/GatesEngine";

const PositionComponent = ComponentTypes.add(new ComponentType<{ x: number, y: number }>("position"));
const RenderContainerComponent = ComponentTypes.add(new ComponentType<{ container: Container, positionComp: number }>("render_container"));

const mainSene = new Scene();

const player = mainSene.entity();
const playerPos = mainSene.addComponent(player, PositionComponent.create({ x: 20, y: 50 }));
mainSene.addComponent(player, RenderContainerComponent.create({ positionComp: playerPos, container: new Graphics().beginFill(0xfff).drawRect(0, 0, 40, 30) }));
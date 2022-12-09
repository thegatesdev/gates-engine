import { Application } from "pixi.js";
import { Scene } from "../LIB/GatesEngine";


const APP = new Application({
    resizeTo: window,
    autoDensity: true,
});


const SCENE1 = new Scene(APP);
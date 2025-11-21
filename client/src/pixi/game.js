import { Application, Graphics } from "pixi.js";

let app = null;

export function initPixi(canvas) {
    if (app) {
        app.destroy(true); // hot reload safe
    }

    app = new Application({
        view: canvas,
        background: "#000000",
        resizeTo: window
    });

    // Exemple : un carré rouge (à remplacer plus tard)
    const box = new Graphics();
    box.beginFill("red");
    box.drawRect(0, 0, 100, 100);
    box.endFill();
    box.x = 100;
    box.y = 100;

    app.stage.addChild(box);

    console.log("Pixi ready!");
}

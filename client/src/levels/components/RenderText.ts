import { Control, TextBlock } from "@babylonjs/gui/2D";

import FullScreenUI from "../../ui/FullScreenUI";

export default class RenderText {
    public text: string;
    private ui: FullScreenUI;
    private textBlock: TextBlock;

    constructor(ui: FullScreenUI) {
        this.ui = ui;
        this.show();
    }

    public set(text: string) {
        this.textBlock.text = text;
    }

    private show() {
        const adt = this.ui.advancedTexture;

         // popup text
         this.textBlock = new TextBlock("textBlock");
         this.textBlock.color = "white";
         this.textBlock.fontSize = 32;
         this.textBlock.widthInPixels = 200;
         this.textBlock.heightInPixels = 100;
         this.textBlock.fontFamily = "Helvetica";
         this.textBlock.text = "0 0";
         this.textBlock.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
         this.textBlock.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
         adt.addControl(this.textBlock);
    }
}

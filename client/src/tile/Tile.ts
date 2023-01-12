import {Vector3, Matrix} from "@babylonjs/core/Maths/math.vector";
import {Axis} from "@babylonjs/core/Maths/math.axis"

import { Color4 } from "@babylonjs/core/Maths/math.color";
import { ExecuteCodeAction } from "@babylonjs/core/";
import { ActionManager } from "@babylonjs/core/";
import { HighlightLayer } from "@babylonjs/core/";

import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";

import Level from "../levels/Level";

// configurables
const TILE_SIZE = 4;

export default class Tile {
    public x: number;
    public y: number;
    public z: number;
    public level: Level;
    private mesh: Mesh;

    constructor(level: Level, x: number, z: number) {
        this.level = level;
        this.x = x;
        this.y = 1;
        this.z = z;
    }

    public async build() {
        this.mesh = MeshBuilder.CreatePlane("tile", {height: TILE_SIZE, width: TILE_SIZE}, this.level.scene);
        this.mesh.position.x = this.x * TILE_SIZE;
        this.mesh.position.y = this.y;
        this.mesh.position.z = this.z * TILE_SIZE;
        this.mesh.rotation.y = Math.PI * 0.5;
        this.mesh.rotation.x = Math.PI * 0.5;
        this.mesh.isPickable = true;

        let scene = this.level.scene;

        this.mesh.enableEdgesRendering();
        this.mesh.edgesColor = new Color4(1, 0, 0, 1);
        this.mesh.edgesWidth = 0;

        this.mesh.actionManager = new ActionManager(scene);
        let mesh = this.mesh;
        
        //ON MOUSE ENTER
        this.mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, function(ev){   
            mesh.edgesWidth = 20;
        }));
        
        //ON MOUSE EXIT
        this.mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, function(ev){
            mesh.edgesWidth = 0;
        }));
    }
}

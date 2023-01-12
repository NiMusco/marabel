import { Scene } from "@babylonjs/core/scene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures";
import { CubeTexture } from "@babylonjs/core/Materials/Textures/cubeTexture";
import "@babylonjs/loaders";
import "@babylonjs/inspector";

import Tile from "../tile/Tile";
import Player from "../player/Player";
import FullScreenUI from "../ui/FullScreenUI";
import GoalMesh from "./components/GoalMesh";
import OtherPlayer from "../player/OtherPlayer";
import Game from "../Game";
import Config from "../Config";
import { PlayerSchema } from "../networking/schema/PlayerSchema";
import Timer from "./components/Timer";
import Spawn from "./components/Spawn";

import { DynamicTerrain } from "../dynamicTerrain/babylon.dynamicTerrain_modular";

import AudioManager from "./AudioManager";
import { SubMesh, ShadowGenerator } from "@babylonjs/core";

export default class Level {
    public scene: Scene;
    public player: Player;
    public ui: FullScreenUI;
    public audioManager: AudioManager;
    public spawn: Spawn;
    public goal: GoalMesh;
    public otherPlayersMap: Map<string, OtherPlayer>;
    //public startLevelTimer: Timer;
    public checkPointLimit: number;
    //public coordsText: RenderText;

    private isFrozen: boolean
    private fileName: string;

    constructor(fileName: string) {
        this.initializeScene();
        this.setupListeners();

        this.isFrozen = false;
        this.fileName = fileName;
        this.otherPlayersMap = new Map;
        this.checkPointLimit = 5; // how many checkpoints can the player make per level
        this.player = new Player(this);
        this.audioManager = new AudioManager(this.scene);
    }

    private initializeScene() {
        this.scene = new Scene(Game.engine);
        this.scene.collisionsEnabled = true;
        if (Config.showInspector) {
            this.scene.debugLayer.show();
        }
    }

    public async build() {
        //await this.importLevel();
        await Promise.all([this.player.build(), this.audioManager.loadAudio()]);

        this.ui = new FullScreenUI();

        this.buildDynamicTerrain();
    }

    private buildDynamicTerrain()
    {
        var scene = this.scene;
        var mapSubX = 100;             // point number on X axis
        var mapSubZ = 100;              // point number on Z axis
        var seed = 0.3;                 // seed
        var elevationScale = 6.0;
        var mapData = new Float32Array(mapSubX * mapSubZ * 3); // 3 float values per point : x, y and z

        var paths = [];                             // array for the ribbon model
        for (var l = 0; l < mapSubZ; l++) {
            var path = [];                          // only for the ribbon
            for (var w = 0; w < mapSubX; w++) {
                var x = (w - mapSubX * 0.5) * 2.0;
                var z = (l - mapSubZ * 0.5) * 2.0;
                var y = 0;
                y *= (0.5 + y) * y * elevationScale;   // let's increase a bit the noise computed altitude
                        
                mapData[3 *(l * mapSubX + w)] = x;
                mapData[3 * (l * mapSubX + w) + 1] = y;
                mapData[3 * (l * mapSubX + w) + 2] = z;
                
                path.push(new Vector3(x, y, z));
            }
            paths.push(path);
        }

        var map = MeshBuilder.CreateRibbon("m", {pathArray: paths, sideOrientation: 2}, scene);
        map.position.y = -1.0;
        var mapMaterial = new StandardMaterial("mm", scene);
        mapMaterial.wireframe = false;
        mapMaterial.alpha = 0.5;
        map.material = mapMaterial;

        // wait for dynamic terrain extension to be loaded
        // Dynamic Terrain
        // ===============
        var terrainSub = 50;               // 100 terrain subdivisions
        var params = {
            mapData: mapData,               // data map declaration : what data to use ?
            mapSubX: mapSubX,               // how are these data stored by rows and columns
            mapSubZ: mapSubZ,
            terrainSub: terrainSub          // how many terrain subdivisions wanted
        }
        var terrain = new DynamicTerrain("t", params, <any>scene);
        var terrainMaterial = new StandardMaterial("tm", scene);
        terrainMaterial.diffuseColor = Color3.Green();
        //terrainMaterial.alpha = 0.8;
        terrainMaterial.wireframe = true;
        terrain.mesh.material = <any>terrainMaterial;

    }

    public renderChunk(chunk: any)
    {
        console.log("--renderChunk");

        var $this = this;

        var CHUNK_SIZE = 10;
        var mat = chunk.tiles;

        for(var i = 0; i < CHUNK_SIZE; i++) {
            for(var j = 0; j < CHUNK_SIZE; j++) {
                var rawTile = chunk.tiles[i][j];
                var tile = new Tile($this,i,j);
                tile.build();
            }
        }
    }

    public setCoords(coords: string){
        //this.coordsText.set(coords);
    }

    private async importLevel() {
        await SceneLoader.AppendAsync("assets/scenes/", this.fileName, this.scene);
        this.applyModifiers();
    }

    private applyModifiers() {

        var light = new DirectionalLight("DirectionalLight", new Vector3(0, -1, 0), this.scene);

        light.position = new Vector3(0, 3, 5);
        light.shadowMinZ = 2;
        light.shadowMaxZ = 16;
        light.intensity = 2;

        var shadowGenerator = new ShadowGenerator(1024, light);
        shadowGenerator.useContactHardeningShadow = false;
        shadowGenerator.contactHardeningLightSizeUVRatio = 0.1;

        this.scene.meshes.forEach(mesh => {
            // set colliders and whether we can pick mesh with raycast
            const isCollider = mesh.name.includes("Collider");
            mesh.checkCollisions = isCollider;
            mesh.isPickable = isCollider;
        });


        // If no lightning is added from blender add it manually
        /*if (this.scene.lights.length == 0) {
            this.setupLighting();
        } else {   
        }*/

        this.setupSpawn();
        //this.setupGoal();
    }

    private setupSpawn() {

        const TILE_SIZE = 4;

        let x = 20;
        let y = 10;
        let z = 20;
        let spawnPos = new Vector3(x * TILE_SIZE, y, z * TILE_SIZE)
        this.spawn = new Spawn(spawnPos, spawnPos);
    }

    // todo - verify that there is only a single goal mesh
    private setupGoal() {
        const goalMesh = this.scene.getMeshByID("Goal");
        if (goalMesh == null) {
            //throw new Error("No mesh in scene with a 'Goal' ID!");
        }
        this.goal = new GoalMesh(this, goalMesh);
    }

    private setupLighting() {
        // setup light
        //new HemisphericLight("HemiLight", new Vector3(0, 1, 0), this.scene);
    }

    // called after finishing level
    public setFrozen(frozen: boolean) {
        // player can no longer move if frozen
        this.isFrozen = frozen;
        /*this.startLevelTimer.setPaused(frozen);
        if (frozen) {
            this.exitPointerLock();
        }*/
    }

    public async addNewOtherPlayer(playerSchema: PlayerSchema) {
        const otherPlayer = new OtherPlayer(playerSchema.sessionId, this);
        await otherPlayer.build();
        otherPlayer.update(playerSchema);
        this.otherPlayersMap.set(playerSchema.sessionId, otherPlayer);
    }

    public removeOtherPlayer(playerSchema: PlayerSchema) {
        this.otherPlayersMap.get(playerSchema.sessionId).dispose();
        this.otherPlayersMap.delete(playerSchema.sessionId);
    }

    public updateOtherPlayer(playerSchema: PlayerSchema) {
        const otherPlayer = this.otherPlayersMap.get(playerSchema.sessionId);
        if(otherPlayer) {
            otherPlayer.update(playerSchema);
        }
    }

    public update() {
        this.scene.render();
    }

    public restart() {
        this.player.respawn();
        //this.startLevelTimer.restart();
    }

    private setupListeners() {
        // Lock cursor
        Game.canvas.addEventListener("click", () => {
            if (!this.isFrozen) {
                this.requestPointerLock();
            }
        }, false);

        // update function for level components
        this.scene.registerBeforeRender(() => {
            if (!this.isFrozen) {
                this.player.update();
                //this.goal.update();
            }
        });
    }

    private requestPointerLock() {
        if (Game.canvas.requestPointerLock) {
            Game.canvas.requestPointerLock();
        }
    }

    private exitPointerLock() {
        document.exitPointerLock();
    }
}

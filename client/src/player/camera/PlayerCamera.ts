import { Scene } from "@babylonjs/core/scene";
import {ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import {UniversalCamera} from "@babylonjs/core/Cameras/universalCamera";
import { Viewport } from "@babylonjs/core/Maths/math.viewport";

import Game from "../../Game";
import AbstractPlayer from "../AbstractPlayer";
import Player from "../Player"

// Camera y-position offsets (depends on player scale and stand/crouch)
const CAMERA_STAND_OFFSET = 0.35 * AbstractPlayer.HEIGHT; // half of height would place cam at top of mesh
const CAMERA_CROUCH_OFFSET = CAMERA_STAND_OFFSET * AbstractPlayer.CROUCH_Y_SCALING;

// Configuration for ArcRotateCamera
const THIRD_PERSON_ALPHA_OFFSET = 0.5 * Math.PI;
const THIRD_PERSON_BETA_OFFSET = 0.2 * Math.PI;

enum Perspective {
    FIRST_PERSON,
    THIRD_PERSON
}

export default class PlayerCamera {
    private firstPersonCamera: UniversalCamera;
    private thirdPersonCamera: ArcRotateCamera;
    private scene: Scene;
    private player: Player;
    private cameraOffset: number; // y-axis camera offset, changes when crouching
    private currentPerspective: Perspective;

    constructor(player: Player){
        this.player = player;
        this.scene = this.player.level.scene;
        this.cameraOffset = CAMERA_STAND_OFFSET;

        this.setupFirstPersonCamera();
        this.setupThirdPersonCamera();
        this.selectFirstPerson();

        this.reset();
    }

    // firstperson camera is the default camera that we use to change the rotation of the player mesh
    public get(): UniversalCamera {
        return this.firstPersonCamera;
    }

    private setupFirstPersonCamera() {
        this.firstPersonCamera = new UniversalCamera("playerfirstperson", this.player.getPosition().clone(), this.player.level.scene);
        this.firstPersonCamera.attachControl(Game.canvas, true);
        this.firstPersonCamera.inertia = 0.1;
        this.firstPersonCamera.angularSensibility = 800;
        this.firstPersonCamera.checkCollisions = false;
        this.scene.activeCameras.push(this.firstPersonCamera);
        this.firstPersonCamera.speed = 0;
    }

    private setupThirdPersonCamera() {
        const alpha = -0.5 * Math.PI;
        const beta = 0.5 * Math.PI;
        const distance = 60;
        this.thirdPersonCamera = new ArcRotateCamera("playerthirdperson", alpha, beta, distance, this.player.getPosition().clone(), this.scene);
        const cam = this.thirdPersonCamera;
        this.scene.activeCameras.push(cam);

        cam.inertia = 0.1;
        cam.checkCollisions = false;
        cam.setTarget(this.player.mesh.get());
    }

    public selectFirstPerson() {
        if (this.currentPerspective != Perspective.FIRST_PERSON) {
            this.currentPerspective = Perspective.FIRST_PERSON;
            this.firstPersonCamera.viewport = new Viewport(0, 0, 1, 1);
            this.thirdPersonCamera.viewport = new Viewport(0, 0, 0, 0);
            this.scene.cameraToUseForPointers = this.firstPersonCamera;

            this.player.setVisible(false);
        }
    }

    public selectThirdPerson() {
        if (this.currentPerspective != Perspective.THIRD_PERSON) {
            this.currentPerspective = Perspective.THIRD_PERSON;
            this.firstPersonCamera.viewport = new Viewport(0, 0, 0, 0);
            this.thirdPersonCamera.viewport = new Viewport(0, 0, 1, 1);
            this.scene.cameraToUseForPointers = this.thirdPersonCamera;

            this.player.setVisible(true);
        }
    }

    public reset() {
        this.resetFirstPersonCamera();
        this.resetThirdPersonCamera();
    }

    private resetFirstPersonCamera() {
        // set target to view direction
        this.firstPersonCamera.position = this.player.getPosition().clone();
        //this.firstPersonCamera.setTarget(this.player.spawn.lookAt.clone());
    }

    private resetThirdPersonCamera() {
        this.thirdPersonCamera.setTarget(this.player.mesh.get());
        this.thirdPersonCamera.radius = 45;
    }

    public update() {
        // set camera position equal to mesh position
        // also increase height of camera to match top of cylinder
        const pos = this.player.mesh.get().position;
        this.firstPersonCamera.position.set(pos.x, pos.y + this.cameraOffset, pos.z);

        this.thirdPersonCamera.alpha = THIRD_PERSON_ALPHA_OFFSET - this.firstPersonCamera.rotation.y;
        this.thirdPersonCamera.beta = THIRD_PERSON_BETA_OFFSET;
    }

    public setCrouch(doCrouch: boolean) {
        // adjust camera offset accordingly
        this.cameraOffset = (doCrouch) ? CAMERA_CROUCH_OFFSET : CAMERA_STAND_OFFSET;
        this.resetThirdPersonCamera();
    }
}

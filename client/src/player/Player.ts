import {Vector3, Matrix} from "@babylonjs/core/Maths/math.vector";
import {Axis} from "@babylonjs/core/Maths/math.axis"

import Controls, { IKeys } from "./PlayerControls";
import PlayerCamera from "./camera/PlayerCamera";
import Config from "../Config";
import AbstractPlayer, { MoveDirection } from "./AbstractPlayer";
import Spawn from "../levels/components/Spawn";
import Level from "../levels/Level";
import CheckPoint from "../levels/components/CheckPoint";
import AudioManager from "../levels/AudioManager";

// configurables
const SPEED_DEFAULT = 0.7;
const SPEED_CROUCH = SPEED_DEFAULT * 0.5;
const SPEED_JUMP = 0.4;
const GRAVITY = 0.016;
const GRAVITY_LIMIT = - (5 * SPEED_JUMP);

export default class Player extends AbstractPlayer {
    public spawn: Spawn;
    public controls: Controls;
    public camera: PlayerCamera;
    public hSpeed: number;
    public vSpeed: number;
    public facing: number; //angle char is facing
    public x: number;
    public y: number;
    public z: number;

    // locks are used to prevent user from spamming the key by holding it
    private jumpingLock: boolean;
    private checkPointLock: boolean;
    private gotoCheckPointLock: boolean;
    private restartLock: boolean;
    private checkPoint: CheckPoint;
    private audioManager: AudioManager;
    private prevOnGroundDir: MoveDirection; // used to make player move same direction when jumping/falling

    constructor(level: Level) {
        super(level, false);
        this.hSpeed = 0;
        this.vSpeed = 0;
        this.prevOnGroundDir = MoveDirection.IDLE;
        this.controls = new Controls();
        this.facing = Math.PI; //south
        this.x = 20 * 4;
        this.y = 1;
        this.z = 20 * 4;
    }

    public async build() {
        await super.build();
        this.spawn = this.level.spawn;
        this.camera = new PlayerCamera(this);
        this.checkPoint = new CheckPoint(this);
        this.audioManager = this.level.audioManager;
        this.audioManager.playCity(true);
    }

    public respawn() {
        super.respawn();
        this.hSpeed = 0;
        this.vSpeed = 0;
        this.prevOnGroundDir = MoveDirection.IDLE;
        this.camera.reset();
        this.checkPoint = new CheckPoint(this);
    }

    public setVisible(visible: boolean) {
        this.standMesh.setVisible(visible);
        this.crouchMesh.setVisible(visible);
    }

    public update() {
        // mesh.update casts new rays for collision detection (ground and ceiling)
        this.mesh.update();
        // define constants to be used below
        const keys = this.controls.keys;
        const deltaTime = this.level.scene.getAnimationRatio();
        const canStand = this.canStand();
        const onGround = this.mesh.isOnGround();
        const onCeiling = this.mesh.isOnCeiling();
        const moveDirection = this.getMoveDirection(keys);

        this.handlePlayerMovement(keys, deltaTime, canStand, onGround, onCeiling, moveDirection);

        // handle checkpoint keys
        if (keys.checkpoint && !this.checkPointLock) {
            this.checkPoint.save(onGround);
        }
        this.checkPointLock = keys.checkpoint;
        if (keys.gotoCheckpoint && !this.gotoCheckPointLock) {
            this.checkPoint.load();
        }
        this.gotoCheckPointLock = keys.gotoCheckpoint;

        // handle restart key
        if (keys.restart && !this.restartLock) {
            this.level.restart();
        }
        this.restartLock = keys.restart;

        // handle camera keys
        if (keys.selectFirstPersonCamera) {
            this.camera.selectFirstPerson();
        } else if (keys.selectThirdPersonCamera) {
            this.camera.selectThirdPerson();
        }

        // update animations
        this.mesh.animator.update(moveDirection, onGround);

        // play sounds based on movement
        this.updatePlayerSounds(onGround, moveDirection);

        // update camera position and rotation
        this.camera.update();

        // update collision-mesh position, if enabled
        if (Config.debugPlayer) {
            this.mesh.ellipsoidMesh.position = 
                this.mesh.get().position.add(this.mesh.get().ellipsoidOffset);        
        }
    }

    private handlePlayerMovement(keys: IKeys, deltaTime: number, canStand: boolean, onGround: boolean, onCeiling: boolean, moveDirection: MoveDirection) {
        switch (moveDirection) {
            case MoveDirection.UP:
                this.facing = 0;
            break;

            case MoveDirection.RIGHT:
                this.facing = Math.PI * 0.5;
            break;

            case MoveDirection.DOWN:
                this.facing = Math.PI;
            break;

            case MoveDirection.LEFT:
                this.facing = Math.PI * 1.5;
            break;
        }

        this.mesh.get().rotation.y = this.facing;

        const moveVector = Vector3.Zero();
        this.setHorizontalMovement(moveVector, moveDirection, onGround);
        this.setVerticalMovement(moveVector, onGround, canStand, onCeiling, deltaTime, keys);

        // change mesh height if crouching
        if (keys.crouch != this.crouching) {
            this.crouch(keys.crouch, onGround, canStand);
        }

        // perform the movement
        this.mesh.get().moveWithCollisions(moveVector);

        //const TILE_SIZE = 4;
        //this.mesh.get().position = new Vector3(this.x * TILE_SIZE, 4, this.z * TILE_SIZE);
    }

    private setHorizontalMovement(moveVector: Vector3, currMoveDir: MoveDirection, onGround: boolean) {

        let moveDir;
        if (onGround) {
            moveDir = currMoveDir;
            this.prevOnGroundDir = currMoveDir;
        } else {
            moveDir = this.prevOnGroundDir;
        }

        const currentV = new Vector3(this.x, this.y, this.z);
        const temp = this.getMoveVectorFromMoveDir(moveDir);
        moveVector.set(temp.x, temp.y, temp.z);

        this.level.setCoords(temp.x + " / " + temp.z);

        // set hSpeed according to crouch
        if (this.crouching) {
            this.hSpeed = SPEED_CROUCH;
        } else {
            this.hSpeed = SPEED_DEFAULT;
        }

        // change to local space
        //was const m = Matrix.RotationAxis(Axis.Y, this.mesh.get().rotation.y);
        const m = Matrix.RotationAxis(Axis.Y, 0); 
        Vector3.TransformCoordinatesToRef(moveVector, m, moveVector);

        // Ensure diagonal is not faster than straight
        moveVector.normalize().scaleInPlace(this.hSpeed);
    }

    private setVerticalMovement(moveVector: Vector3, onGround: boolean, canStand: boolean, onCeiling: boolean, deltaTime: number, keys: IKeys) {
        if (onGround && this.vSpeed <= 0) { // don't trigger if moving upwards
            // landing
            if (this.vSpeed < 0) {
                this.vSpeed = 0;
            }
            // change vertical speed if jumping
            if (keys.jump && !this.jumpingLock && canStand) {
                this.vSpeed = SPEED_JUMP;
                this.audioManager.playJump(true);
            }
            this.jumpingLock = keys.jump;

        } else { // not on ground
            if (onCeiling && this.vSpeed >= 0) { // don't trigger if falling
                this.vSpeed = 0;
            }
            // apply gravity (multiply with deltaTime cause it's an acceleration)
            this.vSpeed -= (GRAVITY * deltaTime);
            // clamp vSpeed
            if (this.vSpeed < (GRAVITY_LIMIT)) {
                this.vSpeed = GRAVITY_LIMIT;
            }
            moveVector.y = this.vSpeed;
            // scale movement with delta time
            moveVector.scaleInPlace(deltaTime);
        }
    }

    private getMoveVectorFromMoveDir(moveDir: MoveDirection): Vector3 {
        switch (moveDir) {
            case MoveDirection.UP:
                return new Vector3(0, 0, 1);
            break;

            case MoveDirection.RIGHT:
                return new Vector3(1, 0, 0);
            break;

            case MoveDirection.DOWN:
                return new Vector3(0, 0, -1);
            break;

            case MoveDirection.LEFT:
                return new Vector3(-1, 0, 0);
            break;
        }
        return Vector3.Zero();
    }

    private updatePlayerSounds(onGround: boolean, moveDirection: MoveDirection) {
        const isRunning = this.isRunning(onGround, moveDirection);
        const isCrouchWalking = this.isCrouchWalking(onGround, moveDirection);
        this.audioManager.playRun(isRunning && !isCrouchWalking);
        this.audioManager.playCrouchWalk(!isRunning && isCrouchWalking);
    }

    private isRunning(isOnGround: boolean, moveDirection: MoveDirection) {
        if (this.crouching || !isOnGround) {
            return false;
        }
        return moveDirection != MoveDirection.IDLE;
    }

    private isCrouchWalking(isOnGround: boolean, moveDirection: MoveDirection) {
        if (!this.crouching || !isOnGround) {
            return false;
        }
        return moveDirection != MoveDirection.IDLE;
    }

    private canStand(): boolean {
        if (!this.crouching)
            return true;
        const offset = AbstractPlayer.CROUCH_Y_SCALING * AbstractPlayer.HEIGHT;
        return !this.mesh.isOnCeiling(offset);
    }

    private crouch(doCrouch: boolean, onGround: boolean, canStand: boolean) {
        if (this.crouching == doCrouch) {
            return;
        }
        if (!doCrouch && onGround && !canStand) { // standing up would place us inside a mesh
            return;
        }
        this.crouching = doCrouch;
        this.switchMesh(doCrouch);

        // adjust mesh position, which depends on whether we are on the ground
        // we want mesh height to change top-down if standing on the ground and bottom-up if airborne
        let changeY = AbstractPlayer.HEIGHT * (1 - AbstractPlayer.CROUCH_Y_SCALING) * 0.5;
        if (onGround == doCrouch) {
            changeY = -changeY;
        }
        this.mesh.get().position.y += changeY;

        // if we stand up just before hitting the ground, the mesh will be stuck in ground
        // we fix this by doing a new onGround raycast and reset vertical position
        if (!doCrouch && !onGround) { // this is only an issue when we are not already on the ground
            this.mesh.setToGroundLevel();
        }

        this.camera.setCrouch(doCrouch);
    }

    public getPosition(): Vector3 {
        return this.mesh.get().position;
    }

    public getDirection(): Vector3 {
        return this.mesh.get().rotation;
    }
}

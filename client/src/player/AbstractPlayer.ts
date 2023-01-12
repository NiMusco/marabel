import Level from "../levels/Level";
import { IMoveKeys } from "./PlayerControls";
import PlayerMesh from "./PlayerMesh";

export enum MoveDirection {
    UP,
    RIGHT,
    DOWN,
    LEFT,
    IDLE
};

export default abstract class AbstractPlayer {
    public static readonly HEIGHT = 8;
    public static readonly DIAMETER = 4; // of cylinder
    public static readonly CROUCH_Y_SCALING = 0.65;

    public level: Level;
    public mesh: PlayerMesh;
    public crouching: boolean;

    protected standMesh: PlayerMesh;
    protected crouchMesh: PlayerMesh;

    constructor(level: Level, isOtherPlayer: boolean) {
        this.level = level;

        const modelScaling = 4.5;
        const standAnimSpeedRatio = 1;
        const crouchAnimSpeedRatio = 1.3;
        this.standMesh = new PlayerMesh("playerStand", "stand.glb",
            AbstractPlayer.HEIGHT, AbstractPlayer.DIAMETER, modelScaling, standAnimSpeedRatio, this.level.scene, isOtherPlayer);
        this.crouchMesh = new PlayerMesh("playerCrouch", "crouch.glb",
            AbstractPlayer.HEIGHT * AbstractPlayer.CROUCH_Y_SCALING, AbstractPlayer.DIAMETER, modelScaling, crouchAnimSpeedRatio, this.level.scene, isOtherPlayer);
    }

    public async build() {
        await Promise.all([this.standMesh.build(), this.crouchMesh.build()]);

        // start by standing up
        this.mesh = this.standMesh;
        this.crouchMesh.setEnabled(false);
        //this.mesh.get().position = this.level.spawn.spawnPoint.clone();
    }

    public respawn() {
        // set position and switch mesh
        //this.standMesh.get().position = this.level.spawn.spawnPoint.clone();
        //this.crouchMesh.get().position = this.level.spawn.spawnPoint.clone();
        this.switchMesh(false);
        this.crouching = false;
    }

    protected switchMesh(doCrouch: boolean) {
        // if standing, switch to the crouching mesh and vica versa
        const tempMesh = (doCrouch) ? this.crouchMesh : this.standMesh;
        tempMesh.get().position = this.mesh.get().position.clone();
        tempMesh.get().rotation = this.mesh.get().rotation.clone();
        this.mesh.setEnabled(false);
        tempMesh.setEnabled(true);
        this.mesh = tempMesh;
    }

    public dispose() {
        this.standMesh.dispose();
        this.crouchMesh.dispose();
    }

    public getMoveDirection(keys: IMoveKeys): MoveDirection {
        if (keys.up && !keys.down) {
            return MoveDirection.UP;
        } else if (keys.right && !keys.left) {
            return MoveDirection.RIGHT;
        } else if (keys.down && !keys.up) {
            return MoveDirection.DOWN;
        } else if (keys.left && !keys.right) {
            return MoveDirection.LEFT;
        }
        return MoveDirection.IDLE;
    }
}

import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Scene } from "@babylonjs/core/scene";
import { SceneLoader} from "@babylonjs/core/Loading/sceneLoader";

import PlayerMesh from "./PlayerMesh";
import { MoveDirection } from "./AbstractPlayer";

export default class PlayerAnimator {
    private playerMesh: PlayerMesh;
    private animatorMesh: AbstractMesh;
    private name: string;
    private fileName: string;
    private scene: Scene;
    private scaling: number;
    private speedRatio: number;

    private forwardAnim: AnimationGroup;
    private leftAnim: AnimationGroup;
    private rightAnim: AnimationGroup;
    private backAnim: AnimationGroup;
    private idleAnim: AnimationGroup;
    private currentAnimation: AnimationGroup;

    constructor(playerMesh: PlayerMesh, name: string, fileName: string, scaling: number, speedRatio: number) {
        this.playerMesh = playerMesh;
        this.scene = playerMesh.scene;
        this.name = name;
        this.fileName = fileName;
        this.scaling = scaling;
        this.speedRatio = speedRatio;
    }

    public async build() {
        // Animation file is built in blender according to: https://doc.babylonjs.com/divingDeeper/animation/animatedCharacter
        const animations = await this.loadAnimations(this.fileName);

        this.forwardAnim = animations.find(anim => anim.name == "Forward");
        this.idleAnim = animations.find(anim => anim.name == "Idle");
        this.leftAnim = animations.find(anim => anim.name == "Left");
        this.rightAnim = animations.find(anim => anim.name == "Right");
        this.backAnim = animations.find(anim => anim.name == "Back");

        // start with idle animation
        this.currentAnimation = this.idleAnim;
        this.currentAnimation.play(true);
    }

    private async loadAnimations(fileName: string) : Promise<AnimationGroup[]> {
        const result = await SceneLoader.ImportMeshAsync("", "assets/models/", fileName, this.scene);
        this.animatorMesh = result.meshes[0];
        this.animatorMesh.name = "animation" + this.name;
        this.animatorMesh.scaling.scaleInPlace(this.scaling);
        const height = this.playerMesh.get().getBoundingInfo().boundingBox.maximum.y;
        this.animatorMesh.position.y -= height;
        this.animatorMesh.parent = this.playerMesh.get();
        // apply modifiers
        this.animatorMesh.checkCollisions = false;
        this.animatorMesh.isPickable = false;
        // apply to all children as well
        this.animatorMesh.getChildMeshes().forEach(child => {
            child.checkCollisions = false
            child.isPickable = false;
        });

        const animations = result.animationGroups;

        // stop all animations and apply speed ratio
        animations.forEach(animation => {
            animation.stop();
            animation.speedRatio = this.speedRatio;
        });

        return animations;
    }

    public update(direction: MoveDirection, onGround: boolean) {
        // do not play animations when in air
        if (!onGround) {
            this.currentAnimation.pause();
            return;
        }

        switch (direction) {
            case MoveDirection.UP:
            case MoveDirection.RIGHT:
            case MoveDirection.LEFT:
            case MoveDirection.DOWN:
                this.playAnimation(this.forwardAnim);
            break;
            default:
                this.playAnimation(this.idleAnim);
        }
    }

    public setEnabled(enabled: boolean) {
        if (!enabled) {
            this.currentAnimation.stop();
        }
        this.animatorMesh.setEnabled(enabled);
    }

    private playAnimation(animation: AnimationGroup, loop = true) {
        if (animation.isPlaying) {
            return;
        }
        this.currentAnimation.stop();
        this.currentAnimation = animation;
        animation.play(loop);
    }
}

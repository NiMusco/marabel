import { Sound } from "@babylonjs/core/Audio/sound"
import { Scene } from "@babylonjs/core/scene";

export default class AudioManager {
    private scene: Scene
    // name of various sounds
    private run: Sound;
    private crouchWalk: Sound;
    private jump: Sound;

    private city: Sound;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    public async loadAudio() {
        this.run = new Sound("RunSound", "assets/audio/sounds/23.wav", this.scene, null, {loop: true, autoplay: false});
        this.run.setPlaybackRate(1);
        this.run.setVolume(0.2);

        this.crouchWalk = new Sound("CrouchSound", "assets/audio/sounds/23.wav", this.scene, null, {loop: true, autoplay: false});
        this.crouchWalk.setVolume(0.1);

        this.jump = new Sound("JumpSound", "assets/audio/sounds/jump_ground.wav", this.scene, null, {loop: false, autoplay: false});
        this.jump.setVolume(1.2);

        this.city = new Sound("CitySound", "assets/audio/sounds/3.mid", this.scene, null, {loop: true, autoplay: false});
        this.city.setVolume(0.5);
    }

    public playRun(play: boolean) { this.playSound(this.run, play); }
    public playCrouchWalk(play: boolean) { this.playSound(this.crouchWalk, play); }
    public playJump(play: boolean) { this.playSound(this.jump, play); }
    public playCity(play: boolean) { this.playSound(this.city, play); }

    private playSound(sound: Sound, play: boolean) {
        if (play && sound.isPlaying) {
            return;
        }
        if (play) {
            sound.play();
        } else {
            sound.pause();
        }
    }
}

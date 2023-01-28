import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import Config from "../../Config";
import { PlayerInputs } from "../../types";
import { NavMesh, Vector3 as Vector3Y } from "../../yuka";

export class EntityMove {

    private _mesh;
    private _navMesh:NavMesh;
    public playerInputs = [];
    private playerLatestSequence: number;

    private nextPosition: Vector3;
    private nextRotation: Vector3;

    private isCurrentPlayer: boolean;

    constructor(mesh, navMesh:NavMesh, isCurrentPlayer) {
        this._mesh = mesh;
        this._navMesh = navMesh
        this.isCurrentPlayer = isCurrentPlayer
    }

    public getNextPosition() {
        return this.nextPosition;
    }

    public getNextRotation() {
        return this.nextRotation;
    }

    public setPositionAndRotation(entity): void {
        this.nextPosition = new Vector3(entity.x, entity.y, entity.z);
        this.nextRotation = new Vector3(0, entity.rot, 0);
    }

    // server Reconciliation. Re-apply all the inputs not yet processed by the server
    public reconcileMove(latestSequence) {

         // store latest sequence processed by server
        this.playerLatestSequence = latestSequence;

        // if nothing to apply, do nothin
        if (!this.playerInputs.length) return false

        var j = 0;
        while (j < this.playerInputs.length) {

            var nextInput = this.playerInputs[j];

            if (nextInput.seq <= this.playerLatestSequence) { 
                
                // Already processed. Its effect is already taken into account into the world update
                // we just got, so we can drop it.
                this.playerInputs.splice(j, 1);
            } else {

                // Not processed by the server yet. Re-apply it.
                this.move(nextInput.direction);
                j++;
            }

        }

    }

    // prediction move
    public predictionMove(latestInput){

        // move player locally
        this.move(latestInput.direction);

        // Save this input for later reconciliation.
        this.playerInputs.push(latestInput);        
    }

    public tween(){
        this._mesh.position = Vector3.Lerp(this._mesh.position, this.nextPosition, 0.2);
        this._mesh.rotation = Vector3.Lerp(this._mesh.rotation, this.nextRotation, 0.8);
    }

    degrees_to_radians(degrees)
    {
        var pi = Math.PI;
        return degrees * (pi/180);
    }

    public move(direction:number):void {

        // save current position
        let oldX = this.nextPosition.x;
        let oldY = this.nextPosition.y;
        let oldZ = this.nextPosition.z;

        var x_move = 0;
        var z_move = 0;
        var rot = 0;

        switch(direction){
          case 1:
            z_move = 1;
            rot = 180;
          break;

          case 2:
            x_move = -1;
            rot = 90;
          break;

          case 3:
            z_move = -1;
            rot = 0;
          break;

          case 4:
            x_move = 1;
            rot = 270;
          break;
        }

        // calculate new position
        let newX = oldX + x_move;
        let newY = oldY;
        let newZ = oldZ + z_move;

        // not current player, just move straight away
        this.nextPosition.x = newX;
        this.nextPosition.y = newY;
        this.nextPosition.z = newZ;
        this.nextRotation.y = this.degrees_to_radians(rot);
    }

}
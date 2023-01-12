import {Room, Client} from '@colyseus/core';
import { PlayerCrouchSchema, PlayerDirectionSchema, PlayerKeySchema, PlayerPositionSchema } from '../schema/PlayerSchema';

import {StateHandlerSchema} from '../schema/StateHandlerSchema';

import fs from 'fs';
import path from 'path';
//import { BufferAdapter } from '../util/BufferAdapter';
//import * as map from "../maps/1.json";

import World from "../world/World";

export class GameRoom extends Room<StateHandlerSchema> {
    public maxClients = 64;
    public world: World;

    // When room is initialized
    async onCreate(options: any){
        console.log("GameRoom created!", options);
        var world = new World(1);
        world.read();
        this.world = world;

        //Frequency to send the room state to connected clients. 16ms=60fps. 
        this.setPatchRate(16);

        this.setState(new StateHandlerSchema());
    }

    // When client successfully join the room
    onJoin (client: Client) {

        //Send chunks
        //func to get current chunk and neighbors
        //hardcoded for now

        //    0  1  2  3  4
        // 0 [ ][ ][ ][ ][ ]
        // 1 [ ][ ][ ][ ][ ]
        // 2 [ ][x][ ][ ][ ]
        // 3 [ ][ ][ ][ ][ ]
        // 4 [ ][ ][ ][ ][ ]

        var player_chunks: any = [];
        player_chunks[0] = this.world.chunks[0][1];
        player_chunks[1] = this.world.chunks[1][1];
        player_chunks[2] = this.world.chunks[1][2];
        player_chunks[3] = this.world.chunks[2][1];

        this.broadcast("chunks", player_chunks);

        this.onMessage("key", (message) => {
            this.broadcast("key", message);
            console.log(message);
        });

        console.log(`player ${client.sessionId} joined room ${this.roomId}.`);
        this.state.addPlayer(client.sessionId);

        var player = this.state.getPlayer(client.sessionId);
        player.playerPosition.x = 20;
        player.playerPosition.y = 2
        player.playerPosition.z = 20;

        //Update player
        this.onMessage("playerPosition", (client, data: PlayerPositionSchema) => {
            this.state.setPosition(client.sessionId, data);
        });

        this.onMessage("playerDirection", (client, data: PlayerDirectionSchema) => {
            this.state.setDirection(client.sessionId, data);
        });

        this.onMessage("playerCrouching", (client, data: PlayerCrouchSchema) => {
            this.state.setCrouching(client.sessionId, data);
        });

        this.onMessage("playerKey", (client, data: PlayerKeySchema) => {
            this.state.setKeys(client.sessionId, data);
            //console.log("--data", data);
        });
    }

    // When a client leaves the room
    onLeave(client: Client) {
        if(this.state.players.has(client.sessionId)){
            console.log("This player: " + client.sessionId + " has left.");
            this.state.removePlayer(client.sessionId);
        }
    }

    // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
     onDispose() {
        console.log("Dispose GameRoom");
    }
}

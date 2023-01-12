import fs from 'fs';
import path from 'path';

const CHUNK_WIDTH = 10; //in tiles
const CHUNK_SIZE = CHUNK_WIDTH * CHUNK_WIDTH;

const WORLD_WIDTH = 5; //in chunks
const WORLD_SIZE = WORLD_WIDTH * WORLD_WIDTH; //in chunks

import Tile from "../tile/Tile";

export default class Chunk {
    public worldId: number;
    public id: number;
    public tiles: Tile[][];

    constructor(id: number) {
        this.worldId = 1;
        this.id = id;
        this.tiles = [];
    }

    public create(){
        var $this = this;
        for(var x = 0; x < CHUNK_WIDTH; x++) {
            $this.tiles[x] = [];
            for(var y = 0; y < CHUNK_WIDTH; y++) {
                $this.tiles[x][y] = new Tile(x, y, 0, false);
            }
        }
    }

    public read(){
        const filePath = path.join(__dirname, '../../src/worlds/' + this.worldId + "/" + this.id + ".chunk");
        console.log("--file", filePath);

        var $this = this;
        fs.readFile(filePath, "utf8", (err, data) => {
            if (err)
                console.log(err);
            else {
                let d = JSON.parse(data);
                $this.worldId = d.worldId;

                for(var x = 0; x < CHUNK_WIDTH; x++) {
                    $this.tiles[x] = [];
                    for(var y = 0; y < CHUNK_WIDTH; y++) {
                        var t = d.tiles[x][y];
                        $this.tiles[x][y] = new Tile(t.x, t.y, t.grh, t.block);
                    }
                }
            }
        });
    }

    public write(){
        const filePath = path.join(__dirname, '../../src/worlds/' + this.worldId + "/" + this.id + ".chunk");
        console.log("--file", filePath);

        var data = JSON.stringify(this)
        fs.writeFile(filePath, data, (err) => {
          if (err)
            console.log(err);
          else {
            console.log("File written successfully\n");
          }
        });
    }
}

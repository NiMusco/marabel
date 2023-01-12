import fs from 'fs';
import path from 'path';

const CHUNK_WIDTH = 10; //in tiles
const CHUNK_SIZE = CHUNK_WIDTH * CHUNK_WIDTH;

const WORLD_WIDTH = 5; //in chunks
const WORLD_SIZE = WORLD_WIDTH * WORLD_WIDTH; //in chunks

import Chunk from "../chunk/Chunk";

export default class World {
    public id: number;
    public chunks: Chunk[][];

    constructor(id: number) {
        this.id = id;
        this.chunks = [];
    }

    public create(){
        var $this = this;
        var chunk_id = 0;

        for(var x = 0; x < WORLD_WIDTH; x++) {
            $this.chunks[x] = [];
            for(var y = 0; y < WORLD_WIDTH; y++) {
                var chunk = new Chunk(chunk_id);
                chunk.create();
                $this.chunks[x][y] = chunk;
                chunk_id++;
            }
        }

        this.write();
    }

    public read(){
        const filePath = path.join(__dirname, '../../src/worlds/' + this.id + "/" + this.id + ".world");
        console.log("--file", filePath);

        var $this = this;
        fs.readFile(filePath, "utf8", (err, data) => {
            if (err)
                console.log(err);
            else {
                var d = JSON.parse(data);
                $this.id = d.id;
                var chunk_id = 0;

                for(var x = 0; x < WORLD_WIDTH; x++) {
                    $this.chunks[x] = [];
                    for(var y = 0; y < WORLD_WIDTH; y++) {
                        var t = d.chunks[x][y];
                        var chunk = new Chunk(chunk_id);
                        chunk.create();
                        $this.chunks[x][y] = chunk;
                        chunk_id++;
                    }
                }
            }
        });
    }

    public write(){
        const filePath = path.join(__dirname, '../../src/worlds/' + this.id + "/" + this.id + ".world");
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

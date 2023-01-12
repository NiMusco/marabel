export default class Tile {
    public x: number;
    public y: number;
    public grh: number;
    public block: boolean;

    constructor(x: number, y: number, grh: number, block: boolean) {
        this.x = x;
        this.y = y;
        this.grh = grh;
        this.block = block;
    }
}

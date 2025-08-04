import Milepost from "./Milepost";

export default class MountainMilepost extends Milepost {
  constructor(x: number, y: number) {
    super(x, y);
    this.cost = 2;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const size = 6; // Length from center to a vertex
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - size); // Top vertex
    ctx.lineTo(this.x - size * Math.sin(Math.PI / 3), this.y + size / 2); // Bottom left
    ctx.lineTo(this.x + size * Math.sin(Math.PI / 3), this.y + size / 2); // Bottom right
    ctx.closePath();
    ctx.fillStyle = this.selected ? "orange" : "brown";
    ctx.fill();
  }
}

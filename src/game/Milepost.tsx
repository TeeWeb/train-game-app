export default class Milepost {
  x: number;
  y: number;
  selected: boolean;
  cost: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.selected = false;
    this.cost = 1; // Default cost, can be set later
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = this.selected ? "orange" : "black";
    ctx.fill();
    ctx.closePath();
  }

  toggleSelect() {
    this.selected = !this.selected;
  }

  isSelected(): boolean {
    return this.selected;
  }
}

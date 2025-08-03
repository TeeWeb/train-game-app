export default class Board {
  width: number;
  height: number;
  spacing: number; // verical spacing
  horizontalSpacing: number; // horizontal spacing
  offsetRows: boolean;
  dots: { x: number; y: number }[];

  constructor(
    width: number,
    height: number,
    spacing: number,
    offsetRows = false,
    horizontalSpacing?: number // optional
  ) {
    this.width = width;
    this.height = height;
    this.spacing = spacing;
    this.horizontalSpacing = this.horizontalSpacing ?? spacing; // Assuming horizontal spacing is the same as vertical
    this.offsetRows = offsetRows;
    this.dots = [];
    this.generateDots();
  }

  generateDots() {
    this.dots = [];
    const rows = Math.floor(this.height / this.spacing);
    const cols = Math.floor(this.width / this.horizontalSpacing);
    for (let row = 0; row <= rows; row++) {
      const y = row * this.spacing + this.spacing / 2;
      for (let col = 0; col <= cols; col++) {
        // Offset every other row by half the spacing
        const x =
          col * this.horizontalSpacing +
          this.horizontalSpacing / 2 +
          (this.offsetRows && row % 2 === 1 ? this.horizontalSpacing / 2 : 0);
        // Only add dots that are within the border
        if (x <= this.width && y <= this.height) {
          this.dots.push({ x, y });
        }
      }
    }
  }

  getDots() {
    return this.dots;
  }

  public drawBorder(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = "black";
    ctx.strokeRect(0, 0, this.width, this.height);
  }

  public drawDots(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "blue";
    this.dots.forEach((dot) => {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

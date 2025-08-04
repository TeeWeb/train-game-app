import Milepost from "./Milepost";
import MountainMilepost from "./MountainMilepost";

export default class Board {
  width: number;
  height: number;
  spacing: number; // verical spacing
  horizontalSpacing: number; // horizontal spacing
  offsetRows: boolean;
  mileposts: Array<Milepost | MountainMilepost>;

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
    this.horizontalSpacing = horizontalSpacing ?? spacing; // Assuming horizontal spacing is the same as vertical
    this.offsetRows = offsetRows;
    this.mileposts = [];
    this.generateMileposts();
  }

  generateMileposts() {
    this.mileposts = [];
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
          const isMountain = Math.random() < 0.1; // 10% chance to be a mountain milepost
          // Create either a regular or mountain milepost
          if (isMountain) {
            this.mileposts.push(new MountainMilepost(x, y));
          } else {
            this.mileposts.push(new Milepost(x, y));
          }
        }
      }
    }
  }

  getMileposts() {
    return this.mileposts;
  }

  public drawBorder(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = "black";
    ctx.strokeRect(0, 0, this.width, this.height);
  }

  public drawMileposts(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "blue";
    this.mileposts.forEach((milepost) => {
      milepost.draw(ctx);
    });
  }
}

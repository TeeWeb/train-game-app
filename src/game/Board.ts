class Board {
    private dots: { x: number; y: number }[];
    private border: { x: number; y: number; width: number; height: number };

    constructor(width: number, height: number, dotSpacing: number) {
        this.dots = [];
        this.border = { x: 0, y: 0, width: width, height: height };
        this.initializeDots(dotSpacing);
    }

    private initializeDots(dotSpacing: number): void {
        for (let x = dotSpacing; x < this.border.width; x += dotSpacing) {
            for (let y = dotSpacing; y < this.border.height; y += dotSpacing) {
                this.dots.push({ x, y });
            }
        }
    }

    public drawBorder(ctx: CanvasRenderingContext2D): void {
        ctx.strokeStyle = 'black';
        ctx.strokeRect(this.border.x, this.border.y, this.border.width, this.border.height);
    }

    public drawDots(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = 'blue';
        this.dots.forEach(dot => {
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, 5, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    public getDots(): { x: number; y: number }[] {
        return this.dots;
    }
}
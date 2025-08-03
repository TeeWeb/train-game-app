class Dot {
    x: number;
    y: number;
    selected: boolean;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.selected = false;
    }

    render(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = this.selected ? 'blue' : 'black';
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
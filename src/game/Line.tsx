export default class Line {
    private startDot: { x: number; y: number };
    private endDot: { x: number; y: number };

    constructor(startDot: { x: number; y: number }, endDot: { x: number; y: number }) {
        this.startDot = startDot;
        this.endDot = endDot;
    }

    public render(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.moveTo(this.startDot.x, this.startDot.y);
        ctx.lineTo(this.endDot.x, this.endDot.y);
        ctx.stroke();
    }

    public isValid(): boolean {
        // Implement game rules to check if the line is valid
        return true; // Placeholder for actual validation logic
    }
}
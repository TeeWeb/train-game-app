export class GameLogic {
    private selectedDots: Dot[] = [];
    private lines: Line[] = [];
    private board: Board;

    constructor(board: Board) {
        this.board = board;
    }

    public selectDot(dot: Dot): void {
        if (this.isDotSelectable(dot)) {
            this.selectedDots.push(dot);
            this.checkForLine();
        }
    }

    private isDotSelectable(dot: Dot): boolean {
        return !this.selectedDots.includes(dot);
    }

    private checkForLine(): void {
        if (this.selectedDots.length === 2) {
            const line = new Line(this.selectedDots[0], this.selectedDots[1]);
            if (this.isValidLine(line)) {
                this.lines.push(line);
                this.resetSelection();
            } else {
                this.resetSelection();
            }
        }
    }

    private isValidLine(line: Line): boolean {
        // Implement game rules to validate the line
        return true; // Placeholder for actual validation logic
    }

    private resetSelection(): void {
        this.selectedDots = [];
    }

    public getLines(): Line[] {
        return this.lines;
    }

    public getSelectedDots(): Dot[] {
        return this.selectedDots;
    }
}
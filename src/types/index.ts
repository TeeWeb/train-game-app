export type DotPosition = {
    x: number;
    y: number;
};

export type LineCoordinates = {
    start: DotPosition;
    end: DotPosition;
};

export interface GameState {
    dots: DotPosition[];
    lines: LineCoordinates[];
    currentPlayer: number;
    score: number[];
}
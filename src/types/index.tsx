export type Milepost = {
  x: number;
  y: number;
  isSelected: boolean;
  scale: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
  toggleSelect: () => void;
};

export interface MilepostProps {
  xCoord: number;
  yCoord: number;
  selected: boolean;
  color: string;
  isMountain?: boolean; // Optional property for mountain mileposts
}

export type LineCoordinates = {
  start: Milepost;
  end: Milepost;
};

export interface GameState {
  dots: Milepost[];
  lines: LineCoordinates[];
  numPlayers: number;
  currentPlayer: number;
}

export type Player = {
  getId(): import("react").Key;
  id: number;
  color: string;
  name: string;
  balance: number;
  position: number;
  getColor(): string;
  getName(): string;
  getBalance(): number;
  setBalance(amount: number): void;
  addToBalance(amount: number): void;
  subtractFromBalance(amount: number): void;
  getPosition(): number;
  setPosition(position: number): void;
};

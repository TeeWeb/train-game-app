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
  isMountain: boolean; // Optional property for mountain mileposts
  onClick: () => void; // Optional click handler
  isClickable: boolean; // Optional property to indicate if milepost is clickable
  onPointerEnter: () => void; // Optional hover enter handler
  onPointerLeave: () => void; // Optional hover leave handler
  isPreviewTarget: boolean; // Optional property to indicate if milepost is preview target
  cost: number; // Cost to connect to this milepost
}

export enum CitySize {
  SMALL = "SMALL",
  MEDIUM = "MEDIUM",
  MAJOR = "MAJOR"
}

export interface Good {
  id: string;
  name: string;
  value: number;
  color: string;
}

export interface City {
  id: string;
  name: string;
  size: CitySize;
  mileposts: CityMilepost[];
  goods: Good[];
}

export interface CityMilepost extends MilepostProps {
  city: City;
  connectedPlayers: Player[];
  maxConnections: number;
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

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
  isMountain: boolean; // Mountain milepost flag
  isCity: boolean; // City milepost flag
  onClick: () => void; // Click handler
  isClickable: boolean; // Indicates if milepost is clickable
  onPointerEnter: () => void; // Hover enter handler
  onPointerLeave: () => void; // Hover leave handler
  isPreviewTarget: boolean; // Indicates if milepost is preview target
  cost: number; // Cost to connect to this milepost
  city?: City; // Reference to city if this is a city milepost
  connectedPlayers?: Player[]; // Players connected to this city milepost
  maxConnections?: number; // Maximum connections allowed for city milepost
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
  mileposts: MilepostProps[]; // Changed from CityMilepost[] to MilepostProps[]
  goods: Good[];
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

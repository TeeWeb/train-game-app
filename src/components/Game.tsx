import React, { useEffect, useRef, useState, Key, useMemo } from "react";
import Board, { GamePhase } from "../game/Board";
import GameLogic from "../game/GameLogic";
import Player from "../game/Player";
import UI from "./UI";
import GameLog from "./GameLog";
import { gameLogger } from "../utils/gameLogger";
import {
  generateGameBoundaryLoop,
  generateNoisyLoop,
  generateNoisyRiver,
  doPolylinesIntersect,
  getMinDistanceToPolyline,
  doesPolylineIntersectCircles,
} from "../utils/generateNoisyLoop";
import {
  findClosestIntersectionTarget,
  getLineIntersection,
  getTempEndpointFromPerpendicularLine,
  getDirectionAwayFromLakeEdge,
  isDirectionValidForLakeEdge,
  createSmoothCurve,
  createConstrainedSmoothCurve,
  addRiverMeandering,
  reduceSharpAngles,
} from "../utils/pathFinder";
import type { MilepostProps, CitySize, City, Good } from "../types";
import { CitySize as CitySizeEnum } from "../types";

const COLOR_OPTIONS = [
  { name: "Green", value: "#228B22" },
  { name: "Blue", value: "#3357FF" },
  { name: "Goldenrod", value: "#DAA520" },
  { name: "Magenta", value: "#FF33F0" },
  { name: "Light Sea Green", value: "#20B2AA" },
  { name: "Purple", value: "#8A2BE2" },
  { name: "Dark Orange", value: "#FF8C00" },
  { name: "Crimson", value: "#DC143C" },
  { name: "Navy Blue", value: "#000080" },
  { name: "Brown", value: "#8B4513" },
];

const CITY_NAMES = [
  "New Metropolis",
  "Port Haven",
  "Mountain View",
  "Riverside",
  "Capitol City",
  "Goldfield",
  "Iron Ridge",
  "Cedar Falls",
  "Stone Bridge",
  "Sunset Valley",
  "Crystal Bay",
  "Pine Grove",
  "Silver Creek",
  "Oak Harbor",
  "Maple Junction",
  "Thunder Peak",
  "Green Valley",
  "Blue Lake",
  "Red Rock",
  "Golden Gate",
];

const GOODS_DATA: Good[] = [
  { id: "cattle", name: "Cattle", value: 3, color: "#8B4513" },
  { id: "grain", name: "Grain", value: 2, color: "#DAA520" },
  { id: "coal", name: "Coal", value: 4, color: "#2F2F2F" },
  { id: "iron", name: "Iron", value: 5, color: "#696969" },
  { id: "lumber", name: "Lumber", value: 3, color: "#228B22" },
  { id: "oil", name: "Oil", value: 6, color: "#000000" },
  {
    id: "manufactured",
    name: "Manufactured Goods",
    value: 7,
    color: "#8A2BE2",
  },
  { id: "textiles", name: "Textiles", value: 4, color: "#FF69B4" },
];

// Constants for milepost generation
const VERTICAL_SPACING = 10;
const HORIZONTAL_SPACING = 35;
const MAX_TURN_SPENDING = 20;

const Game: React.FC = () => {
  const [boardScale, setBoardScale] = useState<number>(1); // Scale for the board
  const [numPlayers, setNumPlayers] = useState<number | null>(null); // Example state for number of players
  const [currentTurnNumber, setCurrentTurnNumber] = useState<number>(1);
  const [currentRoundNumber, setCurrentRoundNumber] = useState<number>(1);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [currentPhase, setCurrentPhase] = useState<GamePhase>(GamePhase.BUILD);
  const [players, setPlayers] = useState<Player[]>();
  const [winner, setWinner] = useState<Player | null>(null);

  // Track spending per turn (resets each turn)
  const [currentTurnSpending, setCurrentTurnSpending] = useState<number>(0);

  // Game configuration state
  const [gameConfig, setGameConfig] = useState({
    numRivers: 5,
    numLakes: 3,
    mountainDensity: 0.15,
    numMajorCities: 5,
  });
  const [playerConfigs, setPlayerConfigs] = useState<
    Array<{ name: string; color: string }>
  >([]);
  const [configStep, setConfigStep] = useState<"players" | "options" | "game">(
    "players"
  );

  // Board dimensions
  const boardWidth = 1200;
  const boardHeight = 1200;

  const gameLogicRef = useRef<GameLogic | null>(null);

  // Check if point is inside polygon
  const isPointInPolygon = (
    x: number,
    y: number,
    polygon: [number, number][]
  ) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0],
        yi = polygon[i][1];
      const xj = polygon[j][0],
        yj = polygon[j][1];
      const intersect =
        yi > y !== yj > y &&
        x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // Generate lakes within the board boundary
  const generateLakes = (
    boardWidth: number,
    boardHeight: number,
    boundaryPoints: [number, number][],
    numLakes: number = 3
  ): [number, number][][] => {
    const lakes: [number, number][][] = [];
    const minRadius = 30;
    const maxRadius = 80;
    const bufferDistance = 2 * HORIZONTAL_SPACING; // Minimum distance from boundary
    const minLakeDistance = 20; // Minimum distance between lakes
    const maxAttempts = 50; // Maximum attempts to place each lake

    // Helper function to get minimum distance from a point to the boundary
    const getMinDistanceToBoundary = (
      x: number,
      y: number,
      boundary: [number, number][]
    ): number => {
      let minDistance = Infinity;
      for (let i = 0; i < boundary.length - 1; i++) {
        const [x1, y1] = boundary[i];
        const [x2, y2] = boundary[i + 1];

        // Calculate distance from point to line segment
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;
        if (param < 0) {
          xx = x1;
          yy = y1;
        } else if (param > 1) {
          xx = x2;
          yy = y2;
        } else {
          xx = x1 + param * C;
          yy = y1 + param * D;
        }

        const dx = x - xx;
        const dy = y - yy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        minDistance = Math.min(minDistance, distance);
      }
      return minDistance;
    };

    // Helper function to check if an entire lake is valid
    const isLakeValid = (lakePoints: [number, number][]): boolean => {
      // Check boundary constraints
      for (const [x, y] of lakePoints) {
        // Check if point is inside the main boundary
        if (!isPointInPolygon(x, y, boundaryPoints)) {
          return false;
        }

        // Check if point maintains minimum distance from boundary
        const distanceToBoundary = getMinDistanceToBoundary(
          x,
          y,
          boundaryPoints
        );
        if (distanceToBoundary < bufferDistance) {
          return false;
        }
      }

      // Check for overlaps with existing lakes
      for (const existingLake of lakes) {
        // Check if lakes intersect
        if (doPolylinesIntersect(lakePoints, existingLake, false)) {
          return false;
        }

        // Check minimum distance between lakes
        for (const point of lakePoints) {
          const distanceToLake = getMinDistanceToPolyline(point, existingLake);
          if (distanceToLake < minLakeDistance) {
            return false;
          }
        }
      }

      return true;
    };

    for (let lakeIndex = 0; lakeIndex < numLakes; lakeIndex++) {
      let validLakeFound = false;

      for (
        let attempt = 0;
        attempt < maxAttempts && !validLakeFound;
        attempt++
      ) {
        // Random position within the board bounds (with larger margin)
        const margin = bufferDistance + maxRadius + 50; // Extra margin for safety
        const centerX =
          margin + Math.random() * Math.max(0, boardWidth - 2 * margin);
        const centerY =
          margin + Math.random() * Math.max(0, boardHeight - 2 * margin);

        // Random radius
        const radius = minRadius + Math.random() * (maxRadius - minRadius);

        // Generate lake points
        const lakePoints = generateNoisyLoop(centerX, centerY, radius);

        // Check if this lake is valid (all points maintain buffer distance and no overlaps)
        if (isLakeValid(lakePoints)) {
          lakes.push(lakePoints);
          validLakeFound = true;
          console.log(
            `Lake ${lakeIndex + 1} placed successfully at (${centerX.toFixed(
              0
            )}, ${centerY.toFixed(0)}) with radius ${radius.toFixed(0)}`
          );
        }
      }

      if (!validLakeFound) {
        console.warn(
          `Could not place lake ${lakeIndex + 1} after ${maxAttempts} attempts`
        );
      }
    }

    console.log(
      `Generated ${lakes.length} lakes with ${bufferDistance} unit buffer from boundary and ${minLakeDistance} unit spacing`
    );
    return lakes;
  };

  // Check if a point is inside any lake
  const isPointInAnyLake = (
    x: number,
    y: number,
    lakes: [number, number][][]
  ): boolean => {
    return lakes.some((lake) => isPointInPolygon(x, y, lake));
  };

  // Helper function to check if a point is on any lake edge
  const isPointOnAnyLakeEdge = (
    x: number,
    y: number,
    lakes: [number, number][][],
    tolerance: number = 2
  ): boolean => {
    for (const lake of lakes) {
      for (let i = 0; i < lake.length; i++) {
        const j = (i + 1) % lake.length;
        const lineStart = lake[i];
        const lineEnd = lake[j];

        // Calculate distance from point to line segment
        const A = x - lineStart[0];
        const B = y - lineStart[1];
        const C = lineEnd[0] - lineStart[0];
        const D = lineEnd[1] - lineStart[1];

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;
        if (param < 0) {
          xx = lineStart[0];
          yy = lineStart[1];
        } else if (param > 1) {
          xx = lineEnd[0];
          yy = lineEnd[1];
        } else {
          xx = lineStart[0] + param * C;
          yy = lineStart[1] + param * D;
        }

        const dx = x - xx;
        const dy = y - yy;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= tolerance) {
          return true;
        }
      }
    }
    return false;
  };

  // Helper function to check if a point is safe (not in or on any lake, except for start point)
  const isPointSafeFromLakes = (
    point: [number, number],
    lakes: [number, number][][],
    startPoint: [number, number]
  ): boolean => {
    // Allow the original start point
    if (point[0] === startPoint[0] && point[1] === startPoint[1]) {
      return true;
    }

    // Check if point is inside any lake
    if (isPointInAnyLake(point[0], point[1], lakes)) {
      return false;
    }

    // Check if point is on any lake edge
    if (isPointOnAnyLakeEdge(point[0], point[1], lakes)) {
      return false;
    }

    return true;
  };

  // Generate cities with different sizes
  const generateCities = (
    boundaryPoints: [number, number][],
    lakes: [number, number][][],
    numMajorCities: number
  ): City[] => {
    const cities: City[] = [];
    const usedNames = new Set<string>();
    let cityIdCounter = 0;

    // Helper function to get a random unused city name
    const getRandomCityName = (): string => {
      const availableNames = CITY_NAMES.filter((name) => !usedNames.has(name));
      if (availableNames.length === 0) {
        return `City ${cityIdCounter}`;
      }
      const name =
        availableNames[Math.floor(Math.random() * availableNames.length)];
      usedNames.add(name);
      return name;
    };

    // Helper function to get random goods for a city
    const getRandomGoods = (citySize: CitySize): Good[] => {
      const numGoods =
        citySize === CitySizeEnum.MAJOR
          ? 3
          : citySize === CitySizeEnum.MEDIUM
          ? 2
          : 1;
      const shuffledGoods = [...GOODS_DATA].sort(() => Math.random() - 0.5);
      return shuffledGoods.slice(0, numGoods);
    };

    // Helper function to snap coordinates to milepost grid
    const snapToGrid = (x: number, y: number): [number, number] => {
      // Calculate which row and column this would be on the milepost grid
      const row = Math.round((y - VERTICAL_SPACING) / VERTICAL_SPACING);
      const isOddRow = row % 2 === 1;
      const baseX =
        HORIZONTAL_SPACING / 2 + (isOddRow ? HORIZONTAL_SPACING / 2 : 0);
      const col = Math.round((x - baseX) / HORIZONTAL_SPACING);

      // Calculate the actual grid position
      const gridX = col * HORIZONTAL_SPACING + baseX;
      const gridY = row * VERTICAL_SPACING + VERTICAL_SPACING;

      return [gridX, gridY];
    };

    // Helper function to check if a point is valid for city placement
    const isValidCityLocation = (
      x: number,
      y: number,
      existingCities: City[]
    ): boolean => {
      // Check if inside boundary
      if (!isPointInPolygon(x, y, boundaryPoints)) {
        return false;
      }

      // Check if not in lake
      if (isPointInAnyLake(x, y, lakes)) {
        return false;
      }

      // Check minimum distance from existing cities (use grid spacing)
      const minDistance = HORIZONTAL_SPACING * 2; // Minimum 2 grid units between cities
      for (const city of existingCities) {
        for (const milepost of city.mileposts) {
          const distance = Math.sqrt(
            Math.pow(x - milepost.xCoord, 2) + Math.pow(y - milepost.yCoord, 2)
          );
          if (distance < minDistance) {
            return false;
          }
        }
      }

      return true;
    };

    // Generate potential grid positions
    const numRows = Math.floor(boardHeight / VERTICAL_SPACING);
    const numCols = Math.floor(boardWidth / HORIZONTAL_SPACING);
    const gridPositions: [number, number][] = [];

    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const y = row * VERTICAL_SPACING + VERTICAL_SPACING;
        const x =
          col * HORIZONTAL_SPACING +
          HORIZONTAL_SPACING / 2 +
          (row % 2 === 1 ? HORIZONTAL_SPACING / 2 : 0);

        if (x < boardWidth && y < boardHeight) {
          gridPositions.push([x, y]);
        }
      }
    }

    // Shuffle grid positions for random placement
    const shuffledPositions = [...gridPositions].sort(
      () => Math.random() - 0.5
    );

    // Generate MAJOR cities first
    let positionIndex = 0;
    for (let i = 0; i < numMajorCities; i++) {
      let validLocationFound = false;

      while (positionIndex < shuffledPositions.length && !validLocationFound) {
        const [centerX, centerY] = shuffledPositions[positionIndex];
        positionIndex++;

        if (isValidCityLocation(centerX, centerY, cities)) {
          // Create 7 mileposts in a hexagonal pattern for major cities (1 center + 6 surrounding)
          const cityMileposts: MilepostProps[] = [];

          // Calculate hexagonal positions around the center
          // Use North/South instead of East/West for equidistant positioning
          const positions = [
            // Center milepost
            [centerX, centerY],
            // 6 surrounding mileposts in hexagonal pattern using grid spacing
            [centerX, centerY - VERTICAL_SPACING * 2], // North
            [centerX + HORIZONTAL_SPACING / 2, centerY - VERTICAL_SPACING], // Northeast
            [centerX + HORIZONTAL_SPACING / 2, centerY + VERTICAL_SPACING], // Southeast
            [centerX, centerY + VERTICAL_SPACING * 2], // South
            [centerX - HORIZONTAL_SPACING / 2, centerY + VERTICAL_SPACING], // Southwest
            [centerX - HORIZONTAL_SPACING / 2, centerY - VERTICAL_SPACING], // Northwest
          ];

          // Snap all positions to grid and check validity
          const snappedPositions = positions.map(([x, y]) => snapToGrid(x, y));
          let allPositionsValid = true;

          for (const [x, y] of snappedPositions) {
            if (!isValidCityLocation(x, y, cities)) {
              allPositionsValid = false;
              break;
            }
          }

          if (allPositionsValid) {
            const city: City = {
              id: `city_${cityIdCounter++}`,
              name: getRandomCityName(),
              size: CitySizeEnum.MAJOR,
              mileposts: [],
              goods: getRandomGoods(CitySizeEnum.MAJOR),
            };

            for (const [x, y] of snappedPositions) {
              const cityMilepost: MilepostProps = {
                xCoord: x,
                yCoord: y,
                selected: false,
                color: "red",
                isMountain: false,
                isCity: true,
                isClickable: true,
                cost: 5,
                onPointerEnter: () => {},
                onPointerLeave: () => {},
                isPreviewTarget: false,
                onClick: () => {},
                city: city,
                connectedPlayers: [],
                maxConnections: Infinity,
              };
              cityMileposts.push(cityMilepost);
            }

            city.mileposts = cityMileposts;
            cities.push(city);
            validLocationFound = true;
          }
        }
      }
    }

    // Generate MEDIUM cities (3x the number of major cities)
    const numMediumCities = numMajorCities * 3;
    for (let i = 0; i < numMediumCities; i++) {
      let validLocationFound = false;

      while (positionIndex < shuffledPositions.length && !validLocationFound) {
        const [x, y] = shuffledPositions[positionIndex];
        positionIndex++;

        if (isValidCityLocation(x, y, cities)) {
          const city: City = {
            id: `city_${cityIdCounter++}`,
            name: getRandomCityName(),
            size: CitySizeEnum.MEDIUM,
            mileposts: [],
            goods: getRandomGoods(CitySizeEnum.MEDIUM),
          };

          const cityMilepost: MilepostProps = {
            xCoord: x,
            yCoord: y,
            selected: false,
            color: "red",
            isMountain: false,
            isCity: true,
            isClickable: true,
            cost: 3,
            onPointerEnter: () => {},
            onPointerLeave: () => {},
            isPreviewTarget: false,
            onClick: () => {},
            city: city,
            connectedPlayers: [],
            maxConnections: 4,
          };

          city.mileposts = [cityMilepost];
          cities.push(city);
          validLocationFound = true;
        }
      }
    }

    // Generate SMALL cities (3x the number of major cities)
    const numSmallCities = numMajorCities * 3;
    for (let i = 0; i < numSmallCities; i++) {
      let validLocationFound = false;

      while (positionIndex < shuffledPositions.length && !validLocationFound) {
        const [x, y] = shuffledPositions[positionIndex];
        positionIndex++;

        if (isValidCityLocation(x, y, cities)) {
          const city: City = {
            id: `city_${cityIdCounter++}`,
            name: getRandomCityName(),
            size: CitySizeEnum.SMALL,
            mileposts: [],
            goods: getRandomGoods(CitySizeEnum.SMALL),
          };

          const cityMilepost: MilepostProps = {
            xCoord: x,
            yCoord: y,
            selected: false,
            color: "red",
            isMountain: false,
            isCity: true,
            isClickable: true,
            cost: 3,
            onPointerEnter: () => {},
            onPointerLeave: () => {},
            isPreviewTarget: false,
            onClick: () => {},
            city: city,
            connectedPlayers: [],
            maxConnections: 3,
          };

          city.mileposts = [cityMilepost];
          cities.push(city);
          validLocationFound = true;
        }
      }
    }

    console.log(
      `Generated ${cities.length} cities: ${numMajorCities} major, ${numMediumCities} medium, ${numSmallCities} small`
    );
    return cities;
  };

  // Generate rivers connecting boundary to interior or lake edges
  const generateRivers = (
    boundaryPoints: [number, number][],
    lakes: [number, number][][],
    mileposts: { x: number; y: number }[],
    baseRadius: number,
    numRivers: number = 5
  ): [number, number][][] => {
    const rivers: [number, number][][] = [];
    const segmentLength = 3; // Defined segment length for river segments
    const milepostBufferRadius = 5; // Buffer radius for milepost collision detection

    console.log(`DEBUG Game: Generating ${numRivers} rivers with new logic`);

    // Convert mileposts to circles for collision detection
    const milepostCircles = mileposts.map((milepost) => ({
      x: milepost.x,
      y: milepost.y,
      radius: milepostBufferRadius,
    }));

    // Helper function to get distance between two points
    const getDistanceBetweenPoints = (
      start: [number, number],
      end: [number, number]
    ): number => {
      return Math.sqrt(
        Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2)
      );
    };

    // Helper function to get distance from point to boundary line
    const getDistanceToBoundary = (point: [number, number]): number => {
      let minDistance = Infinity;

      for (let i = 0; i < boundaryPoints.length; i++) {
        const j = (i + 1) % boundaryPoints.length;
        const lineStart = boundaryPoints[i];
        const lineEnd = boundaryPoints[j];

        // Calculate distance from point to line segment
        const A = point[0] - lineStart[0];
        const B = point[1] - lineStart[1];
        const C = lineEnd[0] - lineStart[0];
        const D = lineEnd[1] - lineStart[1];

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;
        if (param < 0) {
          xx = lineStart[0];
          yy = lineStart[1];
        } else if (param > 1) {
          xx = lineEnd[0];
          yy = lineEnd[1];
        } else {
          xx = lineStart[0] + param * C;
          yy = lineStart[1] + param * D;
        }

        const dx = point[0] - xx;
        const dy = point[1] - yy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        minDistance = Math.min(minDistance, distance);
      }

      return minDistance;
    };

    // Helper function to determine starting point
    const determineStartingPoint = (): [number, number] | null => {
      const options: [number, number][] = [];

      // Option A: Lake edge points
      for (const lake of lakes) {
        for (let i = 0; i < lake.length; i++) {
          options.push(lake[i]);
        }
      }

      // Option B: Interior points meeting criteria
      const boundingBox = boundaryPoints.reduce(
        (acc, point) => ({
          minX: Math.min(acc.minX, point[0]),
          maxX: Math.max(acc.maxX, point[0]),
          minY: Math.min(acc.minY, point[1]),
          maxY: Math.max(acc.maxY, point[1]),
        }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
      );

      // Generate candidate interior points
      for (let i = 0; i < 50; i++) {
        const x =
          boundingBox.minX +
          Math.random() * (boundingBox.maxX - boundingBox.minX);
        const y =
          boundingBox.minY +
          Math.random() * (boundingBox.maxY - boundingBox.minY);

        // Check if point meets all criteria
        const isInBoundary = isPointInPolygon(x, y, boundaryPoints);
        const isNotInLake = !isPointInAnyLake(x, y, lakes);
        const isNotInMilepostRadius = !milepostCircles.some(
          (circle) =>
            getDistanceBetweenPoints([x, y], [circle.x, circle.y]) <
            circle.radius
        );
        const isNotTooCloseToBoundary =
          getDistanceToBoundary([x, y]) >= 2 * HORIZONTAL_SPACING;

        if (
          isInBoundary &&
          isNotInLake &&
          isNotInMilepostRadius &&
          isNotTooCloseToBoundary
        ) {
          options.push([x, y]);
        }
      }

      if (options.length === 0) return null;
      return options[Math.floor(Math.random() * options.length)];
    };

    // Helper function to determine ending point (on boundary, not within milepost radius)
    const determineEndingPoint = (
      startPoint?: [number, number]
    ): [number, number] | null => {
      const options: [number, number][] = [];

      // Sample boundary points and check if they're valid
      for (let i = 0; i < boundaryPoints.length; i += 3) {
        // Sample every 3rd point
        const boundaryPoint = boundaryPoints[i];
        const isNotInMilepostRadius = !milepostCircles.some(
          (circle) =>
            getDistanceBetweenPoints(boundaryPoint, [circle.x, circle.y]) <
            circle.radius
        );

        if (isNotInMilepostRadius) {
          // If we have a start point and it's on a lake edge, check if this boundary point is in valid direction
          if (
            startPoint &&
            isPointOnAnyLakeEdge(startPoint[0], startPoint[1], lakes, 3)
          ) {
            // Find which lake the start point is on
            let sourceLake: [number, number][] | null = null;
            for (const lake of lakes) {
              if (
                isPointOnAnyLakeEdge(startPoint[0], startPoint[1], [lake], 3)
              ) {
                sourceLake = lake;
                break;
              }
            }

            if (sourceLake) {
              // Calculate direction from start to this boundary point
              const dx = boundaryPoint[0] - startPoint[0];
              const dy = boundaryPoint[1] - startPoint[1];
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance > 0) {
                const direction: [number, number] = [
                  dx / distance,
                  dy / distance,
                ];

                // Check if this direction is valid (in the 180-degree arc away from lake)
                if (
                  isDirectionValidForLakeEdge(startPoint, direction, sourceLake)
                ) {
                  options.push(boundaryPoint);
                }
              }
            }
          } else {
            // Not starting from lake edge, any valid boundary point is fine
            options.push(boundaryPoint);
          }
        }
      }

      if (options.length === 0) return null;
      return options[Math.floor(Math.random() * options.length)];
    };

    // Helper function to check if line segment intersects with lake edges (except start point)
    const checkLakeIntersection = (
      segmentStart: [number, number],
      segmentEnd: [number, number],
      startPoint: [number, number]
    ): {
      intersects: boolean;
      obstacle?: { coords: [number, number]; radius: number };
    } => {
      // Skip check if this segment starts from the original start point (allowed to connect to lake)
      if (
        segmentStart[0] === startPoint[0] &&
        segmentStart[1] === startPoint[1]
      ) {
        return { intersects: false };
      }

      for (const lake of lakes) {
        for (let i = 0; i < lake.length; i++) {
          const j = (i + 1) % lake.length;
          const intersection = getLineIntersection(
            segmentStart,
            segmentEnd,
            lake[i],
            lake[j]
          );
          if (intersection) {
            // Calculate lake center for better obstacle avoidance
            const lakeCenter = lake
              .reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]], [
                0, 0,
              ] as [number, number])
              .map((coord) => coord / lake.length) as [number, number];

            // Calculate approximate radius as distance from center to furthest point
            const maxDistance = Math.max(
              ...lake.map((point) =>
                getDistanceBetweenPoints(lakeCenter, point)
              )
            );

            return {
              intersects: true,
              obstacle: { coords: lakeCenter, radius: maxDistance + 5 }, // Add 5 unit buffer
            };
          }
        }
      }
      return { intersects: false };
    };

    // Helper function to check if line segment intersects with milepost radius
    const checkMilepostIntersection = (
      segmentStart: [number, number],
      segmentEnd: [number, number]
    ): {
      intersects: boolean;
      obstacle?: { coords: [number, number]; radius: number };
    } => {
      for (const circle of milepostCircles) {
        const intersects = doesPolylineIntersectCircles(
          [segmentStart, segmentEnd],
          [circle]
        );
        if (intersects) {
          return {
            intersects: true,
            obstacle: { coords: [circle.x, circle.y], radius: circle.radius },
          };
        }
      }
      return { intersects: false };
    };

    // Helper function to check intersection with other rivers or boundary
    const checkRiverOrBoundaryIntersection = (
      segmentStart: [number, number],
      segmentEnd: [number, number],
      originalEndPoint: [number, number]
    ): [number, number] | null => {
      // Check intersection with existing rivers
      for (const existingRiver of rivers) {
        for (let i = 0; i < existingRiver.length - 1; i++) {
          const intersection = getLineIntersection(
            segmentStart,
            segmentEnd,
            existingRiver[i],
            existingRiver[i + 1]
          );
          if (intersection) return intersection;
        }
      }

      // Check intersection with boundary (excluding original endpoint)
      for (let i = 0; i < boundaryPoints.length; i++) {
        const j = (i + 1) % boundaryPoints.length;
        const intersection = getLineIntersection(
          segmentStart,
          segmentEnd,
          boundaryPoints[i],
          boundaryPoints[j]
        );
        if (intersection) {
          // Only return if it's not the original endpoint
          const distToOriginal = getDistanceBetweenPoints(
            intersection,
            originalEndPoint
          );
          if (distToOriginal > 1) {
            // Small tolerance
            return intersection;
          }
        }
      }

      return null;
    };

    // Main river generation loop
    for (let riverIndex = 0; riverIndex < numRivers; riverIndex++) {
      console.log(`\n--- Generating River ${riverIndex + 1} ---`);

      // Step 1: Set random startPoint
      const startPoint = determineStartingPoint();
      if (!startPoint) {
        console.log(
          `Could not find valid starting point for river ${riverIndex + 1}`
        );
        continue;
      }

      // Step 2: Set random endPoint on boundary
      const originalEndPoint = determineEndingPoint(startPoint);
      if (!originalEndPoint) {
        console.log(
          `Could not find valid ending point for river ${riverIndex + 1}`
        );
        continue;
      }

      console.log(
        `River ${riverIndex + 1}: Start (${startPoint[0].toFixed(
          0
        )}, ${startPoint[1].toFixed(0)}) -> End (${originalEndPoint[0].toFixed(
          0
        )}, ${originalEndPoint[1].toFixed(0)})`
      );

      // Step 3: Generate river segments
      const points: [number, number][] = [startPoint];
      let currentPoint = startPoint;
      let endPoint = originalEndPoint;
      let reachedEnd = false;
      const maxIterations = 1000;
      let iteration = 0;

      // Check if river starts from a lake edge
      const startsFromLake = isPointOnAnyLakeEdge(
        startPoint[0],
        startPoint[1],
        lakes,
        3
      );
      let lakeDepartureSegmentsRemaining = startsFromLake ? 3 : 0; // Force away direction for first 3 segments

      while (!reachedEnd && iteration < maxIterations) {
        iteration++;

        // Step 7: Calculate direction to endPoint
        let dx = endPoint[0] - currentPoint[0];
        let dy = endPoint[1] - currentPoint[1];
        const originalDistanceToEnd = Math.sqrt(dx * dx + dy * dy);

        // Special handling for rivers starting from lakes - force away direction for first few segments
        if (lakeDepartureSegmentsRemaining > 0) {
          // Find the lake this river is departing from
          let sourceLake: [number, number][] | null = null;
          for (const lake of lakes) {
            if (isPointOnAnyLakeEdge(startPoint[0], startPoint[1], [lake], 3)) {
              sourceLake = lake;
              break;
            }
          }

          if (sourceLake) {
            // Get the direction away from the lake edge (perpendicular to tangent, away from lake interior)
            const awayDirection = getDirectionAwayFromLakeEdge(
              startPoint,
              sourceLake,
              3
            );

            if (awayDirection) {
              // Normalize original target direction
              const targetDirX =
                originalDistanceToEnd > 0 ? dx / originalDistanceToEnd : 0;
              const targetDirY =
                originalDistanceToEnd > 0 ? dy / originalDistanceToEnd : 0;

              // Check if target direction is in the valid 180-degree arc away from lake
              const isTargetValid = isDirectionValidForLakeEdge(
                startPoint,
                [targetDirX, targetDirY],
                sourceLake
              );

              if (isTargetValid) {
                // Blend away direction with target direction (more away at start, more target later)
                const awayWeight = lakeDepartureSegmentsRemaining / 3; // 1.0 to 0.33
                const targetWeight = 1 - awayWeight;

                const blendedDirX =
                  awayDirection[0] * awayWeight + targetDirX * targetWeight;
                const blendedDirY =
                  awayDirection[1] * awayWeight + targetDirY * targetWeight;

                // Normalize blended direction and apply segment length
                const blendedLength = Math.sqrt(
                  blendedDirX * blendedDirX + blendedDirY * blendedDirY
                );
                if (blendedLength > 0) {
                  dx = (blendedDirX / blendedLength) * segmentLength;
                  dy = (blendedDirY / blendedLength) * segmentLength;
                }

                console.log(
                  `River ${riverIndex + 1} departure segment ${
                    4 - lakeDepartureSegmentsRemaining
                  }: blending valid target direction with away direction`
                );
              } else {
                // Target direction is in wrong hemisphere, use pure away direction
                dx = awayDirection[0] * segmentLength;
                dy = awayDirection[1] * segmentLength;

                console.log(
                  `River ${riverIndex + 1} departure segment ${
                    4 - lakeDepartureSegmentsRemaining
                  }: target direction invalid, using pure away direction`
                );
              }
            } else {
              // Fallback to original away-from-center logic if edge direction calculation fails
              const lakeCenter = sourceLake
                .reduce(
                  (acc, point) => [acc[0] + point[0], acc[1] + point[1]],
                  [0, 0] as [number, number]
                )
                .map((coord) => coord / sourceLake.length) as [number, number];

              const awayX = currentPoint[0] - lakeCenter[0];
              const awayY = currentPoint[1] - lakeCenter[1];
              const awayLength = Math.sqrt(awayX * awayX + awayY * awayY);

              if (awayLength > 0) {
                dx = (awayX / awayLength) * segmentLength;
                dy = (awayY / awayLength) * segmentLength;
              }

              console.log(
                `River ${riverIndex + 1} departure segment ${
                  4 - lakeDepartureSegmentsRemaining
                }: fallback to away-from-center direction`
              );
            }

            lakeDepartureSegmentsRemaining--;
          }
        }

        // Step 8: Calculate nextPoint
        let nextPoint: [number, number];

        // Step 9: If endPoint is closer than segmentLength and not in lake departure mode, use endPoint
        if (
          originalDistanceToEnd <= segmentLength &&
          lakeDepartureSegmentsRemaining === 0
        ) {
          nextPoint = endPoint;
          reachedEnd = true;
        } else {
          // For lake departure or normal segments, use calculated direction
          if (lakeDepartureSegmentsRemaining > 0) {
            // Use the blended direction (dx, dy already adjusted above)
            nextPoint = [currentPoint[0] + dx, currentPoint[1] + dy];
          } else {
            // Normal segment toward endPoint
            const directionX = dx / originalDistanceToEnd;
            const directionY = dy / originalDistanceToEnd;
            nextPoint = [
              currentPoint[0] + directionX * segmentLength,
              currentPoint[1] + directionY * segmentLength,
            ];
          }
        }

        // Step 10: Check for intersections while nextPoint is not equal to endPoint
        if (!reachedEnd) {
          // Always check milepost intersection (Step 10B) - this is critical for gameplay
          const milepostCheck = checkMilepostIntersection(
            currentPoint,
            nextPoint
          );
          if (milepostCheck.intersects && milepostCheck.obstacle) {
            console.log(
              `River ${
                riverIndex + 1
              } avoiding milepost at (${milepostCheck.obstacle.coords[0].toFixed(
                0
              )}, ${milepostCheck.obstacle.coords[1].toFixed(0)})`
            );
            nextPoint = getTempEndpointFromPerpendicularLine(
              currentPoint,
              nextPoint,
              milepostCheck.obstacle.coords,
              milepostCheck.obstacle.radius
            );
          }

          // Check lake intersection (Step 10A) - be more lenient during departure but still check
          if (lakeDepartureSegmentsRemaining === 0) {
            // Normal lake collision detection
            const lakeCheck = checkLakeIntersection(
              currentPoint,
              nextPoint,
              startPoint
            );
            if (lakeCheck.intersects && lakeCheck.obstacle) {
              console.log(
                `River ${
                  riverIndex + 1
                } avoiding lake at (${lakeCheck.obstacle.coords[0].toFixed(
                  0
                )}, ${lakeCheck.obstacle.coords[1].toFixed(0)})`
              );
              nextPoint = getTempEndpointFromPerpendicularLine(
                currentPoint,
                nextPoint,
                lakeCheck.obstacle.coords,
                lakeCheck.obstacle.radius
              );
            }
          } else {
            console.log(
              `River ${
                riverIndex + 1
              } in lake departure mode, using relaxed lake collision check for segment ${
                4 - lakeDepartureSegmentsRemaining
              }`
            );
            // During departure, only avoid if we're going directly into a different lake
            if (!isPointSafeFromLakes(nextPoint, lakes, startPoint)) {
              console.log(
                `River ${riverIndex + 1} departure point is unsafe, adjusting`
              );
              // Find source lake to avoid going back into it
              for (const lake of lakes) {
                if (
                  isPointOnAnyLakeEdge(startPoint[0], startPoint[1], [lake], 3)
                ) {
                  const lakeCenter = lake
                    .reduce(
                      (acc, point) => [acc[0] + point[0], acc[1] + point[1]],
                      [0, 0] as [number, number]
                    )
                    .map((coord) => coord / lake.length) as [number, number];

                  const maxDistance = Math.max(
                    ...lake.map((point) =>
                      getDistanceBetweenPoints(lakeCenter, point)
                    )
                  );

                  nextPoint = getTempEndpointFromPerpendicularLine(
                    currentPoint,
                    nextPoint,
                    lakeCenter,
                    maxDistance + 15 // Extra buffer during departure
                  );
                  break;
                }
              }
            }
          }

          // Step 12: Check for river/boundary intersection
          const intersection = checkRiverOrBoundaryIntersection(
            currentPoint,
            nextPoint,
            originalEndPoint
          );
          if (intersection) {
            endPoint = intersection;
            nextPoint = intersection;
            reachedEnd = true;
            console.log(
              `River ${
                riverIndex + 1
              } will terminate at intersection: (${intersection[0].toFixed(
                0
              )}, ${intersection[1].toFixed(0)})`
            );
          }

          // Final validation: Ensure nextPoint is safe from lakes AND segment doesn't cross lakes
          const isNextPointSafe = isPointSafeFromLakes(
            nextPoint,
            lakes,
            startPoint
          );
          const isSegmentSafe =
            lakeDepartureSegmentsRemaining > 0 ||
            !checkLakeIntersection(currentPoint, nextPoint, startPoint)
              .intersects;

          if (!isNextPointSafe || !isSegmentSafe) {
            console.log(
              `River ${riverIndex + 1} nextPoint (${nextPoint[0].toFixed(
                0
              )}, ${nextPoint[1].toFixed(
                0
              )}) is unsafe (point safe: ${isNextPointSafe}, segment safe: ${isSegmentSafe}), finding alternative`
            );

            // Find the closest lake to avoid
            let closestLake: [number, number][] | null = null;
            let minDistanceToLake = Infinity;

            for (const lake of lakes) {
              const lakeCenter = lake
                .reduce(
                  (acc, point) => [acc[0] + point[0], acc[1] + point[1]],
                  [0, 0] as [number, number]
                )
                .map((coord) => coord / lake.length) as [number, number];

              const distanceToLakeCenter = getDistanceBetweenPoints(
                nextPoint,
                lakeCenter
              );
              if (distanceToLakeCenter < minDistanceToLake) {
                minDistanceToLake = distanceToLakeCenter;
                closestLake = lake;
              }
            }

            if (closestLake) {
              const lakeCenter = closestLake
                .reduce(
                  (acc, point) => [acc[0] + point[0], acc[1] + point[1]],
                  [0, 0] as [number, number]
                )
                .map((coord) => coord / closestLake.length) as [number, number];

              const maxDistance = Math.max(
                ...closestLake.map((point) =>
                  getDistanceBetweenPoints(lakeCenter, point)
                )
              );

              nextPoint = getTempEndpointFromPerpendicularLine(
                currentPoint,
                nextPoint,
                lakeCenter,
                maxDistance + 10 // Extra buffer for safety
              );

              console.log(
                `River ${
                  riverIndex + 1
                } found alternative nextPoint: (${nextPoint[0].toFixed(
                  0
                )}, ${nextPoint[1].toFixed(0)})`
              );
            }
          }
        }

        // Add the next point to the river
        points.push(nextPoint);
        currentPoint = nextPoint;

        // Check if we've reached the end
        if (getDistanceBetweenPoints(currentPoint, endPoint) < 0.1) {
          reachedEnd = true;
        }
      }

      if (iteration >= maxIterations) {
        console.log(
          `River ${riverIndex + 1} generation exceeded max iterations`
        );
        continue;
      }

      if (points.length > 1) {
        // Create constraint checker function
        const isPointValid = (point: [number, number]): boolean => {
          // Check milepost collisions
          const isNotInMilepostRadius = !milepostCircles.some(
            (circle) =>
              getDistanceBetweenPoints(point, [circle.x, circle.y]) <
              circle.radius - 1 // Slightly smaller buffer for smoothing
          );

          // Check lake safety (more lenient for smoothing)
          const isLakeSafe = isPointSafeFromLakes(point, lakes, startPoint);

          return isNotInMilepostRadius && isLakeSafe;
        };

        // Step 1: Reduce sharp angles to make the path more natural
        let smoothedRiver = reduceSharpAngles(points, Math.PI * 0.8);

        // Step 2: Apply gentle meandering for natural river flow
        smoothedRiver = addRiverMeandering(smoothedRiver, 3, 0.15); // Reduced intensity for better constraint compliance

        // Step 3: Apply constrained smooth curves
        smoothedRiver = createConstrainedSmoothCurve(
          smoothedRiver,
          0.4,
          isPointValid
        );

        rivers.push(smoothedRiver);
        console.log(
          `Successfully created river ${riverIndex + 1} with ${
            points.length
          } original points, smoothed to ${smoothedRiver.length} points`
        );
      }
    }

    console.log(
      `Generated ${rivers.length} rivers using new step-by-step logic`
    );
    return rivers;
  };

  // Generate milepost coordinates
  const generateMilepostCoords = (
    loopPoints: [number, number][],
    lakes: [number, number][][],
    cities: City[]
  ): { x: number; y: number }[] => {
    const coords: { x: number; y: number }[] = [];
    const numRows = Math.floor(boardHeight / VERTICAL_SPACING);
    const numCols = Math.floor(boardWidth / HORIZONTAL_SPACING);

    // Create a set of city milepost coordinates for fast lookup
    const cityCoordinates = new Set<string>();
    cities.forEach((city) => {
      city.mileposts.forEach((milepost) => {
        cityCoordinates.add(
          `${milepost.xCoord.toFixed(1)},${milepost.yCoord.toFixed(1)}`
        );
      });
    });

    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const y = row * VERTICAL_SPACING + VERTICAL_SPACING;
        const x =
          col * HORIZONTAL_SPACING +
          HORIZONTAL_SPACING / 2 +
          (row % 2 === 1 ? HORIZONTAL_SPACING / 2 : 0);

        const coordKey = `${x.toFixed(1)},${y.toFixed(1)}`;

        if (
          x < boardWidth &&
          y < boardHeight &&
          isPointInPolygon(x, y, loopPoints) &&
          !isPointInAnyLake(x, y, lakes) && // Check that milepost is not in any lake
          !cityCoordinates.has(coordKey) // Check that this position is not occupied by a city milepost
        ) {
          coords.push({ x, y });
        }
      }
    }
    return coords;
  };

  // Memoize the loop points so they don't change every render
  const loopPoints = useMemo(() => {
    if (configStep !== "game") return []; // Don't generate until game starts
    return generateGameBoundaryLoop(
      boardWidth,
      boardHeight,
      120,
      0.5,
      VERTICAL_SPACING,
      HORIZONTAL_SPACING
    );
  }, [boardWidth, boardHeight, configStep]);

  // Generate lakes that avoid the boundary
  const lakes = useMemo(() => {
    if (configStep !== "game" || loopPoints.length === 0) return []; // Don't generate until game starts
    return generateLakes(
      boardWidth,
      boardHeight,
      loopPoints,
      gameConfig.numLakes
    );
  }, [boardWidth, boardHeight, loopPoints, gameConfig.numLakes, configStep]);

  // Generate cities
  const cities = useMemo(() => {
    if (configStep !== "game" || loopPoints.length === 0 || lakes.length === 0)
      return []; // Don't generate until game starts
    return generateCities(loopPoints, lakes, gameConfig.numMajorCities);
  }, [loopPoints, lakes, gameConfig.numMajorCities, configStep]);

  // Calculate base radius for river length constraints
  const baseRadius = useMemo(() => {
    if (configStep !== "game") return 0; // Don't calculate until game starts
    const cx = boardWidth / 2;
    const cy = boardHeight / 2 - VERTICAL_SPACING * 10;
    const targetArea = boardWidth * boardHeight * 0.65; // Same ratio as boundary
    return Math.sqrt(targetArea / Math.PI);
  }, [boardWidth, boardHeight, configStep]);

  // Generate stable milepost data
  const mileposts = useMemo(() => {
    if (
      configStep !== "game" ||
      loopPoints.length === 0 ||
      lakes.length === 0 ||
      cities.length === 0
    )
      return []; // Don't generate until game starts
    const coords = generateMilepostCoords(loopPoints, lakes, cities);
    const generatedMileposts = coords.map(({ x, y }) => {
      const isMountain = Math.random() < gameConfig.mountainDensity;
      return {
        xCoord: x,
        yCoord: y,
        selected: false,
        color: "black",
        isMountain: isMountain,
        isCity: false, // Regular mileposts are not cities
        isClickable: currentPhase === GamePhase.BUILD,
        cost: isMountain ? 2 : 1, // Mountain mileposts cost 2, regular mileposts cost 1
        onPointerEnter: () => {},
        onPointerLeave: () => {},
        isPreviewTarget: false,
      };
    });

    // Replace regular mileposts with city mileposts at overlapping coordinates
    let allMileposts = [...generatedMileposts];

    cities.forEach((city) => {
      city.mileposts.forEach((cityMilepost) => {
        // Find and remove any regular milepost at the same coordinates
        const tolerance = 1; // Small tolerance for coordinate matching
        allMileposts = allMileposts.filter((regularMilepost) => {
          const dx = Math.abs(regularMilepost.xCoord - cityMilepost.xCoord);
          const dy = Math.abs(regularMilepost.yCoord - cityMilepost.yCoord);
          return dx > tolerance || dy > tolerance; // Keep if coordinates don't match
        });

        // Add the city milepost
        allMileposts.push({
          ...cityMilepost,
          isClickable: currentPhase === GamePhase.BUILD,
        });
      });
    });

    // Debug: Log cost distribution
    const mountainCount = generatedMileposts.filter((m) => m.isMountain).length;
    const cost2Count = generatedMileposts.filter((m) => m.cost === 2).length;
    const lakesCount = lakes.length;
    const citiesCount = cities.length;
    console.log(
      `Generated ${generatedMileposts.length} regular mileposts: ${mountainCount} mountains, ${cost2Count} with cost=2, avoiding ${lakesCount} lakes and ${citiesCount} cities`
    );

    return allMileposts;
  }, [
    loopPoints,
    lakes,
    cities,
    gameConfig.mountainDensity,
    currentPhase,
    configStep,
  ]);

  // Generate rivers connecting boundary to interior/lakes (after mileposts are generated)
  const rivers = useMemo(() => {
    if (configStep !== "game" || mileposts.length === 0) return []; // Don't generate until game starts and mileposts exist
    const milepostCoords = mileposts.map((m) => ({ x: m.xCoord, y: m.yCoord }));
    console.log(
      `DEBUG: Generating rivers with ${milepostCoords.length} mileposts to avoid`
    );
    const generatedRivers = generateRivers(
      loopPoints,
      lakes,
      milepostCoords,
      baseRadius,
      gameConfig.numRivers
    );
    console.log(
      `DEBUG: Generated ${generatedRivers.length} rivers:`,
      generatedRivers
    );
    return generatedRivers;
  }, [
    loopPoints,
    lakes,
    mileposts,
    baseRadius,
    gameConfig.numRivers,
    configStep,
  ]);

  useEffect(() => {
    console.log("Checking for winner: " + winner);
    if (numPlayers === null) return;
    else if (winner !== null && winner !== undefined) {
      alert(
        "Game Over! A player has reached the end condition. " +
          winner.getName() +
          " wins!"
      );
      resetGame();
      return;
    }
  }, [numPlayers, winner]);

  const handlePlayerCountSelection = (count: number) => {
    setNumPlayers(count);
    const defaultConfigs = Array.from({ length: count }, (_, i) => ({
      name: `Player ${i + 1}`,
      color: COLOR_OPTIONS[i % COLOR_OPTIONS.length].value,
    }));
    setPlayerConfigs(defaultConfigs);
    setConfigStep("options");
  };

  const handlePlayerConfigChange = (
    index: number,
    field: "name" | "color",
    value: string
  ) => {
    const newConfigs = [...playerConfigs];
    newConfigs[index] = { ...newConfigs[index], [field]: value };
    setPlayerConfigs(newConfigs);
  };

  const initializePlayers = () => {
    const newPlayers = playerConfigs.map((config, i) => {
      return new Player(i, config.color, config.name, 50);
    });
    setPlayers(newPlayers);
    gameLogicRef.current = new GameLogic();
    setConfigStep("game");

    // Log game initialization
    gameLogger.log("GAME_START", `New game started with ${numPlayers} players`);
  };

  const resetGame = () => {
    setNumPlayers(null);
    setCurrentTurnNumber(1);
    setCurrentRoundNumber(1);
    setCurrentPlayerIndex(0);
    setCurrentPhase(GamePhase.BUILD);
    setPlayers([]);
    setWinner(null);
    setPlayerConfigs([]);
    setConfigStep("players");
    setGameConfig({
      numRivers: 5,
      numLakes: 3,
      mountainDensity: 0.15,
      numMajorCities: 2,
    });
  };

  const handleEndTurn = () => {
    const oldPlayerIndex = currentPlayerIndex;
    const oldRound = currentRoundNumber;

    // Deduct current turn spending from the current player's balance
    if (currentTurnSpending > 0) {
      const currentPlayer = players[currentPlayerIndex];
      if (currentPlayer) {
        currentPlayer.updateBalance(-currentTurnSpending); // Subtract spending from balance
        setPlayers((prev) =>
          prev
            ? prev.map((p) =>
                p.getId() === currentPlayer.getId() ? currentPlayer : p
              )
            : []
        );

        gameLogger.log(
          "BALANCE_UPDATE",
          `Deducted $${currentTurnSpending} from ${currentPlayer.getName()}'s balance (new balance: $${currentPlayer.getBalance()})`,
          currentPlayer.getId(),
          currentPlayer.getName(),
          currentPlayer.getColor()
        );
      }
    }

    setCurrentTurnNumber((prev) => prev + 1);
    let newRound = currentRoundNumber;

    if (currentPlayerIndex == players.length - 1) {
      newRound = currentRoundNumber + 1;
      setCurrentRoundNumber(newRound);
      setCurrentPlayerIndex(0);
    } else {
      setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
    }

    // Reset spending for new turn
    setCurrentTurnSpending(0);

    // Set phase based on round - rounds 3+ start each player's turn with MOVE
    if (newRound >= 3) {
      setCurrentPhase(GamePhase.MOVE);
    }

    // Log round and player changes
    if (newRound > oldRound) {
      gameLogger.log("ROUND_START", `Round ${newRound} started`);
    }

    const nextPlayerIndex =
      currentPlayerIndex == players.length - 1 ? 0 : currentPlayerIndex + 1;
    const nextPlayer = players[nextPlayerIndex];
    if (nextPlayer) {
      gameLogger.log(
        "TURN_START",
        `Turn ${currentTurnNumber + 1} started`,
        nextPlayer.getId(),
        nextPlayer.getName(),
        nextPlayer.getColor()
      );

      if (newRound >= 3) {
        gameLogger.log(
          "PHASE_START",
          `Move phase started`,
          nextPlayer.getId(),
          nextPlayer.getName(),
          nextPlayer.getColor()
        );
      }
    }

    // Check for game end condition
    setWinner(gameLogicRef.current?.checkForGameEnd(players || []));
  };

  const handleAdvanceGame = () => {
    const currentPlayer = players[currentPlayerIndex];

    if (currentRoundNumber <= 2) {
      // First 2 rounds: only BUILD phase
      gameLogger.log(
        "TURN_END",
        `Turn ${currentTurnNumber} ended`,
        currentPlayer.getId(),
        currentPlayer.getName(),
        currentPlayer.getColor()
      );
      handleEndTurn();
    } else {
      // Rounds 3+: MOVE then BUILD phases
      if (currentPhase === GamePhase.MOVE) {
        gameLogger.log(
          "PHASE_END",
          `Move phase ended`,
          currentPlayer.getId(),
          currentPlayer.getName(),
          currentPlayer.getColor()
        );
        setCurrentPhase(GamePhase.BUILD);
        gameLogger.log(
          "PHASE_START",
          `Build phase started`,
          currentPlayer.getId(),
          currentPlayer.getName(),
          currentPlayer.getColor()
        );
      } else {
        // End of BUILD phase - advance to next player's turn
        gameLogger.log(
          "TURN_END",
          `Turn ${currentTurnNumber} ended`,
          currentPlayer.getId(),
          currentPlayer.getName(),
          currentPlayer.getColor()
        );
        handleEndTurn();
      }
    }
  };

  const updatePlayerBalance = (playerId: Key, amount: number) => {
    const player = players?.find((p) => p.getId() === playerId);
    if (player) {
      player.updateBalance(amount);
      setPlayers((prev) =>
        prev ? prev.map((p) => (p.getId() === playerId ? player : p)) : []
      );
    }
  };

  // Configuration screens for game setup
  if (configStep === "players") {
    return (
      <div style={{ padding: 32, maxWidth: 600, margin: "0 auto" }}>
        <h2>Game Setup - Select Number of Players</h2>
        <label style={{ display: "block", marginBottom: 20 }}>
          Number of players:{" "}
          <select
            onChange={(e) => handlePlayerCountSelection(Number(e.target.value))}
            defaultValue=""
            style={{ marginLeft: 10, padding: 5 }}
          >
            <option value="" disabled>
              Select...
            </option>
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} Players
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  if (configStep === "options") {
    return (
      <div style={{ padding: 32, maxWidth: 800, margin: "0 auto" }}>
        <h2>Game Setup - Configure Options</h2>

        {/* Player Configuration */}
        <div style={{ marginBottom: 30 }}>
          <h3>Player Configuration</h3>
          {playerConfigs.map((config, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 15,
                padding: 15,
                border: "1px solid #ddd",
                borderRadius: 5,
                backgroundColor: "#f9f9f9",
              }}
            >
              <div style={{ marginRight: 20, minWidth: 80 }}>
                <strong>Player {index + 1}:</strong>
              </div>
              <div style={{ marginRight: 20 }}>
                <label style={{ display: "block", marginBottom: 5 }}>
                  Name:
                </label>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) =>
                    handlePlayerConfigChange(index, "name", e.target.value)
                  }
                  style={{ padding: 5, width: 150 }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 5 }}>
                  Color:
                </label>
                <select
                  value={config.color}
                  onChange={(e) =>
                    handlePlayerConfigChange(index, "color", e.target.value)
                  }
                  style={{ padding: 5, width: 150 }}
                >
                  {COLOR_OPTIONS.map((colorOption) => (
                    <option key={colorOption.value} value={colorOption.value}>
                      {colorOption.name}
                    </option>
                  ))}
                </select>
              </div>
              <div
                style={{
                  width: 30,
                  height: 30,
                  backgroundColor: config.color,
                  marginLeft: 15,
                  border: "1px solid #000",
                  borderRadius: 3,
                }}
              />
            </div>
          ))}
        </div>

        {/* Game Options */}
        <div style={{ marginBottom: 30 }}>
          <h3>Game Options</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
              padding: 15,
              border: "1px solid #ddd",
              borderRadius: 5,
              backgroundColor: "#f9f9f9",
            }}
          >
            <div>
              <label style={{ display: "block", marginBottom: 5 }}>
                Number of Rivers: {gameConfig.numRivers}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={gameConfig.numRivers}
                onChange={(e) =>
                  setGameConfig({
                    ...gameConfig,
                    numRivers: Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 5 }}>
                Number of Lakes: {gameConfig.numLakes}
              </label>
              <input
                type="range"
                min="1"
                max="6"
                value={gameConfig.numLakes}
                onChange={(e) =>
                  setGameConfig({
                    ...gameConfig,
                    numLakes: Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 5 }}>
                Mountain Density: {Math.round(gameConfig.mountainDensity * 100)}
                %
              </label>
              <input
                type="range"
                min="0"
                max="0.4"
                step="0.05"
                value={gameConfig.mountainDensity}
                onChange={(e) =>
                  setGameConfig({
                    ...gameConfig,
                    mountainDensity: Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 5 }}>
                Number of Major Cities: {gameConfig.numMajorCities}
              </label>
              <input
                type="range"
                min="3"
                max="7"
                value={gameConfig.numMajorCities}
                onChange={(e) =>
                  setGameConfig({
                    ...gameConfig,
                    numMajorCities: Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button
            onClick={() => setConfigStep("players")}
            style={{
              padding: "10px 20px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Back
          </button>
          <button
            onClick={initializePlayers}
            style={{
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            Start Game
          </button>
        </div>
      </div>
    );
  }

  // Main game interface (when configStep === 'game')
  if (configStep === "game" && players) {
    // Render the game board once setup is complete
    return (
      <div
        className="game-board"
        style={{
          display: "flex",
          width: "100%",
          height: "100vh",
        }}
      >
        <div
          className="game-info"
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "20px",
            minWidth: "300px",
            backgroundColor: "#f5f5f5",
            borderRight: "2px solid #ccc",
          }}
        >
          <h2>Game Info</h2>

          <div style={{ marginBottom: "10px" }}>
            <strong>Current Player:</strong>{" "}
            <span style={{ color: players[currentPlayerIndex].getColor() }}>
              {players[currentPlayerIndex].getName()}
            </span>
          </div>
          <div style={{ marginBottom: "10px" }}>
            <strong>Phase:</strong> {currentPhase}
          </div>
          <div style={{ marginBottom: "20px" }}>
            <strong>Spent this turn:</strong>{" "}
            <span
              style={{
                color:
                  currentTurnSpending >= MAX_TURN_SPENDING * 0.8
                    ? "#ff6b6b"
                    : currentTurnSpending >= MAX_TURN_SPENDING * 0.6
                    ? "#ffa726"
                    : "black",
                fontWeight: "bold",
              }}
            >
              ${currentTurnSpending} / ${MAX_TURN_SPENDING}
            </span>
          </div>
          <div style={{ marginBottom: "10px" }}>
            <strong>Turn:</strong> {currentTurnNumber}
          </div>
          <div style={{ marginBottom: "10px" }}>
            <strong>Round:</strong> {currentRoundNumber}
          </div>
          <div style={{ marginBottom: "10px" }}>
            <strong>Total Players:</strong> {numPlayers}
          </div>
          <button
            onClick={handleAdvanceGame}
            style={{
              padding: "10px 15px",
              backgroundColor:
                players[currentPlayerIndex]?.getColor() || "#ccc",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            {currentRoundNumber <= 2
              ? "End Turn"
              : currentPhase === GamePhase.MOVE
              ? "End Move Phase"
              : "End Build Phase"}
          </button>

          <div style={{ marginTop: "20px" }}>
            <UI
              playerData={players}
              currentPlayerIndex={currentPlayerIndex}
              endTurn={handleEndTurn}
              updatePlayerBalance={updatePlayerBalance}
            />
          </div>

          <div style={{ marginTop: "20px" }}>
            <GameLog />
          </div>
        </div>

        <div style={{ flex: 1, position: "relative" }}>
          <Board
            width={boardWidth}
            height={boardHeight}
            mountainProbability={gameConfig.mountainDensity}
            players={players}
            currentPlayerIndex={currentPlayerIndex}
            currentRound={currentRoundNumber}
            currentTurn={currentTurnNumber}
            currentPhase={currentPhase}
            onAdvanceGame={handleAdvanceGame}
            mileposts={mileposts}
            loopPoints={loopPoints}
            lakes={lakes}
            rivers={rivers}
            cities={cities}
            currentTurnSpending={currentTurnSpending}
            maxTurnSpending={MAX_TURN_SPENDING}
            onSpendingChange={setCurrentTurnSpending}
          />
        </div>
      </div>
    );
  }

  // Fallback (should not reach here)
  return <div>Loading...</div>;
};

export default Game;

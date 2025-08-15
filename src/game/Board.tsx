import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera, Line } from "@react-three/drei";
import * as THREE from "three";

import Milepost from "./Milepost";
import type { MilepostProps } from "../types";
import MountainMilepost from "./MountainMilepost";
import GameLogic from "./GameLogic";

const VERTICAL_SPACING = 10; // Make dots closer together
const HORIZONTAL_SPACING = 35; // Horizontal spacing for offset rows
const MIN_ZOOM = 200;
const MAX_ZOOM = 2500;
const ZOOM_STEP = 50;

interface BoardProps {
  width: number;
  height: number;
  mountainProbability: number;
}

const Board: React.FC<BoardProps> = ({
  width,
  height,
  mountainProbability,
}) => {
  const [mileposts, setMileposts] = useState<MilepostProps[]>([]);
  const [numRows, setNumRows] = useState<number>(height / VERTICAL_SPACING);
  const [numCols, setNumCols] = useState<number>(width / HORIZONTAL_SPACING);
  const [boardWidth, setBoardWidth] = useState<number>(width);
  const [boardHeight, setBoardHeight] = useState<number>(height);
  // Camera position state
  const [cameraX, setCameraX] = useState<number>(boardWidth / 2);
  const [cameraY, setCameraY] = useState<number>(boardHeight / 2);
  const [cameraZ, setCameraZ] = useState<number>(boardWidth); // Initial zoom level

  // Mouse tracking
  const [isMouseOverCanvas, setIsMouseOverCanvas] = useState(false);
  const [showCrosshairs, setShowCrosshairs] = useState<boolean>(false);
  const [mountainProb, setMountainProb] = useState<number>(mountainProbability);
  const [verticalSpacing, setVerticalSpacing] =
    useState<number>(VERTICAL_SPACING);
  const [horizontalSpacing, setHorizontalSpacing] =
    useState<number>(HORIZONTAL_SPACING);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const gameLogicRef = useRef<GameLogic | null>(null);

  // Drag state
  const dragState = useRef<{
    dragging: boolean;
    lastX: number;
    lastY: number;
    ctrl: boolean;
    button: number;
  }>({
    dragging: false,
    lastX: 0,
    lastY: 0,
    ctrl: false,
    button: 0,
  });

  function generateNoisyLoop(
    width: number,
    height: number,
    numPoints: number = 120,
    areaRatio: number = 0.65
  ): [number, number][] {
    const cx = (width - HORIZONTAL_SPACING * 2) / 2;
    const cy = (height - VERTICAL_SPACING * 2) / 2;
    // Target radius for desired area
    const targetArea = width * height * areaRatio;
    // Ensure the radius never exceeds the distance to the nearest edge
    const maxRadiusX = Math.min(cx, width - cx);
    const maxRadiusY = Math.min(cy, height - cy);
    // Use the smaller of calculated baseRadius and max allowed radius
    const baseRadius = Math.min(
      Math.sqrt(targetArea / Math.PI),
      maxRadiusX * 0.98,
      maxRadiusY * 0.98
    );

    const points: [number, number][] = [];
    for (let i = 0; i < numPoints; i++) {
      const theta = (i / numPoints) * Math.PI * 2;
      // Add noise for concave/convex features
      const noise =
        Math.sin(theta * 7) * baseRadius * 0.1 +
        Math.cos(theta * 4) * baseRadius * 0.1 +
        (Math.random() - 1.2) * baseRadius * 0.05; // Adjust noise amplitude
      // Skew the shape
      let x =
        cx +
        Math.cos(theta) * (baseRadius + noise) * (1 + 0.25 * Math.sin(theta));
      let y =
        cy +
        Math.sin(theta) *
          (baseRadius + noise) *
          (1 + 0.45 * Math.cos(theta - 0.5));
      // Clamp x and y to stay within the board
      x = Math.max(HORIZONTAL_SPACING, Math.min(width, x));
      y = Math.max(VERTICAL_SPACING, Math.min(height, y));
      points.push([x, y]);
    }
    // Ensure the loop is closed by making the last point equal to the first
    if (points.length > 0) {
      points.push([...points[0]]);
    }
    return points;
  }

  // Memoize the loop points so they don't change every render
  const loopPoints = useMemo(
    () => generateNoisyLoop(boardWidth, boardHeight, 120, 0.65),
    [boardWidth, boardHeight]
  );

  // Convert to THREE.Vector3[]
  const threePoints = useMemo(
    () => loopPoints.map(([x, y]) => new THREE.Vector3(x, y, 2)), // z=2 to draw above the board
    [loopPoints]
  );

  // Utility: Ray-casting algorithm for point-in-polygon
  function isPointInPolygon(x: number, y: number, polygon: [number, number][]) {
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
  }

  const generateMilepostCoords = (): { x: number; y: number }[] => {
    const coords: { x: number; y: number }[] = [];
    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const y = row * verticalSpacing + verticalSpacing;
        const x =
          col * horizontalSpacing +
          horizontalSpacing / 2 +
          (row % 2 === 1 ? horizontalSpacing / 2 : 0);
        // Only add if inside noisy loop polygon
        if (
          x < boardWidth &&
          y < boardHeight &&
          isPointInPolygon(x, y, loopPoints)
        ) {
          coords.push({ x, y });
        }
      }
    }
    return coords;
  };

  const getSelectedMilepost = () => {
    const selectedMileposts = mileposts.filter((milepost) => milepost.selected);
    if (selectedMileposts.length > 1)
      console.log("More than 1 milepost is selected:", selectedMileposts);
    return selectedMileposts;
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current.getBoundingClientRect();
    setCursorPosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    // setShowCrosshairs(true);
  };

  // Generate props for each milepost, randomly assigning mountains
  useEffect(() => {
    const coords = generateMilepostCoords();
    const milepostProps = coords.map(({ x, y }) => ({
      xCoord: x,
      yCoord: y,
      selected: false,
      color: "black", // Add a default color property
      boardScale: 1, // Add a default value for boardScale
      isMountain: Math.random() < mountainProbability,
    }));
    setMileposts(milepostProps);
  }, [mountainProbability]);

  // WASD keyboard movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const step = 20;
      if (e.key === "w" || e.key === "ArrowUp") setCameraY((y) => y + step);
      if (e.key === "s" || e.key === "ArrowDown") setCameraY((y) => y - step);
      if (e.key === "a" || e.key === "ArrowLeft") setCameraX((x) => x - step);
      if (e.key === "d" || e.key === "ArrowRight") setCameraX((x) => x + step);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Keyboard +/- zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "+" || e.key === "=") {
        setCameraZ((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
      }
      if (e.key === "-") {
        setCameraZ((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
      }
      // ...existing WASD logic...
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Mouse drag (center/wheel or Ctrl+left)
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
        dragState.current.dragging = true;
        dragState.current.lastX = e.clientX;
        dragState.current.lastY = e.clientY;
        dragState.current.ctrl = e.ctrlKey;
        dragState.current.button = e.button;
      }
    };
    const handleMouseUp = () => {
      dragState.current.dragging = false;
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState.current.dragging) {
        const dx = e.clientX - dragState.current.lastX;
        const dy = e.clientY - dragState.current.lastY;
        setCameraX((x) => x - dx);
        setCameraY((y) => y + dy);
        dragState.current.lastX = e.clientX;
        dragState.current.lastY = e.clientY;
      }
    };
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Mouse wheel zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isMouseOverCanvas) {
        e.preventDefault(); // Prevent default scrolling behavior
        setCameraZ((z) => {
          let next = z + (e.deltaY > 0 ? ZOOM_STEP : -ZOOM_STEP);
          return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
        });
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [isMouseOverCanvas]);

  // Mobile/touch drag
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        dragState.current.dragging = true;
        dragState.current.lastX = e.touches[0].clientX;
        dragState.current.lastY = e.touches[0].clientY;
      }
    };
    const handleTouchEnd = () => {
      dragState.current.dragging = false;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (dragState.current.dragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - dragState.current.lastX;
        const dy = e.touches[0].clientY - dragState.current.lastY;
        setCameraX((x) => x - dx);
        setCameraY((y) => y - dy);
        dragState.current.lastX = e.touches[0].clientX;
        dragState.current.lastY = e.touches[0].clientY;
      }
    };
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchmove", handleTouchMove);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  // Mobile pinch/spread zoom
  useEffect(() => {
    let lastDistance = null;
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (lastDistance !== null) {
          const delta = distance - lastDistance;
          setCameraZ((z) => {
            let next = z - delta;
            return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
          });
        }
        lastDistance = distance;
      }
    };
    const handleTouchEnd = () => {
      lastDistance = null;
    };
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  return (
    <div>
      <Canvas
        id="gameCanvas"
        ref={canvasRef}
        onMouseEnter={() => setIsMouseOverCanvas(true)}
        onMouseLeave={() => setIsMouseOverCanvas(false)}
        style={{
          border: "2px solid black",
          display: "block",
          width: `${boardWidth}px`,
          height: `${boardHeight}px`,
          background: "#181820",
        }}
      >
        <Line
          points={threePoints}
          color="black"
          lineWidth={8} // Bold line
          transparent={false}
        />
        <PerspectiveCamera
          makeDefault
          position={[cameraX, cameraY, cameraZ]}
          up={[0, 1, 0]}
          lookAt={[cameraX, cameraY, 0]} // Look at board center
        />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <mesh
          position={[boardWidth / 2, boardHeight / 2, -1]} // Slightly below the mileposts
          // receiveShadow
        >
          <planeGeometry args={[boardWidth, boardHeight]} />
          <meshStandardMaterial color="#fff" opacity={1} />
        </mesh>
        {/* <gridHelper
          args={[boardWidth, verticalSpacing, "gray", "lightgray"]}
          position={[boardWidth / 2, boardHeight / 2, 0]}
          rotation={[Math.PI / 2, Math.PI / 2, 0]}
        /> */}
        <axesHelper args={[cameraZ]} />
        {mileposts.map((props, index) =>
          props.isMountain ? (
            <MountainMilepost key={index} {...props} />
          ) : (
            <Milepost key={index} {...props} />
          )
        )}
      </Canvas>
      <div style={{ position: "absolute" }}>
        x: {cursorPosition.x.toFixed(2)}, y: {cursorPosition.y.toFixed(2)}
      </div>
    </div>
  );
};

export default Board;

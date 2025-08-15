import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";

import Milepost from "./Milepost";
import type { MilepostProps } from "../types";
import MountainMilepost from "./MountainMilepost";
import GameLogic from "./GameLogic";

const VERTICAL_SPACING = 20; // Make dots closer together
const HORIZONTAL_SPACING = 50; // Horizontal spacing for offset rows
const MIN_ZOOM = 200;
const MAX_ZOOM = 2000;
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

  // Generate coordinates for mileposts
  const generateMilepostCoords = (): { x: number; y: number }[] => {
    const coords: { x: number; y: number }[] = [];
    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const y = row * verticalSpacing + verticalSpacing;
        const x =
          col * horizontalSpacing +
          horizontalSpacing / 2 +
          (row % 2 === 1 ? horizontalSpacing / 2 : 0);
        if (x < boardWidth && y < boardHeight) {
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

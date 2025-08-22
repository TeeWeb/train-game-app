import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera, Line } from "@react-three/drei";
import * as THREE from "three";

import Milepost from "./Milepost";
import type { MilepostProps, City } from "../types";
import GameLogic from "./GameLogic";
import Player from "./Player";
import { gameLogger } from "../utils/gameLogger";

// Game phases
export enum GamePhase {
  MOVE = "MOVE",
  BUILD = "BUILD",
}

// Train types
enum TrainType {
  LIGHT_FREIGHT = "LIGHT_FREIGHT",
  HEAVY_FREIGHT = "HEAVY_FREIGHT",
  PASSENGER = "PASSENGER",
}

// Train class
class Train {
  public speed: number = 9;
  public capacity: number = 2;
  public type: TrainType = TrainType.LIGHT_FREIGHT;
  public playerId: number;

  constructor(playerId: number) {
    this.playerId = playerId;
  }
}

// Track/Line interface for rendered tracks
interface TrackLine {
  start: { x: number; y: number };
  end: { x: number; y: number };
  color: string;
  playerId: number;
}

const VERTICAL_SPACING = 10; // Make dots closer together
const HORIZONTAL_SPACING = 35; // Horizontal spacing for offset rows
const MIN_ZOOM = 200;
const MAX_ZOOM = 2500;
const ZOOM_STEP = 50;

interface BoardProps {
  width: number;
  height: number;
  mountainProbability: number;
  players: Player[];
  currentPlayerIndex: number;
  currentRound: number;
  currentTurn: number;
  currentPhase: GamePhase;
  onAdvanceGame: () => void;
  mileposts: Omit<MilepostProps, "onClick">[];
  loopPoints: [number, number][];
  lakes: [number, number][][]; // Add lakes prop
  rivers: [number, number][][]; // Add rivers prop
  cities: City[]; // Add cities prop
  currentTurnSpending: number;
  maxTurnSpending: number;
  onSpendingChange: (newSpending: number) => void;
}

const Board: React.FC<BoardProps> = ({
  width,
  height,
  mountainProbability,
  players,
  currentPlayerIndex,
  currentRound,
  currentTurn,
  currentPhase,
  onAdvanceGame,
  mileposts: baseMileposts,
  loopPoints,
  lakes,
  rivers,
  cities,
  currentTurnSpending,
  maxTurnSpending,
  onSpendingChange,
}) => {
  // Local UI state only
  const [selectedMilepostIndex, setSelectedMilepostIndex] = useState<
    number | null
  >(null);
  const [hoveredMilepostIndex, setHoveredMilepostIndex] = useState<
    number | null
  >(null);
  const [tracks, setTracks] = useState<TrackLine[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Camera position state
  const [cameraX, setCameraX] = useState<number>(width / 2);
  const [cameraY, setCameraY] = useState<number>(height / 2);
  const [cameraZ, setCameraZ] = useState<number>(width); // Initial zoom level

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

  // Convert to THREE.Vector3[]
  const threePoints = useMemo(
    () => loopPoints.map(([x, y]) => new THREE.Vector3(x, y, 2)), // z=2 to draw above the board
    [loopPoints]
  );

  // Convert lakes to THREE.Vector3[]
  const lakesThreePoints = useMemo(
    () =>
      lakes.map((lake) => lake.map(([x, y]) => new THREE.Vector3(x, y, 1.5))), // z=1.5 to draw above board but below boundary
    [lakes]
  );

  // Convert rivers to THREE.Vector3[]
  const riversThreePoints = useMemo(() => {
    console.log(`DEBUG Board: Received ${rivers.length} rivers:`, rivers);
    const converted = rivers.map((river) =>
      river.map(([x, y]) => new THREE.Vector3(x, y, 1.3))
    ); // z=1.3 to draw above board but below lakes
    console.log(
      `DEBUG Board: Converted to ${converted.length} river point arrays`
    );
    return converted;
  }, [rivers]);

  // Handle milepost selection and track building
  const handleMilepostClick = useCallback(
    (clickedIndex: number) => {
      const currentPlayer = players[currentPlayerIndex];
      if (!currentPlayer) return;

      // gameLogger.log(
      //   "MILEPOST_CLICK",
      //   `Clicked milepost ${clickedIndex} at (${
      //     baseMileposts[clickedIndex]?.xCoord?.toFixed(0) || "unknown"
      //   }, ${baseMileposts[clickedIndex]?.yCoord?.toFixed(0) || "unknown"})`,
      //   currentPlayer.getId(),
      //   currentPlayer.getName(),
      //   currentPlayer.getColor()
      // );

      if (currentPhase !== GamePhase.BUILD) {
        gameLogger.log(
          "ACTION_BLOCKED",
          `Cannot select milepost during ${currentPhase} phase`,
          currentPlayer.getId(),
          currentPlayer.getName(),
          currentPlayer.getColor()
        );
        return;
      }

      if (selectedMilepostIndex === null) {
        // First selection - select the milepost
        gameLogger.log(
          "MILEPOST_SELECT",
          `Selected milepost ${clickedIndex}`,
          currentPlayer.getId(),
          currentPlayer.getName(),
          currentPlayer.getColor()
        );

        setSelectedMilepostIndex(clickedIndex);
      } else if (selectedMilepostIndex === clickedIndex) {
        // Clicking the same milepost - deselect
        gameLogger.log(
          "MILEPOST_DESELECT",
          `Deselected milepost ${clickedIndex}`,
          currentPlayer.getId(),
          currentPlayer.getName(),
          currentPlayer.getColor()
        );

        setSelectedMilepostIndex(null);
      } else {
        // Second selection - try to build track
        const startMilepost = baseMileposts[selectedMilepostIndex];
        const endMilepost = baseMileposts[clickedIndex];

        if (!startMilepost || !endMilepost) {
          gameLogger.log(
            "BUILD_ERROR",
            `Invalid mileposts: start=${selectedMilepostIndex}, end=${clickedIndex}`,
            currentPlayer.getId(),
            currentPlayer.getName(),
            currentPlayer.getColor()
          );
          return;
        }

        const dx = startMilepost.xCoord - endMilepost.xCoord;
        const dy = startMilepost.yCoord - endMilepost.yCoord;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if this is a valid connection (use same logic as isValidTrackDistance)
        const isValidConnection = isValidTrackDistance(
          selectedMilepostIndex,
          clickedIndex
        );

        if (isValidConnection) {
          // Calculate track cost based on destination milepost type
          const trackCost = endMilepost.cost || 1; // Use cost from milepost, default to 1
          const newSpending = currentTurnSpending + trackCost;

          // Debug: Log cost calculation
          console.log(
            `Building track to milepost ${clickedIndex}: isMountain=${endMilepost.isMountain}, cost=$${endMilepost.cost}, trackCost=$${trackCost}`
          );

          // Check if spending limit would be exceeded
          if (newSpending > maxTurnSpending) {
            gameLogger.log(
              "BUILD_ERROR",
              `Cannot build track: cost $${trackCost} would exceed turn limit ($${currentTurnSpending} / $${maxTurnSpending})`,
              currentPlayer.getId(),
              currentPlayer.getName(),
              currentPlayer.getColor()
            );

            // Show alert to user
            alert(
              `Cannot build track! This would cost $${trackCost} and exceed your limit of $${maxTurnSpending} for this turn. You have already spent $${currentTurnSpending} this turn.`
            );

            // Clear selection and return
            setSelectedMilepostIndex(null);
            return;
          }

          // Valid distance and cost - build track
          const newTrack: TrackLine = {
            start: { x: startMilepost.xCoord, y: startMilepost.yCoord },
            end: { x: endMilepost.xCoord, y: endMilepost.yCoord },
            color: currentPlayer.getColor(),
            playerId: currentPlayer.getId(),
          };

          // Update spending
          onSpendingChange(newSpending);

          setTracks((prevTracks) => {
            const updatedTracks = [...prevTracks, newTrack];
            gameLogger.log(
              "TRACK_BUILT",
              `Built track from ${selectedMilepostIndex} to ${clickedIndex} for $${trackCost} (total tracks: ${updatedTracks.length}, spending: $${newSpending} / $${maxTurnSpending})`,
              currentPlayer.getId(),
              currentPlayer.getName(),
              currentPlayer.getColor()
            );
            return updatedTracks;
          });

          // Move selection to destination milepost
          setSelectedMilepostIndex(clickedIndex);

          gameLogger.log(
            "SELECTION_MOVED",
            `Selection moved to milepost ${clickedIndex}`,
            currentPlayer.getId(),
            currentPlayer.getName(),
            currentPlayer.getColor()
          );
        } else {
          // Determine the reason for blocking
          let reason = "";
          if (distance > HORIZONTAL_SPACING) {
            reason = `Track too long: ${distance.toFixed(
              1
            )} > ${HORIZONTAL_SPACING}`;
          } else if (Math.abs(dy) < 1) {
            reason = `Horizontal connections not allowed (dy = ${Math.abs(
              dy
            ).toFixed(1)})`;
          } else {
            // Check if track already exists
            const tolerance = 1;
            const trackExists = tracks.some((track) => {
              const trackStartX = track.start.x;
              const trackStartY = track.start.y;
              const trackEndX = track.end.x;
              const trackEndY = track.end.y;

              const matchesForward =
                Math.abs(trackStartX - startMilepost.xCoord) < tolerance &&
                Math.abs(trackStartY - startMilepost.yCoord) < tolerance &&
                Math.abs(trackEndX - endMilepost.xCoord) < tolerance &&
                Math.abs(trackEndY - endMilepost.yCoord) < tolerance;

              const matchesReverse =
                Math.abs(trackStartX - endMilepost.xCoord) < tolerance &&
                Math.abs(trackStartY - endMilepost.yCoord) < tolerance &&
                Math.abs(trackEndX - startMilepost.xCoord) < tolerance &&
                Math.abs(trackEndY - startMilepost.yCoord) < tolerance;

              return matchesForward || matchesReverse;
            });

            if (trackExists) {
              reason = `Track already exists between these mileposts`;
            } else {
              reason = `Invalid connection`;
            }
          }

          gameLogger.log(
            "BUILD_BLOCKED",
            reason,
            currentPlayer.getId(),
            currentPlayer.getName(),
            currentPlayer.getColor()
          );
          // Keep current selection
        }
      }
    },
    [
      currentPhase,
      selectedMilepostIndex,
      players,
      currentPlayerIndex,
      baseMileposts,
    ]
  );

  // Handle milepost hover for preview tracks
  const handleMilepostHover = useCallback((hoveredIndex: number | null) => {
    setHoveredMilepostIndex(hoveredIndex);
  }, []);

  // Check if a track between two mileposts would be valid
  const isValidTrackDistance = useCallback(
    (startIndex: number, endIndex: number) => {
      if (startIndex === endIndex) return false;

      const startMilepost = baseMileposts[startIndex];
      const endMilepost = baseMileposts[endIndex];

      if (!startMilepost || !endMilepost) return false;

      const dx = startMilepost.xCoord - endMilepost.xCoord;
      const dy = startMilepost.yCoord - endMilepost.yCoord;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check if distance is within allowed range
      if (distance > HORIZONTAL_SPACING) return false;

      // Prevent horizontal connections (same Y coordinate, different X)
      // Allow a small tolerance for floating point precision
      const tolerance = 1;
      if (Math.abs(dy) < tolerance) {
        return false; // This is a horizontal connection, block it
      }

      // Check if a track already exists between these two mileposts
      const trackExists = tracks.some((track) => {
        const trackStartX = track.start.x;
        const trackStartY = track.start.y;
        const trackEndX = track.end.x;
        const trackEndY = track.end.y;

        // Check both directions (A->B and B->A)
        const matchesForward =
          Math.abs(trackStartX - startMilepost.xCoord) < tolerance &&
          Math.abs(trackStartY - startMilepost.yCoord) < tolerance &&
          Math.abs(trackEndX - endMilepost.xCoord) < tolerance &&
          Math.abs(trackEndY - endMilepost.yCoord) < tolerance;

        const matchesReverse =
          Math.abs(trackStartX - endMilepost.xCoord) < tolerance &&
          Math.abs(trackStartY - endMilepost.yCoord) < tolerance &&
          Math.abs(trackEndX - startMilepost.xCoord) < tolerance &&
          Math.abs(trackEndY - startMilepost.yCoord) < tolerance;

        return matchesForward || matchesReverse;
      });

      if (trackExists) return false; // Track already exists

      return true; // Valid vertical or diagonal connection
    },
    [baseMileposts, tracks]
  );

  // Create preview track when hovering over valid destinations
  const previewTrack = useMemo(() => {
    if (
      currentPhase !== GamePhase.BUILD ||
      selectedMilepostIndex === null ||
      hoveredMilepostIndex === null ||
      !isValidTrackDistance(selectedMilepostIndex, hoveredMilepostIndex)
    ) {
      return null;
    }

    const startMilepost = baseMileposts[selectedMilepostIndex];
    const endMilepost = baseMileposts[hoveredMilepostIndex];

    if (!startMilepost || !endMilepost) return null;

    return {
      start: { x: startMilepost.xCoord, y: startMilepost.yCoord },
      end: { x: endMilepost.xCoord, y: endMilepost.yCoord },
      color: players[currentPlayerIndex]?.getColor() || "gray",
      playerId: players[currentPlayerIndex]?.getId() || -1,
    };
  }, [
    currentPhase,
    selectedMilepostIndex,
    hoveredMilepostIndex,
    baseMileposts,
    players,
    currentPlayerIndex,
    isValidTrackDistance,
  ]);

  // Create enhanced mileposts with onClick handlers and selection state
  const mileposts = useMemo(() => {
    return baseMileposts.map((milepost, index) => ({
      ...milepost,
      selected: selectedMilepostIndex === index,
      color:
        selectedMilepostIndex === index && players[currentPlayerIndex]
          ? players[currentPlayerIndex].getColor()
          : "black",
      onClick: () => handleMilepostClick(index),
      onPointerEnter: () => handleMilepostHover(index),
      onPointerLeave: () => handleMilepostHover(null),
      isPreviewTarget: hoveredMilepostIndex === index && previewTrack !== null,
    }));
  }, [
    baseMileposts,
    handleMilepostClick,
    handleMilepostHover,
    selectedMilepostIndex,
    hoveredMilepostIndex,
    previewTrack,
    players,
    currentPlayerIndex,
  ]);

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current.getBoundingClientRect();
    setCursorPosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    // setShowCrosshairs(true);
  };

  // Clear milepost selections when phase changes from BUILD
  useEffect(() => {
    if (currentPhase !== GamePhase.BUILD) {
      const currentPlayer = players[currentPlayerIndex];
      if (currentPlayer && selectedMilepostIndex !== null) {
        gameLogger.log(
          "SELECTION_CLEARED",
          `Milepost selection cleared due to phase change to ${currentPhase}`,
          currentPlayer.getId(),
          currentPlayer.getName(),
          currentPlayer.getColor()
        );
      }

      setSelectedMilepostIndex(null);
      setHoveredMilepostIndex(null); // Also clear hovered milepost
    }
  }, [currentPhase, players, currentPlayerIndex, selectedMilepostIndex]);

  // Clear milepost selections when player turn changes
  useEffect(() => {
    if (selectedMilepostIndex !== null || hoveredMilepostIndex !== null) {
      const currentPlayer = players[currentPlayerIndex];
      if (currentPlayer) {
        gameLogger.log(
          "TURN_SELECTION_CLEARED",
          `Milepost selection cleared for new player turn`,
          currentPlayer.getId(),
          currentPlayer.getName(),
          currentPlayer.getColor()
        );
      }

      setSelectedMilepostIndex(null);
      setHoveredMilepostIndex(null);
    }
  }, [currentPlayerIndex]); // Only trigger when player changes

  // Handle loading state - set to false once mileposts are available
  useEffect(() => {
    if (baseMileposts && baseMileposts.length > 0) {
      // Add a small delay to show the loading animation
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [baseMileposts]);

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
    <div style={{ position: "relative" }}>
      {/* CSS for loading animation */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 0.4; }
            50% { opacity: 1; }
            100% { opacity: 0.4; }
          }
          @keyframes dots {
            0%, 20% { content: ''; }
            40% { content: '.'; }
            60% { content: '..'; }
            80%, 100% { content: '...'; }
          }
          .loading-dots::after {
            content: '';
            animation: dots 2s infinite;
          }
        `}
      </style>

      {/* Loading overlay */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${width}px`,
            height: `${height}px`,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            border: "2px solid black",
          }}
        >
          <div
            style={{
              color: "white",
              fontSize: "24px",
              fontWeight: "bold",
              textAlign: "center",
              animation: "pulse 2s infinite",
            }}
            className="loading-dots"
          >
            Loading game board
          </div>
        </div>
      )}

      <Canvas
        id="gameCanvas"
        ref={canvasRef}
        onMouseEnter={() => setIsMouseOverCanvas(true)}
        onMouseLeave={() => setIsMouseOverCanvas(false)}
        style={{
          border: "2px solid black",
          display: "block",
          width: `${width}px`,
          height: `${height}px`,
          background: "#181820",
        }}
      >
        {/* Boundary Loop */}
        <Line
          points={threePoints}
          color="black"
          lineWidth={4} // Bold line
          transparent={false}
        />

        {/* Render Lakes */}
        {lakesThreePoints.map((lakePoints, index) => (
          <Line
            key={`lake-${index}`}
            points={lakePoints}
            color="#4A90E2" // Blue color for lakes
            lineWidth={3}
            transparent={false}
          />
        ))}

        {/* Render Rivers */}
        {riversThreePoints.map((riverPoints, index) => (
          <Line
            key={`river-${index}`}
            points={riverPoints}
            color="#1E88E5" // Darker blue color for rivers
            lineWidth={2}
            transparent={false}
          />
        ))}

        {/* Render City Areas */}
        {cities.map((city, index) => {
          // Calculate city center from mileposts
          const centerX = city.mileposts.reduce((sum, mp) => sum + mp.xCoord, 0) / city.mileposts.length;
          const centerY = city.mileposts.reduce((sum, mp) => sum + mp.yCoord, 0) / city.mileposts.length;
          
          if (city.size === 'SMALL') {
            // Circle shape for small cities (reduced radius by 50%)
            return (
              <mesh key={`city-${index}`} position={[centerX, centerY, 0.8]}>
                <circleGeometry args={[7.5, 32]} />
                <meshStandardMaterial color="#ff4444" transparent={true} opacity={0.3} />
              </mesh>
            );
          } else if (city.size === 'MEDIUM') {
            // Square shape for medium cities (reduced size by 50%)
            return (
              <mesh key={`city-${index}`} position={[centerX, centerY, 0.8]}>
                <planeGeometry args={[15, 15]} />
                <meshStandardMaterial color="#ff4444" transparent={true} opacity={0.3} />
              </mesh>
            );
          } else {
            // MAJOR cities: hexagonal filled area using the 6 outer mileposts
            if (city.mileposts.length >= 7) {
              // Get the 6 outer mileposts (skip the center one at index 0)
              const outerMileposts = city.mileposts.slice(1);
              
              // Create hexagon shape using ShapeGeometry
              const hexagonShape = new THREE.Shape();
              outerMileposts.forEach((mp, i) => {
                const localX = mp.xCoord - centerX;
                const localY = mp.yCoord - centerY;
                if (i === 0) {
                  hexagonShape.moveTo(localX, localY);
                } else {
                  hexagonShape.lineTo(localX, localY);
                }
              });
              hexagonShape.closePath();
              
              return (
                <mesh key={`city-${index}`} position={[centerX, centerY, 0.8]}>
                  <shapeGeometry args={[hexagonShape]} />
                  <meshStandardMaterial color="#ff4444" transparent={true} opacity={0.3} />
                </mesh>
              );
            } else {
              // Fallback to circle if not enough mileposts
              return (
                <mesh key={`city-${index}`} position={[centerX, centerY, 0.8]}>
                  <circleGeometry args={[25, 32]} />
                  <meshStandardMaterial color="#ff4444" transparent={true} opacity={0.3} />
                </mesh>
              );
            }
          }
        })}

        {/* Render all built tracks */}
        {tracks.map((track, index) => (
          <Line
            key={index}
            points={[
              new THREE.Vector3(track.start.x, track.start.y, 1),
              new THREE.Vector3(track.end.x, track.end.y, 1),
            ]}
            color={track.color}
            lineWidth={4}
            transparent={false}
          />
        ))}

        {/* Render preview track when hovering over valid destination */}
        {previewTrack && (
          <Line
            points={[
              new THREE.Vector3(
                previewTrack.start.x,
                previewTrack.start.y,
                1.5
              ),
              new THREE.Vector3(previewTrack.end.x, previewTrack.end.y, 1.5),
            ]}
            color={previewTrack.color}
            lineWidth={3}
            transparent={true}
            opacity={0.5}
          />
        )}

        <PerspectiveCamera
          makeDefault
          position={[cameraX, cameraY, cameraZ]}
          up={[0, 1, 0]}
          lookAt={[cameraX, cameraY, 0]} // Look at board center
        />
        <ambientLight intensity={3} />
        <pointLight position={[10, 10, 10]} />
        <mesh
          position={[width / 2, height / 2, -1]} // Slightly below the mileposts
          // receiveShadow
        >
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial color="#fff" />
        </mesh>
        <axesHelper args={[cameraZ]} />
        {/* Only render mileposts when not loading */}
        {!isLoading &&
          mileposts.map((props, index) => {
            // All mileposts now use the unified Milepost component
            return <Milepost key={index} {...props} />;
          })}
      </Canvas>
      <div style={{ position: "absolute" }}>
        x: {cursorPosition.x.toFixed(2)}, y: {cursorPosition.y.toFixed(2)}
      </div>
    </div>
  );
};

export default Board;

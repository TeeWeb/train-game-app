import React, { useEffect, useRef } from "react";
import Board from "../game/Board";
import GameLogic from "../game/GameLogic";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const DOT_SPACING = 40; // Make dots closer together
const HORIZONTAL_SPACING = 80; // Horizontal spacing for offset rows

const GameBoard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const boardRef = useRef<Board | null>(null);
  const gameLogicRef = useRef<GameLogic | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext("2d");
      if (context) {
        contextRef.current = context;
        // Pass a flag or use a custom method for offset grid
        boardRef.current = new Board(
          CANVAS_WIDTH,
          CANVAS_HEIGHT,
          DOT_SPACING,
          true, // pass a flag for offset rows
          HORIZONTAL_SPACING
        );
        gameLogicRef.current = new GameLogic(boardRef.current);
        // Initial draw
        context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        boardRef.current.drawBorder(context);
        boardRef.current.drawDots(context);
      }
    }
  }, []);

  const handleMouseClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (canvas && context && boardRef.current && gameLogicRef.current) {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Restrict drawing to inside the border
      if (x >= 0 && x <= CANVAS_WIDTH && y >= 0 && y <= CANVAS_HEIGHT) {
        // Find the nearest dot within a certain radius
        const dots = boardRef.current.getDots();
        const radius = 10;
        const clickedDot = dots.find(
          (dot) => Math.hypot(dot.x - x, dot.y - y) <= radius
        );
        if (clickedDot) {
          // Select the dot in game logic
          // @ts-ignore: Dot type mismatch workaround
          gameLogicRef.current.selectDot(clickedDot);
        }
        // Redraw
        context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        boardRef.current.drawBorder(context);
        boardRef.current.drawDots(context);
        // Draw all lines
        gameLogicRef.current.getLines().forEach((line) => {
          line.render(context);
        });
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      onClick={handleMouseClick}
      style={{ border: "2px solid black", display: "block" }}
    />
  );
};

export default GameBoard;

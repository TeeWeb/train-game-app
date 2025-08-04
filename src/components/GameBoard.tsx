import React, { useEffect, useRef, useState } from "react";
import Board from "../game/Board";
import GameLogic from "../game/GameLogic";
import Player from "../game/Player";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const DOT_SPACING = 20; // Make dots closer together
const HORIZONTAL_SPACING = 50; // Horizontal spacing for offset rows
const PLAYER_COLORS = [
  "#FF5733", // Player 1 color
  "#33FF57", // Player 2 color
  "#3357FF", // Player 3 color
  "#F0F033", // Player 4 color
  "#FF33F0", // Player 5 color
  "#33FFF0", // Player 6 color
];

const GameBoard: React.FC = () => {
  const [numPlayers, setNumPlayers] = useState<number | null>(null); // Example state for number of players
  const [currentTurnNumber, setCurrentTurnNumber] = useState<number>(1);
  const [currentRoundNumber, setCurrentRoundNumber] = useState<number>(1);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [players, setPlayers] = useState<Player[]>();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const boardRef = useRef<Board | null>(null);
  const gameLogicRef = useRef<GameLogic | null>(null);

  useEffect(() => {
    if (numPlayers === null) return;
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
        boardRef.current.drawMileposts(context);
      }
    }
  }, [numPlayers]);

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
        const dots = boardRef.current.getMileposts();
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
        boardRef.current.drawMileposts(context);
        // Draw all lines
        gameLogicRef.current.getLines().forEach((line) => {
          line.render(context);
        });
      }
    }
  };

  const initializePlayers = (numPlayers: number) => {
    setNumPlayers(numPlayers);
    const newPlayers = Array.from({ length: numPlayers }, (_, i) => {
      return new Player(i, PLAYER_COLORS[i], `Player ${i + 1}`, 50);
    });
    setPlayers(newPlayers);
    gameLogicRef.current = new GameLogic(boardRef.current);
  };

  // Start screen for selecting number of players
  if (numPlayers === null) {
    return (
      <div style={{ padding: 32 }}>
        <label>
          Select number of players:{" "}
          <select
            onChange={(e) => initializePlayers(Number(e.target.value))}
            defaultValue=""
          >
            <option value="" disabled>
              --
            </option>
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  } else {
    // Render the game board once number of players is selected
    return (
      <div className="game-board">
        <div className="game-info">
          <p>Number of Players: {numPlayers}</p>
          <p>
            Turn {currentTurnNumber}: | Round {currentRoundNumber} | Current
            Player:{" "}
            <span style={{ color: players[currentPlayerIndex].getColor() }}>
              {players[currentPlayerIndex].getName()}
            </span>
          </p>
        </div>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleMouseClick}
          style={{ border: "2px solid black", display: "block" }}
        />
        <div className="player-list">
          <h3>Players</h3>
          <ul>
            {players?.map((player) => (
              <li key={player.getId()} style={{ color: player.getColor() }}>
                {player.getName()} | Balance: ${player.getBalance()}m
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={() => {
            setCurrentTurnNumber((prev) => prev + 1);
            if (currentPlayerIndex == players.length - 1) {
              setCurrentRoundNumber((prev) => prev + 1);
              setCurrentPlayerIndex(0);
            } else {
              setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
            }
          }}
          style={{ margin: 8 }}
        >
          End Turn
        </button>
      </div>
    );
  }
};

export default GameBoard;

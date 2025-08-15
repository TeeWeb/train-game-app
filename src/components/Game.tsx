import React, { useEffect, useRef, useState, Key, useMemo } from "react";
import Board, { GamePhase } from "../game/Board";
import GameLogic from "../game/GameLogic";
import Player from "../game/Player";
import UI from "./UI";
import GameLog from "./GameLog";
import { gameLogger } from "../utils/gameLogger";
import type { MilepostProps } from "../types";

const PLAYER_COLORS = [
  "#FF5733", // Player 1 color - Orange Red
  "#228B22", // Player 2 color - Medium Green
  "#3357FF", // Player 3 color - Blue
  "#DAA520", // Player 4 color - Goldenrod (was invalid format)
  "#FF33F0", // Player 5 color - Magenta
  "#20B2AA", // Player 6 color - Light Sea Green (was invalid format)
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

  // Board dimensions
  const boardWidth = 1200;
  const boardHeight = 1200;
  const mountainProbability = 0.15;

  const gameLogicRef = useRef<GameLogic | null>(null);

  // Generate noisy loop for milepost boundary
  const generateNoisyLoop = (
    width: number,
    height: number,
    numPoints: number = 120,
    areaRatio: number = 0.65
  ): [number, number][] => {
    const cx = width / 2;
    const cy = height / 2 - VERTICAL_SPACING * 10;
    const targetArea = width * height * areaRatio;
    const maxRadiusX = Math.min(cx, width - cx - HORIZONTAL_SPACING);
    const maxRadiusY = Math.min(cy, height - cy - VERTICAL_SPACING);
    const baseRadius = Math.min(
      Math.sqrt(targetArea / Math.PI),
      maxRadiusX * 0.98,
      maxRadiusY * 0.98
    );

    const points: [number, number][] = [];
    for (let i = 0; i < numPoints; i++) {
      const theta = (i / numPoints) * Math.PI * 2;
      const noise =
        Math.sin(theta * 7) * baseRadius * 0.1 +
        Math.cos(theta * 4) * baseRadius * 0.1 +
        (Math.random() - 1.2) * baseRadius * 0.05;
      let x =
        cx +
        Math.cos(theta) * (baseRadius + noise) * (1 + 0.25 * Math.sin(theta));
      let y =
        cy +
        Math.sin(theta) *
          (baseRadius + noise) *
          (1 + 0.45 * Math.cos(theta - 0.5));
      x = Math.max(HORIZONTAL_SPACING, Math.min(width - HORIZONTAL_SPACING, x));
      y = Math.max(VERTICAL_SPACING, Math.min(height - VERTICAL_SPACING, y));
      points.push([x, y]);
    }
    if (points.length > 0) {
      points.push([...points[0]]);
    }
    return points;
  };

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

  // Generate milepost coordinates
  const generateMilepostCoords = (
    loopPoints: [number, number][]
  ): { x: number; y: number }[] => {
    const coords: { x: number; y: number }[] = [];
    const numRows = Math.floor(boardHeight / VERTICAL_SPACING);
    const numCols = Math.floor(boardWidth / HORIZONTAL_SPACING);

    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const y = row * VERTICAL_SPACING + VERTICAL_SPACING;
        const x =
          col * HORIZONTAL_SPACING +
          HORIZONTAL_SPACING / 2 +
          (row % 2 === 1 ? HORIZONTAL_SPACING / 2 : 0);
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

  // Memoize the loop points so they don't change every render
  const loopPoints = useMemo(
    () => generateNoisyLoop(boardWidth, boardHeight, 120, 0.5),
    [boardWidth, boardHeight]
  );

  // Generate stable milepost data
  const mileposts = useMemo(() => {
    const coords = generateMilepostCoords(loopPoints);
    const generatedMileposts = coords.map(({ x, y }) => {
      const isMountain = Math.random() < mountainProbability;
      return {
        xCoord: x,
        yCoord: y,
        selected: false,
        color: "black",
        isMountain: isMountain,
        isClickable: currentPhase === GamePhase.BUILD,
        cost: isMountain ? 2 : 1, // Mountain mileposts cost 2, regular mileposts cost 1
        onPointerEnter: () => {},
        onPointerLeave: () => {},
        isPreviewTarget: false,
      };
    });

    // Debug: Log cost distribution
    const mountainCount = generatedMileposts.filter((m) => m.isMountain).length;
    const cost2Count = generatedMileposts.filter((m) => m.cost === 2).length;
    console.log(
      `Generated ${generatedMileposts.length} mileposts: ${mountainCount} mountains, ${cost2Count} with cost=2`
    );

    return generatedMileposts;
  }, [loopPoints, mountainProbability, currentPhase]);

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

  const initializePlayers = (numPlayers: number) => {
    setNumPlayers(numPlayers);
    const newPlayers = Array.from({ length: numPlayers }, (_, i) => {
      return new Player(i, PLAYER_COLORS[i], `Player ${i + 1}`, 50);
    });
    setPlayers(newPlayers);
    gameLogicRef.current = new GameLogic();

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
          prev ? prev.map((p) => (p.getId() === currentPlayer.getId() ? currentPlayer : p)) : []
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
            mountainProbability={mountainProbability}
            players={players}
            currentPlayerIndex={currentPlayerIndex}
            currentRound={currentRoundNumber}
            currentTurn={currentTurnNumber}
            currentPhase={currentPhase}
            onAdvanceGame={handleAdvanceGame}
            mileposts={mileposts}
            loopPoints={loopPoints}
            currentTurnSpending={currentTurnSpending}
            maxTurnSpending={MAX_TURN_SPENDING}
            onSpendingChange={setCurrentTurnSpending}
          />
        </div>
      </div>
    );
  }
};

export default Game;

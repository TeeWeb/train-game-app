import React, { useEffect, useRef, useState, Key } from "react";
import Board from "../game/Board";
import GameLogic from "../game/GameLogic";
import Player from "../game/Player";
import UI from "./UI";

const PLAYER_COLORS = [
  "#FF5733", // Player 1 color
  "#33FF57", // Player 2 color
  "#3357FF", // Player 3 color
  "#F0F033", // Player 4 color
  "#FF33F0", // Player 5 color
  "#33FFF0", // Player 6 color
];

const Game: React.FC = () => {
  const [boardScale, setBoardScale] = useState<number>(1); // Scale for the board
  const [numPlayers, setNumPlayers] = useState<number | null>(null); // Example state for number of players
  const [currentTurnNumber, setCurrentTurnNumber] = useState<number>(1);
  const [currentRoundNumber, setCurrentRoundNumber] = useState<number>(1);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [players, setPlayers] = useState<Player[]>();
  const [winner, setWinner] = useState<Player | null>(null);

  const gameLogicRef = useRef<GameLogic | null>(null);

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
  };

  const resetGame = () => {
    setNumPlayers(null);
    setCurrentTurnNumber(1);
    setCurrentRoundNumber(1);
    setCurrentPlayerIndex(0);
    setPlayers([]);
    setWinner(null);
  };

  const handleEndTurn = () => {
    setCurrentTurnNumber((prev) => prev + 1);
    if (currentPlayerIndex == players.length - 1) {
      setCurrentRoundNumber((prev) => prev + 1);
      setCurrentPlayerIndex(0);
    } else {
      setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
    }
    // Check for game end condition
    setWinner(gameLogicRef.current?.checkForGameEnd(players || []));
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
          position: "relative",
          width: "100%",
          height: "100vh",
        }}
      >
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
        <Board width={1600} height={1200} mountainProbability={0.05} />
        <UI
          playerData={players}
          currentPlayerIndex={currentPlayerIndex}
          endTurn={handleEndTurn}
          updatePlayerBalance={updatePlayerBalance}
        />
      </div>
    );
  }
};

export default Game;

import React, { Key } from "react";
import { Player } from "../types";

interface PlayerPanelProps {
  player: Player;
  isCurrent?: boolean;
  updatePlayerBalance: (playerId: Key, amount: number) => void;
}

const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player,
  isCurrent,
  updatePlayerBalance,
}) => {
  const [addToBalanceInputValue, setAddToBalanceInputValue] =
    React.useState<number>(0);

  const handleAddToBalanceInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setAddToBalanceInputValue(Number(event.target.value));
  };

  const handleUpdateBalance = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (addToBalanceInputValue) {
      // Call the updatePlayerBalance function passed as a prop
      // to update the player's balance
      updatePlayerBalance(
        player.getId(),
        parseInt(addToBalanceInputValue.toString(), 10)
      );
    }
  };

  return (
    <div
      style={{
        border: isCurrent ? "2px solid #222" : "1px solid #ccc",
        borderRadius: 8,
        padding: 12,
        margin: 8,
        background: isCurrent ? "#f8f8e8" : "#fff",
        color: player.getColor(),
        minWidth: 180,
        boxShadow: isCurrent ? "0 0 8px #aaa" : undefined,
      }}
    >
      <h4 style={{ margin: 0 }}>
        {player.getName()} {isCurrent && <span>⭐</span>}
      </h4>
      <div>ID: {player.getId()}</div>
      <div>Balance: ${player.getBalance()}m</div>
      {/* Add more player info here as needed */}
      <div>
        Position: {player.getPosition() !== null ? player.getPosition() : "N/A"}
      </div>
      <div>
        <input
          type="number"
          value={addToBalanceInputValue}
          onChange={handleAddToBalanceInputChange}
          placeholder="Add to Balance"
          style={{ margin: 8, maxWidth: 120 }}
        />
        <button type="submit" style={{ margin: 8, maxWidth: 120 }}>
          Change Balance
        </button>
      </div>
    </div>
  );
};

export default PlayerPanel;

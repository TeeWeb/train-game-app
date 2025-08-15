import React, { useState } from "react";
import PlayerPanel from "./PlayerPanel";
import Player from "../game/Player";

const UI = ({
  playerData,
  currentPlayerIndex,
  endTurn,
  updatePlayerBalance,
}) => {
  const [players, setPlayers] = useState<Player[]>(playerData);

  return (
    <div className="ui">
      <h2>Players</h2>
      {players?.map((player) => (
        <PlayerPanel
          key={player.getId()}
          player={player}
          isCurrent={player.getId() === players[currentPlayerIndex]?.getId()}
          updatePlayerBalance={updatePlayerBalance}
        />
      ))}
      <button onClick={endTurn} style={{ margin: 8 }}>
        End Turn
      </button>
    </div>
  );
};

export default UI;

import React, { useState, useEffect } from "react";
import { gameLogger, GameLogEntry } from "../utils/gameLogger";

const GameLog: React.FC = () => {
  const [logs, setLogs] = useState<GameLogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    // Subscribe to log updates
    const unsubscribe = gameLogger.subscribe(setLogs);

    // Get initial logs
    setLogs(gameLogger.getLogs());

    return unsubscribe;
  }, []);

  const formatTime = (timestamp: Date): string => {
    return timestamp.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const clearLogs = () => {
    gameLogger.clear();
  };

  return (
    <div
      style={{
        position: "relative",
        width: "400px",
        maxHeight: isExpanded ? "300px" : "40px",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        border: "2px solid #333",
        borderRadius: "8px",
        overflow: "hidden",
        fontFamily: "monospace",
        fontSize: "12px",
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          backgroundColor: "#f0f0f0",
          borderBottom: isExpanded ? "1px solid #ccc" : "none",
          cursor: "pointer",
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <strong>Game Log ({logs.length})</strong>
        <div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearLogs();
            }}
            style={{
              marginRight: "8px",
              padding: "2px 6px",
              fontSize: "10px",
              border: "1px solid #ccc",
              borderRadius: "3px",
              backgroundColor: "#fff",
              cursor: "pointer",
            }}
          >
            Clear
          </button>
          <span style={{ cursor: "pointer" }}>{isExpanded ? "▼" : "▲"}</span>
        </div>
      </div>

      {/* Log entries */}
      {isExpanded && (
        <div
          style={{
            maxHeight: "250px",
            overflowY: "auto",
            padding: "4px",
          }}
        >
          {logs.length === 0 ? (
            <div style={{ padding: "8px", color: "#666", textAlign: "center" }}>
              No actions logged yet
            </div>
          ) : (
            logs
              .slice()
              .reverse()
              .map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    padding: "4px 8px",
                    borderBottom: "1px solid #eee",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: "bold",
                        color: entry.playerColor || "#000",
                      }}
                    >
                      {entry.action}
                    </span>
                    <span style={{ color: "#666", fontSize: "10px" }}>
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>
                  <div style={{ color: "#444" }}>
                    {entry.playerName && (
                      <span style={{ color: entry.playerColor || "#000" }}>
                        [{entry.playerName}]
                      </span>
                    )}
                    {entry.details}
                  </div>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
};

export default GameLog;

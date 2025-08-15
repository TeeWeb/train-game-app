export interface GameLogEntry {
  id: string;
  timestamp: Date;
  action: string;
  details: string;
  playerId?: number;
  playerName?: string;
  playerColor?: string;
}

export class GameLogger {
  private logs: GameLogEntry[] = [];
  private listeners: ((logs: GameLogEntry[]) => void)[] = [];

  public log(action: string, details: string, playerId?: number, playerName?: string, playerColor?: string): void {
    const entry: GameLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      action,
      details,
      playerId,
      playerName,
      playerColor
    };

    this.logs.push(entry);
    
    // Keep only the last 50 logs to prevent memory issues
    if (this.logs.length > 50) {
      this.logs = this.logs.slice(-50);
    }

    // Notify all listeners
    this.listeners.forEach(listener => listener([...this.logs]));
  }

  public getLogs(): GameLogEntry[] {
    return [...this.logs];
  }

  public subscribe(listener: (logs: GameLogEntry[]) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public clear(): void {
    this.logs = [];
    this.listeners.forEach(listener => listener([]));
  }
}

// Create a singleton instance
export const gameLogger = new GameLogger();

import Line from "./Line";
import type Milepost from "./Milepost";
import Board from "./Board";
import Player from "./Player";

export default class GameLogic {
  private selectedMileposts: Milepost[] = [];
  private lines: Line[] = [];

  public selectDot(dot: Milepost): void {
    console.log("Selecting dot:", dot);
    if (this.isDotSelectable(dot)) {
      this.selectedMileposts.push(dot);
      this.checkForLine();
    }
  }

  private isDotSelectable(dot: Milepost): boolean {
    return !this.selectedMileposts.includes(dot);
  }

  private checkForLine(): void {
    if (this.selectedMileposts.length === 2) {
      const line = new Line(
        this.selectedMileposts[0],
        this.selectedMileposts[1]
      );
      if (this.isValidLine(line)) {
        this.lines.push(line);
        this.resetSelection();
      } else {
        this.resetSelection();
      }
      console.log("Lines:", this.lines);
    }
  }

  private isValidLine(line: Line): boolean {
    // Implement game rules to validate the line
    return true; // Placeholder for actual validation logic
  }

  private resetSelection(): void {
    this.selectedMileposts = [];
  }

  public getLines(): Line[] {
    return this.lines;
  }

  public getSelectedMileposts(): Milepost[] {
    console.log("Selected Mileposts:", this.selectedMileposts);
    return this.selectedMileposts;
  }

  public checkForGameEnd(players: Player[]): Player {
    for (const player of players) {
      if (player.getBalance() >= 250) {
        return player; // Game ends if any player runs out of balance
      }
    }
  }
}

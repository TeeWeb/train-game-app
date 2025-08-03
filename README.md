# Board Game App

## Overview

This project is a web-based game modeled after a board game, where players can connect dots on a 2D map by drawing lines between selected dots. The game features a bordered area to restrict drawing outside the designated game area.

## Project Structure

```
board-game-app
├── public
│   └── index.html          # Main HTML entry point for the game
├── src
│   ├── index.ts           # Main entry point for the TypeScript application
│   ├── game
│   │   ├── Board.ts       # Manages the game board
│   │   ├── Dot.ts         # Represents a dot on the board
│   │   ├── Line.ts        # Represents a line drawn between two dots
│   │   └── GameLogic.ts   # Core game logic and state management
│   ├── components
│   │   ├── GameBoard.ts    # React component for rendering the game board
│   │   └── UI.ts           # React component for user interface elements
│   └── types
│       └── index.ts        # Types and interfaces used throughout the project
├── package.json            # npm configuration file
├── tsconfig.json           # TypeScript configuration file
└── README.md               # Project documentation
```

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd board-game-app
   ```
3. Install the dependencies:
   ```
   npm install
   ```
4. Start the development server:
   ```
   npm start
   ```

## Game Rules

- Players take turns selecting two dots on the board.
- A line can be drawn between the selected dots if it adheres to the game rules.

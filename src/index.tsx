// This file is the main entry point for the TypeScript application. It initializes the game, sets up the rendering context, and starts the game loop.

import React from "react";
import ReactDOM from "react-dom/client";
import Game from "./components/Game";
import "../styles.css"; // Assuming you have a styles.css for basic styling
import UI from "./components/UI";

const App = () => {
  return (
    <div id="root" className="app-container">
      <h1>The Train Game</h1>
      <Game />
    </div>
  );
};

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}

// This file is the main entry point for the TypeScript application. It initializes the game, sets up the rendering context, and starts the game loop.

import React from 'react';
import ReactDOM from 'react-dom';
import GameBoard from './components/GameBoard';
import './styles.css'; // Assuming you have a styles.css for basic styling

const App = () => {
    return (
        <div>
            <h1>Board Game</h1>
            <GameBoard />
        </div>
    );
};

ReactDOM.render(<App />, document.getElementById('root'));
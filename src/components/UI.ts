import React from 'react';

const UI: React.FC = () => {
    return (
        <div className="ui">
            <h1>Board Game</h1>
            <div className="score">
                <span>Score: 0</span>
            </div>
            <button onClick={() => alert('Game Started!')}>Start Game</button>
        </div>
    );
};

export default UI;
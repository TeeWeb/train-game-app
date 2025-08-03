import React, { useEffect, useRef } from 'react';
import { Board } from '../game/Board';
import { GameLogic } from '../game/GameLogic';

const GameBoard: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const board = new Board();
    const gameLogic = new GameLogic();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const context = canvas.getContext('2d');
            if (context) {
                board.initialize(context);
                gameLogic.initialize(board);
            }
        }
    }, [board, gameLogic]);

    const handleMouseClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            gameLogic.handleClick(x, y);
            board.draw(context);
        }
    };

    return (
        <canvas
            ref={canvasRef}
            width={800}
            height={600}
            onClick={handleMouseClick}
            style={{ border: '2px solid black' }}
        />
    );
};

export default GameBoard;
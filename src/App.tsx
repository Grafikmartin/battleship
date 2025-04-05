// battleship/src/App.tsx
import { useState, useEffect } from 'react';
import { initializeGame, handlePlayerMove, handleComputerMove } from './utils/gameLogic';
import { GameState, CellState } from './types';
import './App.css';

function App() {
  const [gameState, setGameState] = useState<GameState>(() => initializeGame());

  useEffect(() => {
    const handleGameStateUpdate = (event: CustomEvent<GameState>) => {
      setGameState(event.detail);
    };

    window.addEventListener('updateGameState', handleGameStateUpdate as EventListener);

    return () => {
      window.removeEventListener('updateGameState', handleGameStateUpdate as EventListener);
    };
  }, []);

  const handleCellClick = async (row: number, col: number) => {
    if (!gameState.isPlayerTurn || gameState.gameOver || gameState.isProcessingMove) return;

    // Handle player's move
    const newState = await handlePlayerMove(gameState, row, col);
    setGameState(newState);
    
    // Handle computer's move after a 1 second delay if it's the computer's turn
    if (!newState.gameOver && !newState.isPlayerTurn) {
      setTimeout(async () => {
        const computerMoveState = await handleComputerMove(newState);
        setGameState(computerMoveState);
      }, 1000);
    }
  };

  const renderCell = (cellState: CellState, row: number, col: number, isPlayerBoard: boolean) => {
    let cellClass = 'cell ';
    let content = '';

    if (!isPlayerBoard && cellState === 'ship') {
      cellClass += 'cell-water';
    } else {
      switch (cellState) {
        case 'water':
          cellClass += 'cell-water';
          break;
        case 'ship':
          cellClass += 'cell-ship';
          content = isPlayerBoard ? '🚢' : '';
          break;
        case 'hit':
          cellClass += 'cell-hit';
          content = '💥';
          break;
        case 'miss':
          cellClass += 'cell-miss';
          content = '•';
          break;
        case 'sunk':
          cellClass += 'cell-sunk';
          content = '💥';
          break;
      }
    }

    return (
      <div 
        key={`${row}-${col}`}
        className={cellClass}
        onClick={isPlayerBoard ? undefined : () => handleCellClick(row, col)}
      >
        {content}
      </div>
    );
  };

  const renderBoard = (board: CellState[][], isPlayerBoard: boolean) => {
    if (!board) return <div>Lade Spielfeld...</div>;
    
    return (
      <div className="game-board">
        <div className="board-grid">
          {board.map((row, rowIndex) => 
            row.map((cell, colIndex) => 
              renderCell(cell, rowIndex, colIndex, isPlayerBoard)
            )
          )}
        </div>
      </div>
    );
  };

  const startNewGame = () => {
    setGameState(initializeGame());
  };

  return (
    <div className="game-container">
      <div className="header">
        <h1>Battleship Game</h1>
      </div>
      
      <div className="status-bar">
        <div>Schüsse: {gameState.shots}</div>
        <div>Verbleibende Schüsse: {gameState.remainingShots}</div>
        {gameState.bestScore !== null && <div>Bestleistung: {gameState.bestScore}</div>}
        {!gameState.gameOver && (
          <div><strong>{gameState.isPlayerTurn ? "Du bist dran!" : "Computer denkt nach..."}</strong></div>
        )}
        {gameState.gameOver && gameState.winner && (
          <div><strong>{gameState.winner === 'player' ? "Du hast gewonnen!" : "Der Computer hat gewonnen!"}</strong></div>
        )}
      </div>
      
      <div className="instructions">
        <p><strong>So spielst du:</strong></p>
        <p>Klicke auf das Computer-Brett (rechts), um darauf zu schießen.</p>
        <p>Du hast {gameState.remainingShots} Schüsse pro Runde!</p>
        <p>Triff alle Schiffe des Computers, bevor er deine Schiffe versenkt!</p>
      </div>
      
      <div className="game-boards">
        <div className="board-container">
          <h2 className="board-title">Dein Spielfeld</h2>
          {renderBoard(gameState.playerBoard, true)}
        </div>
        
        <div className="board-container">
          <h2 className="board-title">Computer-Spielfeld</h2>
          <div style={{ position: 'relative' }}>
            {renderBoard(gameState.computerBoard, false)}
            {gameState.isPlayerTurn && (
              <div className="board-indicator">➡️</div>
            )}
          </div>
        </div>
      </div>
      
      <div style={{ textAlign: 'center' }}>
        <button className="new-game-button" onClick={startNewGame}>
          Spiel neu starten
        </button>
      </div>
    </div>
  );
}

export default App;

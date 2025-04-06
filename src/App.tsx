// battleship/src/App.tsx
import { useState, useEffect } from 'react';
import { initializeGame, handlePlayerMove, handleComputerMove } from './utils/gameLogic';
import { GameState, CellState } from './types';
import './App.css';

function App() {
  const [gameState, setGameState] = useState<GameState>(() => initializeGame());
  const [fadeState, setFadeState] = useState<'in' | 'out' | 'none'>('none');
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const handleGameStateUpdate = (event: CustomEvent<GameState>) => {
      // Wenn sich der aktive Spieler ändert, starten wir die Fade-Animation
      if (event.detail.isPlayerTurn !== gameState.isPlayerTurn) {
        setFadeState('out');
        
        // Nach dem Ausblenden den Zustand aktualisieren und dann wieder einblenden
        setTimeout(() => {
          setGameState(event.detail);
          setFadeState('in');
        }, 200); // Dauer des Ausblendens
      } else {
        // Wenn sich der aktive Spieler nicht ändert, aktualisieren wir den Zustand direkt
        setGameState(event.detail);
      }
    };

    window.addEventListener('updateGameState', handleGameStateUpdate as EventListener);

    return () => {
      window.removeEventListener('updateGameState', handleGameStateUpdate as EventListener);
    };
  }, [gameState.isPlayerTurn]);

// battleship/src/App.tsx - Modified handleCellClick function
const handleCellClick = async (row: number, col: number) => {
  if (!gameState.isPlayerTurn || gameState.gameOver || gameState.isProcessingMove) return;

  // Handle player's move
  const newState = await handlePlayerMove(gameState, row, col);
  setGameState(newState);
  
  // Handle computer's move after a delay if it's the computer's turn
  if (!newState.gameOver && !newState.isPlayerTurn) {
    // Wait 1.5 seconds after the third shot before transitioning
    const delayTime = 1500; // 1.5 seconds in milliseconds
    
    // No fade animation - directly update the state after delay
    setTimeout(async () => {
      const computerMoveState = await handleComputerMove(newState);
      setGameState(computerMoveState);
    }, delayTime);
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

  // Bestimme, welches Spielfeld angezeigt werden soll
  const activeBoard = gameState.isPlayerTurn ? gameState.computerBoard : gameState.playerBoard;
  const isPlayerActive = gameState.isPlayerTurn;
  
  // CSS-Klasse für die Fade-Animation
  const fadeClass = fadeState === 'none' ? '' : fadeState === 'in' ? 'fade-in' : 'fade-out';

  return (
    <div className="game-container">
      <div className="header">
        <h1>Battleship Game</h1>
      </div>
      
      <div className="status-bar">
        <div>Schüsse: {gameState.shots}</div>
        <div>Verbleibende Schüsse: {gameState.remainingShots}</div>
        {gameState.bestScore !== null && <div>Bestleistung: {gameState.bestScore}</div>}
        {gameState.gameOver && gameState.winner && (
          <div><strong>{gameState.winner === 'player' ? "Du hast gewonnen!" : "Der Computer hat gewonnen!"}</strong></div>
        )}
      </div>
      
      <div className="instructions-container">
        <button 
          className="instructions-toggle"
          onClick={() => setShowInstructions(!showInstructions)}
        >
          <span className="material-icons">help</span>
        </button>
        {showInstructions && (
          <div className="instructions">
            <p><strong>So spielst du:</strong></p>
            <p>Klicke auf das Computer-Brett, um darauf zu schießen.</p>
            <p>Du hast {gameState.remainingShots} Schüsse pro Runde!</p>
            <p>Triff alle Schiffe des Computers, bevor er deine Schiffe versenkt!</p>
          </div>
        )}
      </div>
      
      <div className="game-boards">
        <div className="board-container">
          <h2 className="board-title">
            {isPlayerActive ? "Computer-Spielfeld" : "Dein Spielfeld"}
            {!gameState.gameOver && (
              <div className="turn-indicator">
                {isPlayerActive ? "Du bist dran!" : "Der Computer ist dran!"}
              </div>
            )}
          </h2>
          <div className={`board-wrapper ${fadeClass}`}>
            {renderBoard(activeBoard, !isPlayerActive)}
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

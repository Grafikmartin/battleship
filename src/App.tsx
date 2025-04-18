// battleship/src/App.tsx
import React, { useState, useEffect } from 'react';
import Game from './components/Game';
import { initializeGame, handlePlayerMove, handleComputerMove } from './utils/gameLogic';
import { GameState, CellState, Ship, GameBoard } from './types';
import { ShipSetup } from './components/ShipSetup';
import './App.css';

function App() {
  const [gameState, setGameState] = useState<GameState>(() => ({
    ...initializeGame(),
    setupPhase: true,
  }));
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const handleGameStateUpdate = (event: CustomEvent<GameState>) => {
      setGameState(prevState => ({
        ...event.detail,
        setupPhase: prevState.setupPhase
      }));
    };

    window.addEventListener('updateGameState', handleGameStateUpdate as EventListener);

    return () => {
      window.removeEventListener('updateGameState', handleGameStateUpdate as EventListener);
    };
  }, []);

  // Inline Sound Toggle statt externe Komponente
  const SimpleSoundToggle = () => {
    const [muted, setMuted] = useState(() => {
      // Lese den initialen Status aus dem localStorage
      const savedState = localStorage.getItem('soundEnabled');
      return savedState === 'false'; // Wenn 'false', dann ist Sound deaktiviert
    });
    
    return (
      <button 
        style={{
          position: 'absolute', 
          top: '10px', 
          right: '60px',
          background: 'black',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '50%',
          border: '2px solid white',
          fontWeight: 'bold',
          zIndex: 1000
        }}
        onClick={() => {
          const newMuted = !muted;
          setMuted(newMuted);
          localStorage.setItem('soundEnabled', (!newMuted).toString());
          console.log("Sound changed to:", newMuted ? "muted" : "unmuted");
        }}
      >
        {muted ? '🔇' : '🔊'}
      </button>
    );
  };
  
  const handleSetupComplete = (playerBoard: GameBoard, playerShips: Ship[]) => {
    // Initialisiere das Spiel mit den vom Spieler platzierten Schiffen
    const initialState = initializeGame();
    
    setGameState({
      ...initialState,
      playerBoard,
      playerShips,
      setupPhase: false
    });
  };

  // Die handleCellClick-Funktion aktualisieren, um Treffer sofort anzuzeigen
  const handleCellClick = async (row: number, col: number) => {
    if (!gameState.isPlayerTurn || gameState.gameOver || gameState.isProcessingMove) return;

    // Sofortige visuelle Aktualisierung für den Schuss des Spielers erstellen
    const isHit = gameState.computerBoard[row][col] === 'ship';
    const immediateState = { ...gameState, isProcessingMove: true };
    
    // Eine Kopie des Spielfelds erstellen und die getroffene Zelle sofort aktualisieren
    immediateState.computerBoard = [...gameState.computerBoard];
    immediateState.computerBoard[row] = [...gameState.computerBoard[row]];
    immediateState.computerBoard[row][col] = isHit ? 'hit' : 'miss';
    
    // UI sofort aktualisieren, bevor die vollständige Zugslogik verarbeitet wird
    setGameState(immediateState);
    
    // Dann die komplette Zugslogik verarbeiten
    const newState = await handlePlayerMove(gameState, row, col);
    setGameState(newState);
    
    // Computeraktion nach einer Verzögerung ausführen, wenn der Computer am Zug ist
    if (!newState.gameOver && !newState.isPlayerTurn) {
      const delayTime = 1500; // 1,5 Sekunden Verzögerung
      
      setTimeout(async () => {
        const computerMoveState = await handleComputerMove(newState);
        setGameState(computerMoveState);
      }, delayTime);
    }
  };

  const renderCell = (cellState: CellState, row: number, col: number, isPlayerBoard: boolean) => {
    let cellClass = 'cell ';
    let content = '';

    // Prüfen ob Zelle anvisierbar ist
    const isTargetable = !isPlayerBoard && 
                        gameState.isPlayerTurn && 
                        cellState !== 'hit' && 
                        cellState !== 'miss' && 
                        cellState !== 'sunk';

    if (isTargetable) {
      cellClass += 'cell-targetable ';
    }

    // Fadenkreuz für Computer-Ziel anzeigen
    if (!gameState.isPlayerTurn && !isPlayerBoard && gameState.computerTarget === `${row}-${col}`) {
      cellClass += 'cell-computer-target ';
    }

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
    setGameState({
      ...initializeGame(),
      setupPhase: true
    });
  };

  // Wenn wir in der Setup-Phase sind, zeige die ShipSetup-Komponente
  if (gameState.setupPhase) {
    return <ShipSetup onComplete={handleSetupComplete} />;
  }

  // Bestimme, welches Spielfeld angezeigt werden soll
  const activeBoard = gameState.isPlayerTurn ? gameState.computerBoard : gameState.playerBoard;
  const isPlayerActive = gameState.isPlayerTurn;

  return (
    <div className="App">
      <SimpleSoundToggle />
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
          {/* Statusmeldung hier */}
          <div className="status-message"><p>{gameState.message}</p></div>
        </div>
        
        <div className="instructions-container">
          <button 
            className="instructions-toggle"
            onClick={() => setShowInstructions(!showInstructions)}
          >
            <span className="material-symbols-outlined">help</span>
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
            <div className="board-wrapper">
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
    </div>
  );
}

export default App;
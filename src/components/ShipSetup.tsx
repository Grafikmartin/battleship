// components/ShipSetup.tsx
import React, { useState } from 'react';
import { ShipType, GameBoard, Ship, CellState } from '../types';

interface ShipSetupProps {
  onComplete: (playerBoard: GameBoard, playerShips: Ship[]) => void;
}

export const ShipSetup: React.FC<ShipSetupProps> = ({ onComplete }) => {
  const [board, setBoard] = useState<GameBoard>(createEmptyBoard());
  const [ships, setShips] = useState<ShipType[]>([
    { id: 'battleship', length: 5, isPlaced: false, orientation: 'horizontal' },
    { id: 'cruiser', length: 4, isPlaced: false, orientation: 'horizontal' },
    { id: 'destroyer1', length: 3, isPlaced: false, orientation: 'horizontal' },
    { id: 'destroyer2', length: 3, isPlaced: false, orientation: 'horizontal' },
    { id: 'submarine', length: 2, isPlaced: false, orientation: 'horizontal' },
  ]);
  const [draggingShip, setDraggingShip] = useState<ShipType | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{row: number, col: number} | null>(null);

  const handleDragStart = (ship: ShipType) => {
    setDraggingShip(ship);
  };

  const handleDragOver = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    setPreviewPosition({ row, col });
  };

  const isValidPlacement = (ship: ShipType, row: number, col: number): boolean => {
    if (!ship) return false;

    const isHorizontal = ship.orientation === 'horizontal';
    
    // Prüfe ob das Schiff innerhalb des Spielfelds liegt
    if (isHorizontal && col + ship.length > 10) return false;
    if (!isHorizontal && row + ship.length > 10) return false;

    // Prüfe auf Überlappungen und benachbarte Schiffe
    for (let r = Math.max(0, row - 1); r <= Math.min(9, row + (isHorizontal ? 1 : ship.length)); r++) {
      for (let c = Math.max(0, col - 1); c <= Math.min(9, col + (isHorizontal ? ship.length : 1)); c++) {
        if (r >= 0 && r < 10 && c >= 0 && c < 10 && board[r][c] === 'ship') return false;
      }
    }

    return true;
  };

  const handleDrop = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    if (!draggingShip) return;

    if (isValidPlacement(draggingShip, row, col)) {
      const newBoard = [...board.map(row => [...row])];
      const isHorizontal = draggingShip.orientation === 'horizontal';
      const positions: number[][] = [];

      // Platziere das Schiff
      for (let i = 0; i < draggingShip.length; i++) {
        const r = isHorizontal ? row : row + i;
        const c = isHorizontal ? col + i : col;
        newBoard[r][c] = 'ship';
        positions.push([r, c]);
      }

      setBoard(newBoard);
      setShips(ships.map(ship => 
        ship.id === draggingShip.id 
          ? { ...ship, isPlaced: true, positions } 
          : ship
      ));
    }

    setDraggingShip(null);
    setPreviewPosition(null);
  };

  const rotateShip = (shipId: string) => {
    setShips(ships.map(ship =>
      ship.id === shipId
        ? { ...ship, orientation: ship.orientation === 'horizontal' ? 'vertical' : 'horizontal' }
        : ship
    ));
  };

  const randomizePlacement = () => {
    const newBoard = createEmptyBoard();
    const newShips = [...ships];
    
    newShips.forEach(ship => {
      let placed = false;
      while (!placed && !ship.isPlaced) {
        const row = Math.floor(Math.random() * 10);
        const col = Math.floor(Math.random() * 10);
        const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
        
        ship.orientation = orientation;
        
        if (isValidPlacement({ ...ship, orientation }, row, col)) {
          const isHorizontal = orientation === 'horizontal';
          const positions: number[][] = [];
          
          for (let i = 0; i < ship.length; i++) {
            const r = isHorizontal ? row : row + i;
            const c = isHorizontal ? col + i : col;
            newBoard[r][c] = 'ship';
            positions.push([r, c]);
          }
          
          ship.isPlaced = true;
          ship.positions = positions;
          placed = true;
        }
      }
    });

    setBoard(newBoard);
    setShips(newShips);
  };

  const resetPlacement = () => {
    setBoard(createEmptyBoard());
    setShips(ships.map(ship => ({ ...ship, isPlaced: false, positions: undefined })));
  };

  const handleComplete = () => {
    // Konvertiere ShipType zu Ship für die Übergabe an die Hauptkomponente
    const playerShips: Ship[] = ships.map(ship => ({
      length: ship.length,
      positions: ship.positions || [],
      hits: 0,
      isSunk: false
    }));
    
    onComplete(board, playerShips);
  };

  const renderCell = (row: number, col: number) => {
    let cellClass = 'cell ';
    let isPreview = false;

    if (previewPosition && draggingShip) {
      const isHorizontal = draggingShip.orientation === 'horizontal';
      if (isHorizontal && row === previewPosition.row && 
          col >= previewPosition.col && col < previewPosition.col + draggingShip.length) {
        isPreview = true;
      }
      if (!isHorizontal && col === previewPosition.col && 
          row >= previewPosition.row && row < previewPosition.row + draggingShip.length) {
        isPreview = true;
      }
    }

    if (isPreview) {
      const isValid = isValidPlacement(draggingShip!, previewPosition.row, previewPosition.col);
      cellClass += isValid ? 'cell-preview-valid' : 'cell-preview-invalid';
    } else {
      cellClass += board[row][col] === 'ship' ? 'cell-ship' : 'cell-water';
    }

    return (
      <div
        key={`${row}-${col}`}
        className={cellClass}
        onDragOver={(e) => handleDragOver(e, row, col)}
        onDrop={(e) => handleDrop(e, row, col)}
      />
    );
  };

  return (
    <div className="setup-container">
      <h2>Platziere deine Schiffe</h2>
      
      <div className="setup-controls">
        <button onClick={randomizePlacement}>Zufällige Platzierung</button>
        <button onClick={resetPlacement}>Zurücksetzen</button>
        {ships.every(ship => ship.isPlaced) && (
          <button onClick={handleComplete} className="start-game-button">Spiel starten</button>
        )}
      </div>

      <div className="setup-area">
        <div className="game-board">
          <div className="board-grid">
            {Array(10).fill(null).map((_, rowIndex) =>
              Array(10).fill(null).map((_, colIndex) => renderCell(rowIndex, colIndex))
            )}
          </div>
        </div>

        <div className="ships-dock">
          <h3>Verfügbare Schiffe</h3>
          <p>Klicke zum Drehen, ziehe zum Platzieren</p>
          {ships.map(ship => !ship.isPlaced && (
            <div
              key={ship.id}
              className={`dock-ship ship-length-${ship.length} ${ship.orientation}`}
              draggable
              onDragStart={() => handleDragStart(ship)}
              onClick={() => rotateShip(ship.id)}
            >
              <div className="ship-handle"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Hilfsfunktion zum Erstellen eines leeren Spielfelds
const createEmptyBoard = (): GameBoard => {
  return Array(10).fill(null)
    .map(() => Array(10).fill('water'));
};

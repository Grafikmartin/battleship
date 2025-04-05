import { CellState } from '../types';
import Cell from './Cell';

interface GameBoardProps {
  board: CellState[][];
  onClick?: (row: number, col: number) => void;
  isPlayerBoard: boolean;
}

const GameBoard = ({ board, onClick, isPlayerBoard }: GameBoardProps) => {
  const handleCellClick = (row: number, col: number) => {
    if (onClick) onClick(row, col);
  };

  return (
    <div className="inline-block p-1 bg-gray-300 rounded-md border-2 border-gray-500">
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 30px)', gap: '2px' }}>
        {board.map((row, rowIndex) => 
          row.map((cellState, colIndex) => (
            <Cell
              key={`${rowIndex}-${colIndex}`}
              state={cellState}
              onClick={() => handleCellClick(rowIndex, colIndex)}
              isPlayerBoard={isPlayerBoard}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default GameBoard;

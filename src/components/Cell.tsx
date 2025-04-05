import { CellState } from '../types';

interface CellProps {
  state: CellState;
  onClick: () => void;
  isPlayerBoard: boolean;
}

const Cell = ({ state, onClick, isPlayerBoard }: CellProps) => {
  // Hilfsfunktion für die Hintergrundfarbe
  const getBgColor = () => {
    if (!isPlayerBoard && state === 'ship') return 'bg-blue-400'; // Verstecke Schiffe auf dem Computerbrett
    
    switch (state) {
      case 'water': return 'bg-blue-400';
      case 'ship': return 'bg-gray-600';
      case 'hit': return 'bg-red-500';
      case 'miss': return 'bg-gray-300';
      default: return 'bg-blue-400';
    }
  };

  // Hilfsfunktion für den Inhalt
  const getContent = () => {
    switch (state) {
      case 'hit': return '💥';
      case 'miss': return '•';
      case 'ship': return isPlayerBoard ? '🚢' : '';
      default: return '';
    }
  };

  return (
    <div 
      className={`h-[30px] w-[30px] flex items-center justify-center ${getBgColor()} border border-gray-700 cursor-pointer`}
      onClick={onClick}
    >
      {getContent()}
    </div>
  );
};

export default Cell;

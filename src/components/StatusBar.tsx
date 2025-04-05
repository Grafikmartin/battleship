interface StatusBarProps {
  shots: number;
  bestScore: number | null;
  isPlayerTurn: boolean;
  gameOver: boolean;
  winner: 'player' | 'computer' | null;
}

const StatusBar = ({ shots, bestScore, isPlayerTurn, gameOver, winner }: StatusBarProps) => {
  return (
    <div className="mb-4 p-4 bg-gray-100 rounded text-center">
      <div className="mb-2">Schüsse: {shots}</div>
      {bestScore !== null && <div className="mb-2">Bestleistung: {bestScore}</div>}
      
      {!gameOver && (
        <div className="font-bold text-blue-600">
          {isPlayerTurn ? "Du bist dran!" : "Computer denkt nach..."}
        </div>
      )}
      
      {gameOver && winner && (
        <div className="font-bold text-xl">
          {winner === 'player' ? "Du hast gewonnen!" : "Der Computer hat gewonnen!"}
        </div>
      )}
    </div>
  );
};

export default StatusBar;

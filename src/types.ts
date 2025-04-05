export type CellState = 'water' | 'ship' | 'hit' | 'miss';

export type Ship = {
  length: number;
  positions: number[][];
  hits: number;
};

export type GameBoard = CellState[][];

export type GameState = {
  playerBoard: GameBoard;
  computerBoard: GameBoard;
  playerShips: Ship[];
  computerShips: Ship[];
  isPlayerTurn: boolean;
  shots: number;
  bestScore: number | null;
  gameOver: boolean;
  winner: 'player' | 'computer' | null;
};

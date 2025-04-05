// battleship/src/types.ts
export type CellState = 'water' | 'ship' | 'hit' | 'miss' | 'sunk';  // Added 'sunk' state

export type Ship = {
  length: number;
  positions: number[][];
  hits: number;
  isSunk?: boolean;  // New property to track if ship is sunk
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
  remainingShots: number;  // Property for tracking player's remaining shots
  computerRemainingShots?: number;  // Property for tracking computer's remaining shots
  lastHit?: [number, number] | null;  // Track last hit position for computer AI
  isProcessingMove?: boolean;  // Flag to track if a move is being processed
};

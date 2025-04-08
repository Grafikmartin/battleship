// battleship/src/types.ts
export type CellState = 'water' | 'ship' | 'hit' | 'miss' | 'sunk' | 'invalid';  // Added 'invalid' state

export type Ship = {
  length: number;
  positions: number[][];
  hits: number;
  isSunk?: boolean;  // Property to track if ship is sunk
};

export type GameBoard = CellState[][];

// Neue Typen für die Schiffsplatzierung
export type ShipType = {
  id: string;
  length: number;
  isPlaced: boolean;
  orientation: 'horizontal' | 'vertical';
  positions?: number[][];  // Optional für die Konvertierung zu Ship
};

export type DraggingState = {
  shipId: string | null;
  isValid: boolean;
  position: { row: number; col: number } | null;
};

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
  computerTarget?: string | null;  // Speichert die aktuelle Zielposition der KI
  
  // Neue Properties für die Schiffsplatzierung
  setupPhase?: boolean;
  
  // Nachrichtenfeld für Statusmeldungen
  message: string;
};

// Entferne diese doppelte Definition:
// export interface GameState {
//   // ...vorhandene Eigenschaften
//   message: string;
// }
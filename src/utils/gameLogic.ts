import { GameState, GameBoard, Ship, CellState } from '../types';

const BOARD_SIZE = 10;
const SHIPS = [
  { length: 5, count: 1 },
  { length: 4, count: 1 },
  { length: 3, count: 2 },
  { length: 2, count: 1 },
];

export const initializeGame = (): GameState => {
  const playerBoard = createEmptyBoard();
  const computerBoard = createEmptyBoard();
  const playerShips = placeShips(playerBoard);
  const computerShips = placeShips(computerBoard);

  // Get best score from localStorage
  const savedBestScore = localStorage.getItem('bestScore');
  const bestScore = savedBestScore ? Number(savedBestScore) : null;

  return {
    playerBoard,
    computerBoard,
    playerShips,
    computerShips,
    isPlayerTurn: true,
    shots: 0,
    bestScore,
    gameOver: false,
    winner: null,
  };
};

const createEmptyBoard = (): GameBoard => {
  return Array(BOARD_SIZE).fill(null)
    .map(() => Array(BOARD_SIZE).fill('water'));
};

const canPlaceShip = (
  board: GameBoard,
  row: number,
  col: number,
  length: number,
  horizontal: boolean
): boolean => {
  // Check if the ship fits on the board
  if (horizontal) {
    if (col + length > BOARD_SIZE) return false;
  } else {
    if (row + length > BOARD_SIZE) return false;
  }

  // Check if there's another ship nearby (including diagonals)
  for (let r = Math.max(0, row - 1); r <= Math.min(BOARD_SIZE - 1, row + (horizontal ? 1 : length)); r++) {
    for (let c = Math.max(0, col - 1); c <= Math.min(BOARD_SIZE - 1, col + (horizontal ? length : 1)); c++) {
      if (board[r][c] === 'ship') {
        return false;
      }
    }
  }

  return true;
};

const placeShip = (
  board: GameBoard,
  row: number,
  col: number,
  length: number,
  horizontal: boolean
): number[][] => {
  const positions: number[][] = [];

  for (let i = 0; i < length; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;
    board[r][c] = 'ship';
    positions.push([r, c]);
  }

  return positions;
};

const placeShips = (board: GameBoard): Ship[] => {
  const ships: Ship[] = [];
  
  SHIPS.forEach(({ length, count }) => {
    for (let i = 0; i < count; i++) {
      let placed = false;
      while (!placed) {
        const horizontal = Math.random() < 0.5;
        const row = Math.floor(Math.random() * BOARD_SIZE);
        const col = Math.floor(Math.random() * BOARD_SIZE);
        
        if (canPlaceShip(board, row, col, length, horizontal)) {
          const positions = placeShip(board, row, col, length, horizontal);
          ships.push({ length, positions, hits: 0 });
          placed = true;
        }
      }
    }
  });

  return ships;
};

export const handlePlayerMove = (gameState: GameState, row: number, col: number): GameState => {
  // If cell was already clicked or it's not the player's turn, return unchanged
  if (gameState.computerBoard[row][col] === 'hit' || gameState.computerBoard[row][col] === 'miss' || !gameState.isPlayerTurn) {
    return gameState;
  }

  const newGameState = { ...gameState };
  newGameState.shots++; // Increment shot counter

  // Check if the shot hit a ship
  const isHit = gameState.computerBoard[row][col] === 'ship';
  newGameState.computerBoard = [...gameState.computerBoard];
  newGameState.computerBoard[row] = [...gameState.computerBoard[row]];
  newGameState.computerBoard[row][col] = isHit ? 'hit' : 'miss';

  // Update ship status if hit
  if (isHit) {
    const newComputerShips = [...gameState.computerShips];
    for (let i = 0; i < newComputerShips.length; i++) {
      const ship = newComputerShips[i];
      for (const [shipRow, shipCol] of ship.positions) {
        if (shipRow === row && shipCol === col) {
          newComputerShips[i] = { ...ship, hits: ship.hits + 1 };
          break;
        }
      }
    }
    newGameState.computerShips = newComputerShips;
  }

  // Check if game is over
  const allComputerShipsSunk = newGameState.computerShips.every(ship => ship.hits === ship.length);
  if (allComputerShipsSunk) {
    newGameState.gameOver = true;
    newGameState.winner = 'player';

    // Update best score
    if (newGameState.bestScore === null || newGameState.shots < newGameState.bestScore) {
      newGameState.bestScore = newGameState.shots;
      localStorage.setItem('bestScore', newGameState.shots.toString());
    }
  } else {
    // Switch turn
    newGameState.isPlayerTurn = false;
  }

  return newGameState;
};

export const handleComputerMove = (gameState: GameState): GameState => {
  if (gameState.isPlayerTurn || gameState.gameOver) {
    return gameState;
  }

  const newGameState = { ...gameState };
  
  // Simple AI: randomly selects a cell that hasn't been targeted yet
  let row, col;
  do {
    row = Math.floor(Math.random() * BOARD_SIZE);
    col = Math.floor(Math.random() * BOARD_SIZE);
  } while (
    gameState.playerBoard[row][col] === 'hit' || 
    gameState.playerBoard[row][col] === 'miss'
  );

  // Check if the shot hit a ship
  const isHit = gameState.playerBoard[row][col] === 'ship';
  newGameState.playerBoard = [...gameState.playerBoard];
  newGameState.playerBoard[row] = [...gameState.playerBoard[row]];
  newGameState.playerBoard[row][col] = isHit ? 'hit' : 'miss';

  // Update ship status if hit
  if (isHit) {
    const newPlayerShips = [...gameState.playerShips];
    for (let i = 0; i < newPlayerShips.length; i++) {
      const ship = newPlayerShips[i];
      for (const [shipRow, shipCol] of ship.positions) {
        if (shipRow === row && shipCol === col) {
          newPlayerShips[i] = { ...ship, hits: ship.hits + 1 };
          break;
        }
      }
    }
    newGameState.playerShips = newPlayerShips;
  }

  // Check if game is over
  const allPlayerShipsSunk = newGameState.playerShips.every(ship => ship.hits === ship.length);
  if (allPlayerShipsSunk) {
    newGameState.gameOver = true;
    newGameState.winner = 'computer';
  } else {
    // Switch turn
    newGameState.isPlayerTurn = true;
  }

  return newGameState;
};

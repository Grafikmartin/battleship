// battleship/src/utils/gameLogic.ts
import { GameState, GameBoard, Ship, CellState } from '../types';
import playerShotSound from '../assets/sounds/cannon-shot.mp3';
import computerShotSound from '../assets/sounds/shot_KI.mp3';
import hitSound from '../assets/sounds/Treffer.mp3';
import sinkSound from '../assets/sounds/untergang.mp3';

const BOARD_SIZE = 10;
const SHIPS = [
  { length: 5, count: 1 },
  { length: 4, count: 1 },
  { length: 3, count: 2 },
  { length: 2, count: 1 },
];

// Sound effects
const PLAYER_SHOT_SOUND = new Audio(playerShotSound);
const COMPUTER_SHOT_SOUND = new Audio(computerShotSound);
const HIT_SOUND = new Audio(hitSound);
const SINK_SOUND = new Audio(sinkSound);

// Helper function to play a sound and return a promise that resolves when the sound finishes
const playSound = (sound: HTMLAudioElement): Promise<void> => {
  return new Promise((resolve) => {
    try {
      const clone = sound.cloneNode() as HTMLAudioElement;
      clone.play()
        .then(() => {
          clone.onended = () => resolve();
        })
        .catch(error => {
          console.error('Error playing sound:', error);
          resolve();
        });
    } catch (error) {
      console.error('Error setting up sound:', error);
      resolve();
    }
  });
};

export const createEmptyBoard = (): GameBoard => {
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
          ships.push({ length, positions, hits: 0, isSunk: false });
          placed = true;
        }
      }
    }
  });

  return ships;
};

export const initializeGame = (): GameState => {
  const playerBoard = createEmptyBoard();
  const computerBoard = createEmptyBoard();
  const computerShips = placeShips(computerBoard);

  // Sicherer Zugriff auf localStorage mit try-catch
  let bestScore = null;
  try {
    const savedBestScore = localStorage.getItem('bestScore');
    bestScore = savedBestScore ? Number(savedBestScore) : null;
  } catch (error) {
    console.error('localStorage is not available:', error);
  }

  return {
    playerBoard,
    computerBoard,
    playerShips: [], // Leeres Array, da Schiffe später platziert werden
    computerShips,
    isPlayerTurn: true,
    shots: 0,
    bestScore,
    gameOver: false,
    winner: null,
    remainingShots: 3,
    computerRemainingShots: 3,
    lastHit: null,
    isProcessingMove: false,
    setupPhase: true
  };
};

export const handlePlayerMove = async (gameState: GameState, row: number, col: number): Promise<GameState> => {
  if (gameState.computerBoard[row][col] === 'hit' || 
      gameState.computerBoard[row][col] === 'miss' || 
      gameState.computerBoard[row][col] === 'sunk' ||
      !gameState.isPlayerTurn || 
      gameState.remainingShots === 0 ||
      gameState.isProcessingMove) {
    return gameState;
  }

  const newGameState = { ...gameState, isProcessingMove: true };
  newGameState.shots++;
  newGameState.remainingShots--;

  const isHit = gameState.computerBoard[row][col] === 'ship';
  newGameState.computerBoard = [...gameState.computerBoard];
  newGameState.computerBoard[row] = [...gameState.computerBoard[row]];
  newGameState.computerBoard[row][col] = isHit ? 'hit' : 'miss';

  try {
    await playSound(PLAYER_SHOT_SOUND);
    if (isHit) {
      await playSound(HIT_SOUND);
    }
  } catch (error) {
    console.error('Error playing sound:', error);
  }

  if (isHit) {
    const newComputerShips = [...gameState.computerShips];
    for (let i = 0; i < newComputerShips.length; i++) {
      const ship = newComputerShips[i];
      for (const [shipRow, shipCol] of ship.positions) {
        if (shipRow === row && shipCol === col) {
          const updatedShip = { ...ship, hits: ship.hits + 1 };
          newComputerShips[i] = updatedShip;
          
          if (updatedShip.hits === updatedShip.length) {
            updatedShip.isSunk = true;
            updatedShip.positions.forEach(([r, c]) => {
              newGameState.computerBoard[r][c] = 'sunk';
            });
            try {
              await playSound(SINK_SOUND);
            } catch (error) {
              console.error('Error playing sink sound:', error);
            }
          }
          break;
        }
      }
    }
    newGameState.computerShips = newComputerShips;
  }

  const allComputerShipsSunk = newGameState.computerShips.every(ship => ship.hits === ship.length);
  if (allComputerShipsSunk) {
    newGameState.gameOver = true;
    newGameState.winner = 'player';

    try {
      if (newGameState.bestScore === null || newGameState.shots < newGameState.bestScore) {
        newGameState.bestScore = newGameState.shots;
        localStorage.setItem('bestScore', newGameState.shots.toString());
      }
    } catch (error) {
      console.error('localStorage is not available:', error);
    }
  } else if (newGameState.remainingShots === 0) {
    newGameState.isPlayerTurn = false;
    newGameState.computerRemainingShots = 3;
  }

  newGameState.isProcessingMove = false;
  
  return newGameState;
};

const getAdjacentCells = (row: number, col: number): [number, number][] => {
  return [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1]
  ].filter(([r, c]) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE);
};

const findNextTarget = (gameState: GameState): [number, number] => {
  const { playerBoard, lastHit } = gameState;
  
  if (lastHit) {
    const [lastHitRow, lastHitCol] = lastHit;
    let hitShip: Ship | undefined;
    
    for (const ship of gameState.playerShips) {
      for (const [shipRow, shipCol] of ship.positions) {
        if (shipRow === lastHitRow && shipCol === lastHitCol && !ship.isSunk) {
          hitShip = ship;
          break;
        }
      }
      if (hitShip) break;
    }
    
    if (hitShip && !hitShip.isSunk) {
      const hitPositions = hitShip.positions.filter(([r, c]) => 
        playerBoard[r][c] === 'hit'
      );
      
      if (hitPositions.length > 1) {
        const isHorizontal = hitPositions.every(([r, _]) => r === hitPositions[0][0]);
        
        if (isHorizontal) {
          const cols = hitPositions.map(([_, c]) => c).sort((a, b) => a - b);
          const minCol = cols[0];
          const maxCol = cols[cols.length - 1];
          
          if (minCol > 0 && playerBoard[lastHitRow][minCol - 1] === 'water') {
            return [lastHitRow, minCol - 1];
          }
          
          if (maxCol < BOARD_SIZE - 1 && playerBoard[lastHitRow][maxCol + 1] === 'water') {
            return [lastHitRow, maxCol + 1];
          }
        } else {
          const rows = hitPositions.map(([r, _]) => r).sort((a, b) => a - b);
          const minRow = rows[0];
          const maxRow = rows[rows.length - 1];
          
          if (minRow > 0 && playerBoard[minRow - 1][lastHitCol] === 'water') {
            return [minRow - 1, lastHitCol];
          }
          
          if (maxRow < BOARD_SIZE - 1 && playerBoard[maxRow + 1][lastHitCol] === 'water') {
            return [maxRow + 1, lastHitCol];
          }
        }
      }
      
      const adjacentCells = getAdjacentCells(lastHitRow, lastHitCol);
      for (const [r, c] of adjacentCells) {
        if (playerBoard[r][c] === 'water') {
          return [r, c];
        }
      }
    }
  }
  
  let row, col;
  do {
    row = Math.floor(Math.random() * BOARD_SIZE);
    col = Math.floor(Math.random() * BOARD_SIZE);
  } while (
    playerBoard[row][col] === 'hit' || 
    playerBoard[row][col] === 'miss' ||
    playerBoard[row][col] === 'sunk'
  );
  
  return [row, col];
};

const processComputerShot = async (gameState: GameState): Promise<GameState> => {
  const newGameState = { ...gameState };
  
  const [row, col] = findNextTarget(newGameState);
  newGameState.computerTarget = `${row}-${col}`;
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const isHit = newGameState.playerBoard[row][col] === 'ship';
  newGameState.playerBoard = [...newGameState.playerBoard];
  newGameState.playerBoard[row] = [...newGameState.playerBoard[row]];
  newGameState.playerBoard[row][col] = isHit ? 'hit' : 'miss';
  
  try {
    await playSound(COMPUTER_SHOT_SOUND);
    if (isHit) {
      await playSound(HIT_SOUND);
    }
  } catch (error) {
    console.error('Error playing sound:', error);
  }
  
  if (isHit) {
    newGameState.lastHit = [row, col];
  }

  if (isHit) {
    const newPlayerShips = [...newGameState.playerShips];
    for (let i = 0; i < newPlayerShips.length; i++) {
      const ship = newPlayerShips[i];
      for (const [shipRow, shipCol] of ship.positions) {
        if (shipRow === row && shipCol === col) {
          const updatedShip = { ...ship, hits: ship.hits + 1 };
          newPlayerShips[i] = updatedShip;
          
          if (updatedShip.hits === updatedShip.length) {
            updatedShip.isSunk = true;
            updatedShip.positions.forEach(([r, c]) => {
              newGameState.playerBoard[r][c] = 'sunk';
            });
            try {
              await playSound(SINK_SOUND);
            } catch (error) {
              console.error('Error playing sink sound:', error);
            }
            newGameState.lastHit = null;
          }
          break;
        }
      }
    }
    newGameState.playerShips = newPlayerShips;
  }

  const allPlayerShipsSunk = newGameState.playerShips.every(ship => ship.hits === ship.length);
  if (allPlayerShipsSunk) {
    newGameState.gameOver = true;
    newGameState.winner = 'computer';
  }
  
  newGameState.computerRemainingShots = (newGameState.computerRemainingShots ?? 3) - 1;
  
  return newGameState;
};

export const handleComputerMove = async (gameState: GameState): Promise<GameState> => {
  if (gameState.isPlayerTurn || gameState.gameOver || gameState.isProcessingMove) {
    return gameState;
  }

  let newGameState = { ...gameState, isProcessingMove: true };
  
  if (newGameState.computerRemainingShots > 0) {
    newGameState = await processComputerShot(newGameState);
    
    if (newGameState.computerRemainingShots > 0 && !newGameState.gameOver) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('updateGameState', { 
          detail: { ...newGameState, isProcessingMove: false, computerTarget: null } 
        }));
        
        setTimeout(async () => {
          const nextState = await handleComputerMove(newGameState);
          window.dispatchEvent(new CustomEvent('updateGameState', { detail: nextState }));
        }, 750);
      }, 0);
    } else {
      if (!newGameState.gameOver) {
        newGameState.isPlayerTurn = true;
        newGameState.remainingShots = 3;
        newGameState.computerTarget = null;
      }
    }
  }
  
  newGameState.isProcessingMove = false;
  return newGameState;
};

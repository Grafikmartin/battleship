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
// Verwende absolute Pfade für die Sounddateien
const PLAYER_SHOT_SOUND = new Audio(playerShotSound);
const COMPUTER_SHOT_SOUND = new Audio(computerShotSound);
const HIT_SOUND = new Audio(hitSound);
const SINK_SOUND = new Audio(sinkSound);

// Helper function to play a sound and return a promise that resolves when the sound finishes
const playSound = (sound: HTMLAudioElement): Promise<void> => {
  return new Promise((resolve) => {
    try {
      sound.currentTime = 0; // Reset sound to beginning
      
      // Add error handling for sound play
      const playPromise = sound.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Sound started playing successfully
            sound.onended = () => resolve();
          })
          .catch(error => {
            console.error('Error playing sound:', error);
            // Resolve immediately if there's an error playing the sound
            resolve();
          });
      } else {
        // For browsers where play() doesn't return a promise
        sound.onended = () => resolve();
      }
    } catch (error) {
      console.error('Error setting up sound:', error);
      // Resolve immediately if there's an error
      resolve();
    }
  });
};

export const initializeGame = (): GameState => {
  const playerBoard = createEmptyBoard();
  const computerBoard = createEmptyBoard();
  const playerShips = placeShips(playerBoard);
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
    playerShips,
    computerShips,
    isPlayerTurn: true,
    shots: 0,
    bestScore,
    gameOver: false,
    winner: null,
    remainingShots: 3,  // Initialize with 3 shots
    computerRemainingShots: 3,  // Computer also gets 3 shots
    lastHit: null,  // Track last hit for computer AI
    isProcessingMove: false  // Flag to track if a move is being processed
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
          ships.push({ length, positions, hits: 0, isSunk: false });
          placed = true;
        }
      }
    }
  });

  return ships;
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
  newGameState.remainingShots--;  // Decrease remaining shots

  const isHit = gameState.computerBoard[row][col] === 'ship';
  newGameState.computerBoard = [...gameState.computerBoard];
  newGameState.computerBoard[row] = [...gameState.computerBoard[row]];
  newGameState.computerBoard[row][col] = isHit ? 'hit' : 'miss';

  // Play appropriate sound
  try {
    // Play player shot sound first
    await playSound(PLAYER_SHOT_SOUND);
    
    // If it's a hit, play the hit sound
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
          
          // Check if ship is sunk
          if (updatedShip.hits === updatedShip.length) {
            updatedShip.isSunk = true;
            // Mark all ship positions as sunk
            updatedShip.positions.forEach(([r, c]) => {
              newGameState.computerBoard[r][c] = 'sunk';
            });
            // Play sink sound
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
    // Only switch turns when all shots are used
    newGameState.isPlayerTurn = false;
    newGameState.computerRemainingShots = 3;  // Reset computer's shots
  }

  // Move processing is complete
  newGameState.isProcessingMove = false;
  
  return newGameState;
};

// Helper function to get adjacent cells
const getAdjacentCells = (row: number, col: number): [number, number][] => {
  return [
    [row - 1, col], // up
    [row + 1, col], // down
    [row, col - 1], // left
    [row, col + 1]  // right
  ].filter(([r, c]) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE);
};

// Helper function to find the next target for the computer
const findNextTarget = (gameState: GameState): [number, number] => {
  const { playerBoard, lastHit } = gameState;
  
  // If we have a last hit, try to find adjacent cells that might be part of the same ship
  if (lastHit) {
    const [lastHitRow, lastHitCol] = lastHit;
    
    // Find the ship that was hit
    let hitShip: Ship | undefined;
    for (const ship of gameState.playerShips) {
      for (const [shipRow, shipCol] of ship.positions) {
        if (shipRow === lastHitRow && shipCol === lastHitCol && ship.isSunk !== true) {
          hitShip = ship;
          break;
        }
      }
      if (hitShip) break;
    }
    
    // If we found a ship and it's not sunk, try to find other parts of it
    if (hitShip && hitShip.isSunk !== true) {
      // Find other hits on the same ship to determine orientation
      const hitPositions = hitShip.positions.filter(([r, c]) => 
        playerBoard[r][c] === 'hit'
      );
      
      // If we have multiple hits, we can determine the orientation
      if (hitPositions.length > 1) {
        // Check if the ship is horizontal or vertical
        const isHorizontal = hitPositions.every(([r, _]) => r === hitPositions[0][0]);
        
        // Try to extend in the direction of the ship
        if (isHorizontal) {
          // Find the leftmost and rightmost hit positions
          const cols = hitPositions.map(([_, c]) => c).sort((a, b) => a - b);
          
          // Make sure we have valid indices before accessing
          if (cols.length > 0) {
            const minCol = cols[0];
            const maxCol = cols[cols.length - 1];
            
            // Try left side
            if (minCol > 0 && playerBoard[lastHitRow][minCol - 1] !== 'hit' && 
                playerBoard[lastHitRow][minCol - 1] !== 'miss' && 
                playerBoard[lastHitRow][minCol - 1] !== 'sunk') {
              return [lastHitRow, minCol - 1];
            }
            
            // Try right side
            if (maxCol < BOARD_SIZE - 1 && playerBoard[lastHitRow][maxCol + 1] !== 'hit' && 
                playerBoard[lastHitRow][maxCol + 1] !== 'miss' && 
                playerBoard[lastHitRow][maxCol + 1] !== 'sunk') {
              return [lastHitRow, maxCol + 1];
            }
          }
        } else {
          // Find the topmost and bottommost hit positions
          const rows = hitPositions.map(([r, _]) => r).sort((a, b) => a - b);
          
          // Make sure we have valid indices before accessing
          if (rows.length > 0) {
            const minRow = rows[0];
            const maxRow = rows[rows.length - 1];
            
            // Try top side
            if (minRow > 0 && playerBoard[minRow - 1][lastHitCol] !== 'hit' && 
                playerBoard[minRow - 1][lastHitCol] !== 'miss' && 
                playerBoard[minRow - 1][lastHitCol] !== 'sunk') {
              return [minRow - 1, lastHitCol];
            }
            
            // Try bottom side
            if (maxRow < BOARD_SIZE - 1 && playerBoard[maxRow + 1][lastHitCol] !== 'hit' && 
                playerBoard[maxRow + 1][lastHitCol] !== 'miss' && 
                playerBoard[maxRow + 1][lastHitCol] !== 'sunk') {
              return [maxRow + 1, lastHitCol];
            }
          }
        }
      }
      
      // If we only have one hit or couldn't find a valid target in the ship's direction,
      // try all adjacent cells
      const adjacentCells = getAdjacentCells(lastHitRow, lastHitCol);
      for (const [r, c] of adjacentCells) {
        if (playerBoard[r][c] !== 'hit' && playerBoard[r][c] !== 'miss' && playerBoard[r][c] !== 'sunk') {
          return [r, c];
        }
      }
    }
  }
  
  // If no valid target found from last hit, choose randomly
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

// Helper function to process a single computer shot
const processComputerShot = async (gameState: GameState): Promise<GameState> => {
  const newGameState = { ...gameState };
  
  // Find the next target
  const [row, col] = findNextTarget(newGameState);
  
  // Check if the shot hit a ship
  const isHit = newGameState.playerBoard[row][col] === 'ship';
  newGameState.playerBoard = [...newGameState.playerBoard];
  newGameState.playerBoard[row] = [...newGameState.playerBoard[row]];
  newGameState.playerBoard[row][col] = isHit ? 'hit' : 'miss';
  
  // Play appropriate sound
  try {
    // Play computer shot sound first
    await playSound(COMPUTER_SHOT_SOUND);
    
    // If it's a hit, play the hit sound
    if (isHit) {
      await playSound(HIT_SOUND);
    }
  } catch (error) {
    console.error('Error playing sound:', error);
  }
  
  // Update lastHit if it was a hit
  if (isHit) {
    newGameState.lastHit = [row, col];
  }

  // Update ship status if hit
  if (isHit) {
    const newPlayerShips = [...newGameState.playerShips];
    for (let i = 0; i < newPlayerShips.length; i++) {
      const ship = newPlayerShips[i];
      for (const [shipRow, shipCol] of ship.positions) {
        if (shipRow === row && shipCol === col) {
          const updatedShip = { ...ship, hits: ship.hits + 1 };
          newPlayerShips[i] = updatedShip;
          
          // Check if ship is sunk
          if (updatedShip.hits === updatedShip.length) {
            updatedShip.isSunk = true;
            // Mark all ship positions as sunk
            updatedShip.positions.forEach(([r, c]) => {
              newGameState.playerBoard[r][c] = 'sunk';
            });
            // Play sink sound
            try {
              await playSound(SINK_SOUND);
            } catch (error) {
              console.error('Error playing sink sound:', error);
            }
            // Reset lastHit since this ship is sunk
            newGameState.lastHit = null;
          }
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
  }
  
  // Decrease remaining shots
  newGameState.computerRemainingShots = (newGameState.computerRemainingShots ?? 3) - 1;
  
  return newGameState;
};

export const handleComputerMove = async (gameState: GameState): Promise<GameState> => {
  if (gameState.isPlayerTurn || gameState.gameOver || gameState.isProcessingMove) {
    return gameState;
  }

  let newGameState = { ...gameState, isProcessingMove: true };
  
  // Prozessiere nur einen Schuss und gib den Zustand zurück
  if (newGameState.computerRemainingShots > 0) {
    // Process a single shot and wait for it to complete (including sound)
    newGameState = await processComputerShot(newGameState);
    
    // Wenn noch Schüsse übrig sind und das Spiel nicht vorbei ist,
    // gib den aktuellen Zustand zurück und lass die KI später weiterschießen
    if (newGameState.computerRemainingShots > 0 && !newGameState.gameOver) {
      setTimeout(() => {
        // Hier verwenden wir ein CustomEvent, um den nächsten Schuss zu triggern
        window.dispatchEvent(new CustomEvent('updateGameState', { 
          detail: { ...newGameState, isProcessingMove: false } 
        }));
        
        // Nach einer kurzen Pause den nächsten Schuss auslösen
        setTimeout(async () => {
          const nextState = await handleComputerMove(newGameState);
          window.dispatchEvent(new CustomEvent('updateGameState', { detail: nextState }));
        }, 750);
      }, 0);
    } else {
      // Wenn keine Schüsse mehr übrig sind oder das Spiel vorbei ist
      if (!newGameState.gameOver) {
        newGameState.isPlayerTurn = true;
        newGameState.remainingShots = 3;  // Reset player's shots
      }
    }
  }
  
  // Move processing is complete
  newGameState.isProcessingMove = false;

  return newGameState;
};

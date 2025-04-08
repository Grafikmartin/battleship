// ============================
//  gameLogic.ts
// ============================
import { GameState, GameBoard, Ship, CellState } from '../types'; // NICHT '../types/index', sondern '../types'

import playerShotSound from '../assets/sounds/cannon-shot.mp3';
import computerShotSound from '../assets/sounds/shot_KI.mp3';
import hitSound from '../assets/sounds/Treffer.mp3';
import sinkSound from '../assets/sounds/untergang.mp3';
import { SHIP_NAMES, MESSAGES } from '../constants/messages';
import SoundManager from './soundManager';

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

// ------------------------------------
// Hunt-und-Target KI-Status (NEU)
// ------------------------------------
type AIMode = 'hunt' | 'target';

interface AIState {
  mode: AIMode;
  firstHit: [number, number] | null;   // Koordinate des ersten Treffers
  secondHit: [number, number] | null;  // Koordinate des zweiten Treffers
  orientation: 'horizontal' | 'vertical' | null;
  triedDirections: ('up' | 'right' | 'down' | 'left')[];
}

// Globale KI-Variable statt aiHitTracker
let aiState: AIState = {
  mode: 'hunt',
  firstHit: null,
  secondHit: null,
  orientation: null,
  triedDirections: [],
};

// -------------------------
// Helper: Sound abspielen
// -------------------------
// playSound-Funktion aktualisieren:
const playSound = (sound: HTMLAudioElement): Promise<void> => {
  return new Promise((resolve) => {
    try {
      // Prüfe, ob Sound aktiviert ist
      const isSoundMuted = localStorage.getItem('soundEnabled') === 'false';
      if (isSoundMuted) {
        console.log('Sound is muted, not playing');
        resolve();
        return;
      }
      
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

// -------------------------
// Boards erstellen
// -------------------------
export const createEmptyBoard = (): GameBoard => {
  return Array(BOARD_SIZE).fill(null)
    .map(() => Array(BOARD_SIZE).fill('water'));
};

/**
//**
 * Verbesserte Funktion zur Platzierung der Computer-Schiffe
 * Garantiert, dass genau 17 Felder belegt sind
 */
/**
 * Garantierte Schiffsplatzierung ohne Zufälligkeit
 * Diese Funktion stellt sicher, dass immer genau 17 Felder belegt sind.
 */
const placeShips = (board: GameBoard): Ship[] => {
  // Leere das Board
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      board[r][c] = 'water';
    }
  }

  // Vordefinierte Schiffspositionen
  const shipPositions = [
    { length: 5, positions: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] }, // Schlachtschiff
    { length: 4, positions: [[2, 0], [2, 1], [2, 2], [2, 3]] },         // Kreuzer
    { length: 3, positions: [[4, 0], [4, 1], [4, 2]] },                 // Fregatte 1
    { length: 3, positions: [[6, 0], [6, 1], [6, 2]] },                 // Fregatte 2
    { length: 2, positions: [[8, 0], [8, 1]] }                          // U-Boot
  ];

  const ships: Ship[] = [];

  // Platziere die Schiffe auf dem Board
  for (const ship of shipPositions) {
    for (const [row, col] of ship.positions) {
      board[row][col] = 'ship';
    }

    ships.push({
      length: ship.length,
      positions: ship.positions,
      hits: 0,
      isSunk: false
    });
  }

  // Sicherheitsprüfung: Zähle die belegten Felder
  const shipCellCount = board.flat().filter(cell => cell === 'ship').length;
  if (shipCellCount !== 17) {
    throw new Error(`Kritischer Fehler: Erwartet 17 belegte Felder, aber ${shipCellCount} gefunden.`);
  }

  console.log("✓ Garantierte Schiffsplatzierung abgeschlossen.");
  return ships;
};
// -----------------------------
// GameState initialisieren
// -----------------------------
export const initializeGame = (): GameState => {
  const playerBoard = createEmptyBoard();
  const computerBoard = createEmptyBoard();
  const computerShips = placeShips(computerBoard);

  let bestScore = null;
  try {
    const savedBestScore = localStorage.getItem('bestScore');
    bestScore = savedBestScore ? Number(savedBestScore) : null;
  } catch (error) {
    console.error('localStorage is not available:', error);
  }

  // KI-Status zurücksetzen
  aiState = {
    mode: 'hunt',
    firstHit: null,
    secondHit: null,
    orientation: null,
    triedDirections: [],
  };

  return {
    playerBoard,
    computerBoard,
    playerShips: [], // wird ggf. später befüllt
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
    setupPhase: true,
    message: MESSAGES.readyToFire, // Startmeldung setzen
  };
};

// --------------------------------------
// Spielerzug
// --------------------------------------
export const handlePlayerMove = async (gameState: GameState, row: number, col: number): Promise<GameState> => {
  if (
    gameState.computerBoard[row][col] === 'hit' ||
    gameState.computerBoard[row][col] === 'miss' ||
    gameState.computerBoard[row][col] === 'sunk' ||
    !gameState.isPlayerTurn ||
    gameState.remainingShots === 0 ||
    gameState.isProcessingMove
  ) {
    return gameState;
  }

  const newGameState = { ...gameState, isProcessingMove: true };
  newGameState.shots++;
  newGameState.remainingShots--;

  const isHit = gameState.computerBoard[row][col] === 'ship';
  newGameState.computerBoard = [...gameState.computerBoard];
  newGameState.computerBoard[row] = [...gameState.computerBoard[row]];
  newGameState.computerBoard[row][col] = isHit ? 'hit' : 'miss';

  // Setze Nachricht basierend auf Trefferstatus
  newGameState.message = isHit ? MESSAGES.hit : MESSAGES.miss;

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
            
            // Nachricht für versenktes Schiff setzen
            const shipType = SHIP_NAMES[updatedShip.length];
            newGameState.message = MESSAGES.playerSunkShip(shipType);
            
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
    // Gewinnmeldung setzen
    newGameState.message = MESSAGES.playerWon;

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
    // Computerzug-Meldung setzen
    newGameState.message = MESSAGES.computerTurn;
  } else {
    // Zeige an, wie viele Schüsse noch übrig sind
    newGameState.message = `${newGameState.message} Noch ${newGameState.remainingShots} Schüsse übrig.`;
  }

  newGameState.isProcessingMove = false;
  return newGameState;
};

// -------------------------------------------------------
// Helferfunktionen für die neue KI (Hunt & Target)
// -------------------------------------------------------
/** Liefert eine zufällige freie Zelle, die noch nicht beschossen wurde. */
function getRandomCell(board: GameBoard): [number, number] {
  let row, col;
  do {
    row = Math.floor(Math.random() * BOARD_SIZE);
    col = Math.floor(Math.random() * BOARD_SIZE);
  } while (
    board[row][col] === 'hit' ||
    board[row][col] === 'miss' ||
    board[row][col] === 'sunk'
  );
  return [row, col];
}

/** Nächste Zelle in einer Richtung (up/right/down/left) */
function getCellInDirection(
  row: number,
  col: number,
  direction: 'up' | 'right' | 'down' | 'left'
): [number, number] {
  switch (direction) {
    case 'up':    return [row - 1, col];
    case 'right': return [row, col + 1];
    case 'down':  return [row + 1, col];
    case 'left':  return [row, col - 1];
  }
}

/** Prüft, ob eine Zelle im Spielfeld liegt und noch nicht beschossen ist. */
function isValidTarget(board: GameBoard, row: number, col: number): boolean {
  if (row < 0 || row >= BOARD_SIZE) return false;
  if (col < 0 || col >= BOARD_SIZE) return false;
  const cell = board[row][col];
  return (cell !== 'hit' && cell !== 'miss' && cell !== 'sunk');
}

/** Die zentrale KI-Funktion: ermittelt, wo die KI als Nächstes hinschießt. */
function findNextTarget(gameState: GameState): [number, number] {
  const board = gameState.playerBoard; // auf welches Board die KI schießt

  // 1) Prüfe, ob ein Schiff versenkt wurde → Falls "firstHit" oder "secondHit" auf versenktes Feld zeigt, resette
  if (aiState.firstHit) {
    const [r, c] = aiState.firstHit;
    if (board[r][c] === 'sunk') {
      resetAIState();
    }
  }
  if (aiState.secondHit) {
    const [r, c] = aiState.secondHit;
    if (board[r][c] === 'sunk') {
      resetAIState();
    }
  }

  // 2) Je nach Modus unterschiedlich schießen
  if (aiState.mode === 'hunt') {
    // -> Schieße zufällig auf ein freies Feld
    return getRandomCell(board);
  } else {
    // -> 'target'-Modus: Wir haben mindestens einen Treffer
    if (aiState.firstHit && !aiState.secondHit) {
      // Noch keinen zweiten Treffer -> probiere 4 Richtungen um firstHit
      const [row, col] = aiState.firstHit;
      for (const dir of ['up', 'right', 'down', 'left'] as const) {
        if (!aiState.triedDirections.includes(dir)) {
          aiState.triedDirections.push(dir);
          const [nr, nc] = getCellInDirection(row, col, dir);
          if (isValidTarget(board, nr, nc)) {
            return [nr, nc];
          }
        }
      }
      // Falls alle Richtungen verbraucht -> zurück zu 'hunt'
      resetAIState();
      return getRandomCell(board);
    } else if (aiState.firstHit && aiState.secondHit) {
      // -> Wir haben 2 Treffer => Orientation bekannt oder erkennbar
      const [r1, c1] = aiState.firstHit;
      const [r2, c2] = aiState.secondHit;

      if (!aiState.orientation) {
        // orientierung bestimmen
        aiState.orientation = (r1 === r2) ? 'horizontal' : 'vertical';
      }

      if (aiState.orientation === 'horizontal') {
        // Suche links/rechts vom minimalen/maximalen col
        const leftmost = c1 < c2 ? [r1, c1] : [r2, c2];
        const rightmost = c1 < c2 ? [r2, c2] : [r1, c1];

        // Versuche rechts vom rightmost
        const [rR, cR] = [rightmost[0], rightmost[1] + 1];
        if (isValidTarget(board, rR, cR)) {
          return [rR, cR];
        }

        // Sonst links vom leftmost
        const [rL, cL] = [leftmost[0], leftmost[1] - 1];
        if (isValidTarget(board, rL, cL)) {
          return [rL, cL];
        }

      } else {
        // orientation === 'vertical'
        const topmost = r1 < r2 ? [r1, c1] : [r2, c2];
        const bottommost = r1 < r2 ? [r2, c2] : [r1, c1];

        // Versuche unten
        const [rD, cD] = [bottommost[0] + 1, bottommost[1]];
        if (isValidTarget(board, rD, cD)) {
          return [rD, cD];
        }
        // Versuche oben
        const [rU, cU] = [topmost[0] - 1, topmost[1]];
        if (isValidTarget(board, rU, cU)) {
          return [rU, cU];
        }
      }

      // Nichts gefunden => Reset auf Hunt
      resetAIState();
      return getRandomCell(board);
    } else {
      // Fallback
      resetAIState();
      return getRandomCell(board);
    }
  }
}

/** Setzt den KI-Status zurück (auf Hunt) */
function resetAIState(): void {
  aiState = {
    mode: 'hunt',
    firstHit: null,
    secondHit: null,
    orientation: null,
    triedDirections: [],
  };
}

// ------------------------------------------------
// KI-Schuss durchführen
// ------------------------------------------------
const processComputerShot = async (gameState: GameState): Promise<GameState> => {
  const newGameState = { ...gameState };

  // Nächste Schuss-Koordinate holen
  const [row, col] = findNextTarget(newGameState);
  newGameState.computerTarget = `${row}-${col}`;

  // Kleines Delay (Kosmetik)
  await new Promise(resolve => setTimeout(resolve, 500));

  const isHit = newGameState.playerBoard[row][col] === 'ship';
  newGameState.playerBoard = [...newGameState.playerBoard];
  newGameState.playerBoard[row] = [...newGameState.playerBoard[row]];
  newGameState.playerBoard[row][col] = isHit ? 'hit' : 'miss';

  try {
    await playSound(COMPUTER_SHOT_SOUND);
    if (isHit) {
      await playSound(HIT_SOUND);
      // ------------------------------------
      // Wichtig: hier aktualisieren wir den AI-State
      // ------------------------------------
      if (aiState.mode === 'hunt') {
        // Erster Treffer -> wechsle in target-Modus
        aiState.mode = 'target';
        aiState.firstHit = [row, col];
        aiState.secondHit = null;
        aiState.orientation = null;
        aiState.triedDirections = [];
      } else {
        // mode === 'target'
        if (!aiState.firstHit) {
          aiState.firstHit = [row, col];
        } else if (!aiState.secondHit) {
          aiState.secondHit = [row, col];
          // orientation wird in findNextTarget bestimmt
        } else {
          // Wir haben schon 2 Treffer
          // => optional kannst du hier noch die "Spanweite" anpassen,
          //    falls du merkst, dass [row,col] weiter links/rechts liegt usw.
        }
      }
    } else {
      // Miss
      // Wenn wir gerade 'target' ausprobieren, kann es sein, dass wir eine Richtung verbraucht haben.
      // In diesem einfachen Code machen wir nichts weiter – wir testen die nächste Richtung
      // beim nächsten Aufruf von findNextTarget.
    }
  } catch (error) {
    console.error('Error playing sound:', error);
  }

  // Schiffstreffer aktualisieren
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
            
            // Nachricht für versenktes Schiff
            const shipType = SHIP_NAMES[updatedShip.length];
            newGameState.message = MESSAGES.computerSunkShip(shipType);
            
            try {
              await playSound(SINK_SOUND);
            } catch (err) {
              console.error('Error playing sink sound:', err);
            }

            // Wenn das Schiff versenkt ist, resetten wir den AI-State
            resetAIState();
          }
          break;
        }
      }
    }
    newGameState.playerShips = newPlayerShips;
  }

  // Prüfen, ob alle Schiffe des Spielers versenkt sind
  const allPlayerShipsSunk = newGameState.playerShips.every(ship => ship.hits === ship.length);
  if (allPlayerShipsSunk) {
    newGameState.gameOver = true;
    newGameState.winner = 'computer';
    // Niederlage-Nachricht
    newGameState.message = MESSAGES.computerWon;
  }

  // Schuss-Anzahl für Computer runterzählen
  newGameState.computerRemainingShots = (newGameState.computerRemainingShots ?? 3) - 1;
  return newGameState;
};

// -----------------------------------------------
// Haupt-Funktion für Computerzug
// -----------------------------------------------
export const handleComputerMove = async (gameState: GameState): Promise<GameState> => {
  if (gameState.isPlayerTurn || gameState.gameOver || gameState.isProcessingMove) {
    return gameState;
  }

  let newGameState = { ...gameState, isProcessingMove: true };

  if (newGameState.computerRemainingShots > 0) {
    newGameState = await processComputerShot(newGameState);

    if (newGameState.computerRemainingShots > 0 && !newGameState.gameOver) {
      // Trick: asynchron den nächsten Schuss anstoßen, falls noch Schüsse übrig
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('updateGameState', {
          detail: { ...newGameState, isProcessingMove: false, computerTarget: null },
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
        // Nachricht für Spielerzug
        newGameState.message = `${MESSAGES.yourTurn}${newGameState.remainingShots}`;
      }
    }
  }

  newGameState.isProcessingMove = false;
  return newGameState;
};
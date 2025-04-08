// ============================
//  gameLogic.ts
// ============================
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

// -------------------------
// Boards erstellen
// -------------------------
export const createEmptyBoard = (): GameBoard => {
  return Array(BOARD_SIZE).fill(null)
    .map(() => Array(BOARD_SIZE).fill('water'));
};

// Prüft, ob ein Schiff an einer bestimmten Position platziert werden kann
const canPlaceShip = (
  board: GameBoard,
  row: number,
  col: number,
  length: number,
  horizontal: boolean
): boolean => {
  // Debug-Log
  console.log(`Prüfe Position [${row},${col}], Länge ${length}, horizontal: ${horizontal}`);
  
  // 1. Prüfe, ob das Schiff im Spielfeld bleibt
  if (horizontal) {
    if (col + length > BOARD_SIZE) {
      console.log(`  - Außerhalb des Spielfelds (horizontal)`);
      return false;
    }
  } else {
    if (row + length > BOARD_SIZE) {
      console.log(`  - Außerhalb des Spielfelds (vertikal)`);
      return false;
    }
  }

  // 2. Prüfe jedes Feld und seinen Umkreis (Abstand 1)
  for (let i = 0; i < length; i++) {
    const shipRow = horizontal ? row : row + i;
    const shipCol = horizontal ? col + i : col;
    
    // Prüfe 3x3-Umkreis um die aktuelle Position
    for (let r = Math.max(0, shipRow - 1); r <= Math.min(BOARD_SIZE - 1, shipRow + 1); r++) {
      for (let c = Math.max(0, shipCol - 1); c <= Math.min(BOARD_SIZE - 1, shipCol + 1); c++) {
        if (board[r][c] === 'ship') {
          console.log(`  - Kollision mit existierendem Schiff bei [${r},${c}]`);
          return false;
        }
      }
    }
  }

  console.log(`  + Position ist gültig!`);
  return true;
};

// Platziert ein Schiff auf dem Spielbrett und gibt die Positionen zurück
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

// Platziert alle Schiffe auf dem Board
// Ersetze die placeShips-Funktion durch diese korrigierte Version

// Platziert alle Schiffe auf dem Board
const placeShips = (board: GameBoard): Ship[] => {
  const ships: Ship[] = [];
  console.log("Starte Schiffsplatzierung...");
  
  // Definiere explizit jedes Schiff einzeln, damit die genaue Anzahl garantiert ist
  const shipsToBePlaced = [
    { length: 5, name: "Schlachtschiff" },
    { length: 4, name: "Kreuzer" },
    { length: 3, name: "Zerstörer 1" },
    { length: 3, name: "Zerstörer 2" },
    { length: 2, name: "U-Boot" }
  ];
  
  // Sortiere nach Größe (größte zuerst)
  shipsToBePlaced.sort((a, b) => b.length - a.length);
  
  // Platziere jedes Schiff einzeln
  for (const ship of shipsToBePlaced) {
    console.log(`Platziere ${ship.name} (Länge ${ship.length})`);
    
    let placed = false;
    let attempts = 0;
    const maxAttempts = 1000;
    
    while (!placed && attempts < maxAttempts) {
      const horizontal = Math.random() < 0.5;
      const row = Math.floor(Math.random() * BOARD_SIZE);
      const col = Math.floor(Math.random() * BOARD_SIZE);
      
      if (canPlaceShip(board, row, col, ship.length, horizontal)) {
        // Platziere Schiff
        const positions = placeShip(board, row, col, ship.length, horizontal);
        ships.push({ 
          length: ship.length, 
          positions, 
          hits: 0, 
          isSunk: false 
        });
        
        placed = true;
        console.log(`    ✓ ${ship.name} platziert an [${row},${col}], horizontal: ${horizontal}`);
        
        // Board-Zustand visualisieren (für Debugging)
        let boardState = '';
        for (let r = 0; r < BOARD_SIZE; r++) {
          let rowStr = '';
          for (let c = 0; c < BOARD_SIZE; c++) {
            rowStr += board[r][c] === 'ship' ? '■ ' : '□ ';
          }
          boardState += rowStr + '\n';
        }
        console.log(boardState);
      }
      
      attempts++;
    }
    
    // Wenn ein Schiff nicht platziert werden konnte
    if (!placed) {
      console.error(`❌ Konnte ${ship.name} nicht platzieren nach ${maxAttempts} Versuchen!`);
      console.log("Setze Board zurück und starte von vorne...");
      
      // Board zurücksetzen
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          board[r][c] = 'water';
        }
      }
      
      // Alle bisherigen Schiffe entfernen
      ships.length = 0;
      
      // Gesamte Funktion neu starten durch Rekursion
      return placeShips(board);
    }
  }
  
  console.log(`Schiffsplatzierung erfolgreich abgeschlossen: ${ships.length} Schiffe platziert`);
  
  // Prüfe die Endgültige Konfiguration
  const counts = {};
  ships.forEach(ship => {
    counts[ship.length] = (counts[ship.length] || 0) + 1;
  });
  
  console.log("Finale Schiffskonfiguration:");
  Object.entries(counts).forEach(([length, count]) => {
    console.log(`Schiffe der Länge ${length}: ${count}`);
  });
  
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
            try {
              await playSound(SINK_SOUND);
            } catch (err) {
              console.error('Error playing sink sound:', err);
            }

            // Wenn das Schiff versenkt ist, resetten wir den AI-State
            // (Im einfachsten Fall, weil wir annehmen, dass es nur EIN Schiff gab,
            //  das gerade verfolgt wurde. Wenn du mehrere "angeknabberte" Schiffe
            //  gleichzeitig verfolgen möchtest, brauchst du mehr Logik.)
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
      }
    }
  }

  newGameState.isProcessingMove = false;
  return newGameState;
};
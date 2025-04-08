// Schiffsnamen 
export const SHIP_NAMES = {
  2: 'U-Boot',
  3: 'Fregatte',
  4: 'Kreuzer',
  5: 'Schlachtschiff'
};

// Spielmeldungen
export const MESSAGES = {
  readyToFire: 'Marine ist schussbereit!',
  hit: 'Treffer, Herr Admiral!',
  miss: 'Nicht getroffen. Weiter beobachten!',
  playerSunkShip: (shipType: string) => `Du hast die ${shipType} versenkt!`,
  computerSunkShip: (shipType: string) => `Der Computer hat deine ${shipType} versenkt!`,
  playerWon: 'Sieg! Alle feindlichen Schiffe wurden versenkt!',
  computerWon: 'Niederlage! Deine Flotte wurde vernichtet!',
  yourTurn: 'Du bist am Zug! Verbleibende Schüsse: ',
  computerTurn: 'Computer ist am Zug.'
};
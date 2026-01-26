// Classic Codenames-style word pack (200+ words)
export const WORD_PACK = [
  // Animals
  "HORSE", "DOG", "CAT", "BEAR", "EAGLE", "SHARK", "WHALE", "SPIDER", "SNAKE", "TIGER",
  "DRAGON", "PHOENIX", "UNICORN", "BAT", "CROW", "PENGUIN", "OCTOPUS", "KANGAROO",
  
  // Nature
  "MOON", "SUN", "STAR", "FOREST", "MOUNTAIN", "OCEAN", "RIVER", "DESERT", "VOLCANO", "ICE",
  "STORM", "THUNDER", "RAINBOW", "CLOUD", "WAVE", "FIRE", "EARTH", "WIND", "TREE", "FLOWER",
  
  // Objects
  "KEY", "LOCK", "DOOR", "WINDOW", "MIRROR", "CLOCK", "BELL", "BOOK", "PEN", "PAPER",
  "GLASSES", "RING", "CROWN", "SWORD", "SHIELD", "BOW", "ARROW", "BOMB", "DIAMOND", "GOLD",
  "SILVER", "IRON", "STEEL", "GLASS", "ROPE", "CHAIN", "BRIDGE", "WALL", "TOWER", "CASTLE",
  
  // Places
  "LONDON", "PARIS", "TOKYO", "EGYPT", "BRAZIL", "CHINA", "AFRICA", "AMERICA", "INDIA", "RUSSIA",
  "BANK", "SCHOOL", "HOSPITAL", "CHURCH", "TEMPLE", "PALACE", "PRISON", "THEATER", "MUSEUM", "AIRPORT",
  
  // Food & Drink
  "APPLE", "ORANGE", "LEMON", "BERRY", "GRAPE", "PEACH", "CHERRY", "CAKE", "PIE", "BREAD",
  "BUTTER", "CHEESE", "WINE", "BEER", "COFFEE", "TEA", "SUGAR", "SALT", "PEPPER", "HONEY",
  "CHOCOLATE", "ICE CREAM", "PIZZA", "STEAK", "FISH",
  
  // Professions & People
  "DOCTOR", "NURSE", "TEACHER", "SOLDIER", "POLICE", "PILOT", "CAPTAIN", "KING", "QUEEN", "PRINCE",
  "KNIGHT", "PIRATE", "NINJA", "SPY", "AGENT", "CHEF", "LAWYER", "JUDGE", "ARTIST", "ACTOR",
  "SINGER", "DANCER", "WRITER", "SCIENTIST", "ENGINEER",
  
  // Sports & Games
  "BALL", "NET", "GOAL", "RACE", "GAME", "CARD", "DICE", "CHESS", "POOL", "GOLF",
  "TENNIS", "SOCCER", "HOCKEY", "BOXING", "MARATHON",
  
  // Transportation
  "CAR", "TRUCK", "BUS", "TRAIN", "PLANE", "SHIP", "BOAT", "ROCKET", "BICYCLE", "HELICOPTER",
  "SUBMARINE", "TANK", "JET", "AMBULANCE", "TAXI",
  
  // Body Parts
  "HEART", "BRAIN", "EYE", "HAND", "FOOT", "ARM", "LEG", "HEAD", "BACK", "FACE",
  "TOOTH", "BONE", "BLOOD", "SKIN", "NAIL",
  
  // Concepts & Abstract
  "LOVE", "DEATH", "LIFE", "TIME", "SPACE", "POWER", "FORCE", "ENERGY", "SPIRIT", "SOUL",
  "DREAM", "FEAR", "HOPE", "LUCK", "CHANCE", "FATE", "DESTINY", "SECRET", "MYSTERY", "MAGIC",
  "WAR", "PEACE", "FREEDOM", "JUSTICE", "TRUTH",
  
  // Technology
  "COMPUTER", "PHONE", "SCREEN", "ROBOT", "LASER", "BATTERY", "WIRE", "CODE", "VIRUS", "NETWORK",
  "SATELLITE", "SIGNAL", "DATA", "WEB", "CHIP",
  
  // Music & Art
  "PIANO", "GUITAR", "DRUM", "VIOLIN", "TRUMPET", "OPERA", "JAZZ", "ROCK", "BAND", "SONG",
  "PAINT", "CANVAS", "SCULPTURE", "PORTRAIT", "GALLERY",
  
  // Clothing
  "SUIT", "DRESS", "SHIRT", "PANTS", "SHOE", "HAT", "TIE", "BELT", "JACKET", "COAT",
  "GLOVE", "BOOT", "CAPE", "MASK", "UNIFORM",
  
  // Weather & Seasons
  "RAIN", "SNOW", "FOG", "FROST", "HEAT", "COLD", "SPRING", "SUMMER", "FALL", "WINTER",
  
  // Misc
  "SHADOW", "LIGHT", "DARK", "NIGHT", "DAY", "DAWN", "DUSK", "SILENCE", "NOISE", "ECHO",
  "GHOST", "ANGEL", "DEMON", "VAMPIRE", "ZOMBIE", "WITCH", "WIZARD", "GIANT", "DWARF", "ELF",
  "ALIEN", "MONSTER", "HERO", "VILLAIN", "LEGEND"
];

// Fisher-Yates shuffle
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Generate a random 6-character room code
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like I, O, 0, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate 25 random words for a game
export function generateBoardWords(): string[] {
  return shuffleArray(WORD_PACK).slice(0, 25);
}

// Generate the secret key (card type assignments)
// Starting team gets 9 cards, other team gets 8, 7 bystanders, 1 assassin
export function generateSecretKey(startingTeam: 'red' | 'blue'): ('red' | 'blue' | 'bystander' | 'assassin')[] {
  const distribution: ('red' | 'blue' | 'bystander' | 'assassin')[] = [];
  
  // Starting team gets 9
  const startCount = 9;
  const otherCount = 8;
  
  for (let i = 0; i < startCount; i++) {
    distribution.push(startingTeam);
  }
  
  for (let i = 0; i < otherCount; i++) {
    distribution.push(startingTeam === 'red' ? 'blue' : 'red');
  }
  
  for (let i = 0; i < 7; i++) {
    distribution.push('bystander');
  }
  
  distribution.push('assassin');
  
  return shuffleArray(distribution);
}

// Randomly pick starting team
export function pickStartingTeam(): 'red' | 'blue' {
  return Math.random() < 0.5 ? 'red' : 'blue';
}

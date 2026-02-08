/**
 * @fileOverview Centralized MonstersGame HTML selectors and parsing utilities.
 * Reference: docs/monstersgame-html-reference.md
 */

// ============================================================================
// URL ROUTES
// ============================================================================
export const MG_ROUTES = {
  STATUS: "index.php?ac=status",
  RAID: "index.php?ac=raubzug",
  GRAVEYARD: "index.php?ac=friedhof",
  TRAINING: "index.php?ac=training",
  STORE: "index.php?ac=stadt&sac=warenhaendler",
  POTIONS: "index.php?ac=stadt&sac=warenhaendler&prod_group=4",
  ANCESTRAL: "index.php?ac=ahnenstaette",
  MESSAGES_ATTACK: "index.php?ac=nachrichten&sac=angriff",
  MESSAGES_DEFENSE: "index.php?ac=nachrichten&sac=verteidigung",
  PROFILE: "index.php?ac=showuser",
} as const;

// ============================================================================
// ACTION CODES (for form submissions)
// ============================================================================
export const MG_ACTIONS = {
  RAID: "raubzug",
  GRAVEYARD: "friedhof",
  STATUS: "status",
  TRAINING: "training",
  CITY: "stadt",
  ANCESTRAL: "ahnenstaette",
} as const;

// ============================================================================
// FORM PARAMETERS
// ============================================================================
export const MG_PARAMS = {
  // Manhunt
  MANHUNT_SAC: "vampir",
  MANHUNT_TIME: "jagdzeit",

  // PvP
  PVP_SEARCH_SAC: "gegner",
  PVP_ATTACK_SAC: "attack",
  OPPONENT_ID: "gegnerid",
  SEARCH_NAME: "searchname",
  SEARCH_OPT: "searchopt",

  // Graveyard
  WORK_SAC: "startjob",
  WORK_TIME: "arbeitszeit",
  WORK_CANCEL_SAC: "cancel",

  // Training
  TRAINING_TYPE: "typ",
  TRAINING_STRENGTH: "staerke",
  TRAINING_DEFENSE: "verteidigung",
  TRAINING_AGILITY: "gewandtheit",
  TRAINING_CONSTITUTION: "ausdauer",
  TRAINING_DEXTERITY: "charisma",

  // Store
  ITEM_ID: "item_id",
  CUR_PRICE: "cur_price",
  NUM_ITEMS: "num_items",
  ACTION_BUY: "buy",
  CURRENCY_GOLD: "gold",
} as const;

// ============================================================================
// MULTI-LANGUAGE TEXT PATTERNS
// ============================================================================
export const MG_TEXT = {
  // Race detection
  VAMPIRE: ["vampiro", "vampira", "vampire", "vampir"],
  WEREWOLF: ["hombre lobo", "werewolf", "werwolf"],

  // Attribute names (ES, EN, DE)
  STRENGTH: ["fuerza", "strength", "starke", "staerke"],
  DEFENSE: ["defensa", "defense", "verteidigung"],
  AGILITY: ["agilidad", "agility", "gewandtheit"],
  CONSTITUTION: ["resistencia", "stamina", "constitution", "ausdauer"],
  DEXTERITY: ["destreza", "dexterity", "charisma"],

  // Status labels
  ENERGY: ["energia vital", "energy", "health", "lebensenergie"],
  GOLD: ["oro", "gold"],
  EXPERIENCE: ["experiencia", "experience", "erfahrung"],
  BLOOD: ["cristales de sangre", "blood crystals", "blutkristalle"],

  // Cooldown/busy states
  PVP_COOLDOWN: [
    "you can only fight every",
    "solo puedes luchar cada",
    "du kannst nur alle",
    "caza de adversarios",
  ],
  MANHUNT_ACTIVE: [
    "caza de humanos",
    "human hunt",
    "menschenjagd",
    "on a manhunt",
  ],
  WORKING: [
    "trabajando",
    "cementerio",
    "graveyard",
    "friedhof",
    "working",
    "started working",
  ],
  IN_MISSION: ["mision", "grotto", "ahnenstaette", "ancestral"],

  // Results
  WINNER: ["vencedor", "winner", "sieger", "ganado"],
  LOOT_GOLD: ["ha conseguido", "you received", "erhalten"],
  LOOT_BLOOD: ["litros de sangre", "liters of blood", "liter blut"],
  XP_GAINED: [
    "puntos de experiencia",
    "punto de experiencia",
    "experience points",
    "erfahrungspunkte",
  ],

  // Hunt results
  HUNT_RESULT: ["resultado de la caza", "result of the hunt", "jagdergebnis"],
  HUNT_NOTHING: [
    "nada que encontrar",
    "nothing to be found",
    "nichts gefunden",
  ],
  HUNT_LIMIT: [
    "ya has usado todo tu tiempo de caza",
    "used all of today's hunting time",
    "jagdzeit aufgebraucht",
  ],

  // Search
  SEARCH_SUCCESS: ["exitoso", "successful", "erfolgreich"],
  NOT_FOUND: ["no fue encontrado", "not found", "nicht gefunden", "en vano"],
} as const;

// ============================================================================
// REGEX PATTERNS
// ============================================================================
export const MG_REGEX = {
  // Timer extraction from JavaScript
  SECONDS_COUNTER: /var\s+SecondsCOUNTER\s*=\s*(\d+);/i,

  // Time text parsing
  TIME_HOURS_MINUTES:
    /(?:In|En)\s+(\d+)\s+(?:hours?|horas?)\s+(?:and|y|,)\s+(\d+)\s+(?:minutes?|minutos?)/i,
  TIME_HOURS: /(?:In|En)\s+(\d+)\s+(?:hours?|horas?)/i,
  TIME_MINUTES: /(?:In|En)\s+(\d+)\s+(?:minutes?|minutos?)/i,

  // Statbar values
  GOLD_BALANCE: /id=["']goldbalance["'][^>]*>([\d,.]+)</i,
  BLOOD_BALANCE: /id=["']bloodbalance["'][^>]*>([\d,.]+)</i,
  STAMINA: /Energ(?:i|í)a\s+vital:.*?\(\s*([\d,.]+)\s*[|/]\s*([\d,.]+)\s*\)/is,
  STAMINA_SIMPLE: /Energ(?:i|í)a\s+vital:\s*([\d,.]+)/i,
  EXPERIENCE: /Experiencia.*?([\d,.]+)\s*[|/]\s*([\d,.]+)/is,
  SKILL_AVERAGE: /statbarSkillAverage["'][^>]*>.*?:\s*([\d,.]+)/i,

  // Attribute extraction
  STRENGTH: /Fuerza:.*?\((\d+)\)/is,
  DEFENSE: /Defensa:.*?\((\d+)\)/is,
  AGILITY: /Agilidad:.*?\((\d+)\)/is,
  CONSTITUTION: /Resistencia:.*?\((\d+)\)/is,
  DEXTERITY: /Destreza:.*?\((\d+)\)/is,
  LEVEL: /char_level["'][^>]*>(?:Nivel\s*)?(\d+)/i,

  // Race detection
  RACE_VAMPIRE: /vampiro|vampira/i,
  RACE_WEREWOLF: /hombre\s*lobo|werwolf|werewolf/i,

  // Fight report parsing
  WINNER_BANNER: /<div class="headerRowCWinner">.*?([^<]+)<\/div>/i,
  FIGHT_REPORT_LINK: /ac=fightreport&(?:amp;)?fightid=(\d+)/gi,
  RIVAL_LINK: /ac=showuser&(?:amp;)?showuserid=(\d+)[^>]*>([^<]+)<\/a>/i,
  PROFILE_NAME:
    /<div class="headerRow">(?:Hombre Lobo|Vampiro|Vampira|Werwolf|Werewolf)\s+([^<]+)<\/div>/i,
  OPPONENT_ID: /name=["']gegnerid["']\s+value=["'](\d+)["']/i,

  // Loot parsing
  LOOT_GOLD: /Ha conseguido ([\d,.]+)\s*<img[^>]+alt=["']Oro["']/i,
  LOOT_BLOOD: /(\d+)\s+litros\s+de\s+sangre/i,
  LOOT_XP:
    /([\d,.]+)\s+(?:experience\s+points|punto\(?s?\)?\s+de\s+experiencia|puntos\s+de\s+experiencia|experiencia|puntos\s+de\s+exp|experience)/i,

  // Training cost extraction
  TRAINING_COST: /typ=(\w+)["']>Entrenamiento\s*\(coste\)\s*([\d,.]+)/i,

  // Potion inventory check
  POTION_USE_ITEM: /useitem=(\d+)/i,

  // Manhunt form
  MANHUNT_JAGDZEIT: /name=["']jagdzeit["']\s+value=["'](\d+)["']/i,
  MANHUNT_REPEAT_FORM: /name=["']sac["']\s+value=["']vampir["']/i,

  // Busy state content box
  BUSY_CONTENT: /class=["']pageContentC["'][^>]*>(.*?)<\/div>/is,
} as const;

// ============================================================================
// POTIONS DATA
// ============================================================================
export const MG_POTIONS = [
  {
    id: 11,
    cost: 4250,
    hp: 5000,
    name: "Esencia de fortaleza (5000)",
    reqLevel: 60,
  },
  {
    id: 10,
    cost: 2200,
    hp: 2500,
    name: "Esencia de fortaleza (2500)",
    reqLevel: 40,
  },
  {
    id: 8,
    cost: 891,
    hp: 1000,
    name: "Esencia de fortaleza (1000)",
    reqLevel: 20,
  },
  {
    id: 7,
    cost: 445,
    hp: 500,
    name: "Esencia de fortaleza (500)",
    reqLevel: 10,
  },
  { id: 2, cost: 89, hp: 100, name: "Esencia de fortaleza (100)", reqLevel: 2 },
  { id: 1, cost: 49, hp: 50, name: "Esencia de fortaleza (50)", reqLevel: 1 },
] as const;

// ============================================================================
// TRAINING MAP
// ============================================================================
export const MG_TRAINING = {
  train_strength: { type: "staerke", label: "Fuerza" },
  train_defense: { type: "verteidigung", label: "Defensa" },
  train_agility: { type: "gewandtheit", label: "Agilidad" },
  train_constitution: { type: "ausdauer", label: "Resistencia" },
  train_dexterity: { type: "charisma", label: "Destreza" },
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Normalizes European number formatting (e.g., 66.876,06 -> 66876.06)
 */
export function parseEuropeanNumber(str: string | null): number {
  if (!str) return 0;
  const normalized = str
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return parseFloat(normalized) || 0;
}

/**
 * Formats seconds into a human-readable duration string (Xh Ym Zs).
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || (h === 0 && m === 0)) parts.push(`${s}s`);
  return parts.join(" ");
}

/**
 * Parses time from text patterns like "In 9 minutes" or "En 2 horas y 30 minutos".
 * Returns seconds, or null if no pattern matched.
 */
export function parseTimeFromText(html: string): number | null {
  const combinedMatch = html.match(MG_REGEX.TIME_HOURS_MINUTES);
  if (combinedMatch) {
    return parseInt(combinedMatch[1]) * 3600 + parseInt(combinedMatch[2]) * 60;
  }
  const hoursMatch = html.match(MG_REGEX.TIME_HOURS);
  if (hoursMatch) return parseInt(hoursMatch[1]) * 3600;
  const minutesMatch = html.match(MG_REGEX.TIME_MINUTES);
  if (minutesMatch) return parseInt(minutesMatch[1]) * 60;
  return null;
}

/**
 * Extracts the SecondsCOUNTER value from page HTML.
 */
export function extractCooldownTimer(html: string): number {
  const match = html.match(MG_REGEX.SECONDS_COUNTER);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Checks if text contains any of the multi-language patterns.
 */
export function matchesAnyPattern(
  text: string,
  patterns: readonly string[],
): boolean {
  const lower = text.toLowerCase();
  return patterns.some((pattern) => lower.includes(pattern));
}

/**
 * Detects race from HTML content.
 */
export function detectRace(html: string): "Vampire" | "Werewolf" {
  const lower = html.toLowerCase();
  if (MG_TEXT.VAMPIRE.some((pattern) => lower.includes(pattern)))
    return "Vampire";
  return "Werewolf";
}

/**
 * Detects busy state from page content.
 */
export function detectBusyState(html: string): {
  isWorking: boolean;
  isInMission: boolean;
  isManhunting: boolean;
} {
  const busyBox = html.match(MG_REGEX.BUSY_CONTENT);
  const busyText = busyBox ? busyBox[1].toLowerCase() : html.toLowerCase();

  return {
    isWorking: matchesAnyPattern(busyText, MG_TEXT.WORKING),
    isInMission: matchesAnyPattern(busyText, MG_TEXT.IN_MISSION),
    isManhunting: matchesAnyPattern(busyText, MG_TEXT.MANHUNT_ACTIVE),
  };
}

/**
 * Detects cooldown reason from hunt page HTML.
 */
export function detectCooldownReason(html: string): string {
  if (matchesAnyPattern(html, MG_TEXT.PVP_COOLDOWN)) {
    return "PvP attack cooldown";
  }
  if (matchesAnyPattern(html, MG_TEXT.MANHUNT_ACTIVE)) {
    return "Manhunt in progress";
  }
  if (matchesAnyPattern(html, MG_TEXT.WORKING)) {
    return "Graveyard work shift in progress";
  }
  if (matchesAnyPattern(html, MG_TEXT.IN_MISSION)) {
    return "Ancestral Grotto mission in progress";
  }

  return "Combat cooldown active";
}

/**
 * Parses statbar values from HTML.
 */
export function parseStatbar(html: string): {
  gold: number;
  blood: number;
  stamina: number;
  maxStamina: number;
  experience: number;
  nextLevelExp: number;
  level: number;
  skillAverage: number;
} {
  const staminaMatch =
    html.match(MG_REGEX.STAMINA) || html.match(MG_REGEX.STAMINA_SIMPLE);
  const stamina = parseEuropeanNumber(staminaMatch?.[1] || "0");
  const maxStamina = parseEuropeanNumber(staminaMatch?.[2] || "800");

  const expMatch = html.match(MG_REGEX.EXPERIENCE);

  return {
    gold: parseEuropeanNumber(html.match(MG_REGEX.GOLD_BALANCE)?.[1] || "0"),
    blood: parseEuropeanNumber(html.match(MG_REGEX.BLOOD_BALANCE)?.[1] || "0"),
    stamina,
    maxStamina,
    experience: parseEuropeanNumber(expMatch?.[1] || "0"),
    nextLevelExp: parseEuropeanNumber(expMatch?.[2] || "100"),
    level: parseInt(html.match(MG_REGEX.LEVEL)?.[1] || "0"),
    skillAverage: parseEuropeanNumber(
      html.match(MG_REGEX.SKILL_AVERAGE)?.[1] || "0",
    ),
  };
}

/**
 * Parses attributes from HTML.
 */
export function parseAttributes(html: string): {
  strength: number;
  defense: number;
  dexterity: number;
  agility: number;
  constitution: number;
} {
  return {
    strength: parseInt(html.match(MG_REGEX.STRENGTH)?.[1] || "0"),
    defense: parseInt(html.match(MG_REGEX.DEFENSE)?.[1] || "0"),
    dexterity: parseInt(html.match(MG_REGEX.DEXTERITY)?.[1] || "0"),
    agility: parseInt(html.match(MG_REGEX.AGILITY)?.[1] || "0"),
    constitution: parseInt(html.match(MG_REGEX.CONSTITUTION)?.[1] || "0"),
  };
}

/**
 * Parses battle result from fight report HTML.
 */
export function parseBattleResult(html: string): {
  isWinner: boolean;
  goldLooted: number;
  xpEarned: number;
} {
  return {
    isWinner:
      html.includes("headerRowCWinner") ||
      matchesAnyPattern(html, MG_TEXT.WINNER),
    goldLooted: parseEuropeanNumber(html.match(MG_REGEX.LOOT_GOLD)?.[1] || "0"),
    xpEarned: parseEuropeanNumber(html.match(MG_REGEX.LOOT_XP)?.[1] || "0"),
  };
}

/**
 * Finds the best affordable potion within budget.
 */
export function findBestPotion(
  gold: number,
  budget: number,
): (typeof MG_POTIONS)[number] | undefined {
  return MG_POTIONS.find(
    (potion) => potion.cost <= budget && potion.cost <= gold,
  );
}

/**
 * Checks if potion exists in inventory HTML.
 */
export function findPotionInInventory(
  html: string,
): (typeof MG_POTIONS)[number] | undefined {
  return MG_POTIONS.find((potion) => html.includes(`useitem=${potion.id}`));
}

/**
 * Build full URL from server and route.
 */
export function buildUrl(server: string, route: string): string {
  return `https://${server}/${route}`;
}

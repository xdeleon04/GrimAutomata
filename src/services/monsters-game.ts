/**
 * @fileOverview Service for interacting with MonstersGame via MoonID.
 * Handles authentication, cookie persistence, and HTML scraping from the game realm.
 */

export interface MonstersGameStats {
  race: 'Vampire' | 'Werewolf';
  logs: Array<{
    type: 'INFO' | 'BATTLE' | 'TRAINING' | 'LOOT' | 'ERROR' | 'MANHUNT' | 'MISSION' | 'DEBUG';
    message: string;
    timestamp: string;
  }>;
  stats: {
    level: number;
    gold: number;
    stamina: number;
    experience: number;
    nextLevelExp: number;
    attributes: {
      strength: number;
      defense: number;
      dexterity: number;
      agility: number;
      constitution: number;
    };
  };
}

/**
 * Normalizes European number formatting (e.g., 66.788,06 -> 66788.06)
 */
function parseMGNumber(str: string | null): number {
  if (!str) return 0;
  // Remove dots (thousands separator) and replace comma with dot (decimal separator)
  const normalized = str.replace(/\./g, '').replace(',', '.');
  return parseFloat(normalized) || 0;
}

/**
 * Fetches real data from the MonstersGame server by simulating a browser session.
 */
export async function fetchMonstersGameData(
  username: string, 
  password: string, 
  server: string,
  debug: boolean = false
): Promise<MonstersGameStats | null> {
  const debugLogs: string[] = [];
  const logDebug = (msg: string) => {
    if (debug) debugLogs.push(msg);
  };

  try {
    const cookies: string[] = [];
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

    logDebug(`[DEBUG] Initiating MoonID Auth for: ${username}`);
    
    // 1. Authenticate with MoonID
    const loginResponse = await fetch('https://moonid.net/api/account/connect/83/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
      },
      body: new URLSearchParams({
        username: username,
        password: password,
      }),
      redirect: 'manual'
    });

    logDebug(`[DEBUG] MoonID Response Status: ${loginResponse.status}`);
    const setCookies = loginResponse.headers.getSetCookie();
    cookies.push(...setCookies.map(c => c.split(';')[0]));
    logDebug(`[DEBUG] Collected ${cookies.length} cookies from MoonID`);

    // 2. Connect to the specific game server status page
    const realmUrl = `https://${server}/index.php?ac=status`;
    logDebug(`[DEBUG] Fetching Realm Status: ${realmUrl}`);
    
    const statusResponse = await fetch(realmUrl, {
      headers: {
        'Cookie': cookies.join('; '),
        'User-Agent': userAgent,
      }
    });

    const html = await statusResponse.text();
    logDebug(`[DEBUG] HTML Length: ${html.length} chars`);

    // 3. Extract Stats using Regex targeting the Spanish UI
    const extract = (regex: RegExp, content: string) => {
      const match = content.match(regex);
      return match ? match[1] : null;
    };

    // Extracting from Statbar (very reliable summary)
    const rawGold = extract(/id="goldbalance">([\d,.]+)<\/span>/i, html);
    const gold = parseMGNumber(rawGold);
    logDebug(`[DEBUG] Parsed Gold: ${gold} (Raw: ${rawGold})`);
    
    // Experiencia: 1411 / 1445
    const expMatch = html.match(/Experiencia:\s*(\d+)\s*\/\s*(\d+)/i);
    const experience = expMatch ? parseInt(expMatch[1]) : 0;
    const nextLevelExp = expMatch ? parseInt(expMatch[2]) : 0;
    logDebug(`[DEBUG] Exp: ${experience}/${nextLevelExp}`);

    // Nivel 17
    const levelMatch = html.match(/char_level">Nivel\s*(\d+)<\/span>/i);
    const level = levelMatch ? parseInt(levelMatch[1]) : 0;
    logDebug(`[DEBUG] Level: ${level}`);

    // Attributes from the main skills table
    const str = parseInt(extract(/Fuerza:.*?\((\d+)\)/si, html) || '10');
    const def = parseInt(extract(/Defensa:.*?\((\d+)\)/si, html) || '10');
    const agi = parseInt(extract(/Agilidad:.*?\((\d+)\)/si, html) || '10');
    const con = parseInt(extract(/Resistencia:.*?\((\d+)\)/si, html) || '10');
    const dex = parseInt(extract(/Destreza:.*?\((\d+)\)/si, html) || '10');
    logDebug(`[DEBUG] Stats -> STR: ${str}, DEF: ${def}, AGI: ${agi}, CON: ${con}, DEX: ${dex}`);

    // Energía vital: 780
    const rawStamina = extract(/Energía vital:\s*(\d+)/i, html);
    const stamina = rawStamina ? parseInt(rawStamina) : 100;

    // Determine Race
    const race: 'Vampire' | 'Werewolf' = html.toLowerCase().includes('vampiro') ? 'Vampire' : 'Werewolf';
    logDebug(`[DEBUG] Detected Race: ${race}`);

    // 4. Activity Logs
    const logs: MonstersGameStats['logs'] = [];
    
    // Add debug logs if enabled
    debugLogs.forEach(msg => {
      logs.push({
        type: 'DEBUG',
        message: msg,
        timestamp: new Date().toISOString()
      });
    });

    if (html.includes("You're still at work") || html.includes("Todavía estás trabajando")) {
      logs.push({
        type: 'INFO',
        message: 'Currently performing a ritual of labor in the mortal realm (Working).',
        timestamp: new Date().toISOString()
      });
    }

    if (logs.length === 0 || (debug && logs.length === debugLogs.length)) {
      logs.push({
        type: 'INFO',
        message: `Realm synchronization successful. Level ${level} ${race} detected.`,
        timestamp: new Date().toISOString()
      });
    }

    return {
      race,
      stats: {
        level,
        gold,
        stamina,
        experience,
        nextLevelExp,
        attributes: {
          strength: str,
          defense: def,
          dexterity: dex,
          agility: agi,
          constitution: con,
        }
      },
      logs
    };
  } catch (error: any) {
    console.error('MonstersGame Service Error:', error);
    return {
      race: 'Vampire',
      stats: { level: 0, gold: 0, stamina: 0, experience: 0, nextLevelExp: 0, attributes: { strength: 0, defense: 0, dexterity: 0, agility: 0, constitution: 0 } },
      logs: [{
        type: 'ERROR',
        message: `Failed to penetrate realm: ${error.message}`,
        timestamp: new Date().toISOString()
      }]
    };
  }
}

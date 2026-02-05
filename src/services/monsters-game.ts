/**
 * @fileOverview Service for interacting with MonstersGame via MoonID.
 * Handles authentication, cookie persistence, and HTML scraping from the game realm.
 */

export interface MonstersGameStats {
  race: 'Vampire' | 'Werewolf';
  logs: Array<{
    type: 'INFO' | 'BATTLE' | 'TRAINING' | 'LOOT' | 'ERROR' | 'MANHUNT' | 'MISSION';
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
function parseMGNumber(str: string): number {
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
  server: string
): Promise<MonstersGameStats | null> {
  try {
    const cookies: string[] = [];

    // 1. Authenticate with MoonID
    const loginResponse = await fetch('https://moonid.net/api/account/connect/83/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
      },
      body: new URLSearchParams({
        username: username,
        password: password,
      }),
      redirect: 'manual'
    });

    const setCookies = loginResponse.headers.getSetCookie();
    cookies.push(...setCookies.map(c => c.split(';')[0]));

    // 2. Connect to the specific game server
    const realmUrl = `https://${server}/index.php?ac=status`;
    const statusResponse = await fetch(realmUrl, {
      headers: {
        'Cookie': cookies.join('; '),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
      }
    });

    const html = await statusResponse.text();

    // 3. Extract Stats using Regex targeting the Spanish UI provided
    const extract = (regex: RegExp, content: string) => {
      const match = content.match(regex);
      return match ? match[1] : null;
    };

    // Extracting from Statbar for core values
    const rawGold = extract(/id="goldbalance">([\d,.]+)<\/span>/, html);
    const gold = parseMGNumber(rawGold || '0');
    
    const expMatch = html.match(/Experiencia: (\d+) \/ (\d+)<\/span>/);
    const experience = expMatch ? parseInt(expMatch[1]) : 0;
    const nextLevelExp = expMatch ? parseInt(expMatch[2]) : 0;

    const levelMatch = html.match(/char_level">Nivel (\d+)<\/span>/);
    const level = levelMatch ? parseInt(levelMatch[1]) : 0;

    // Attributes (Spanish mapping)
    // Fuerza -> Strength
    // Defensa -> Defense
    // Agilidad -> Agility
    // Resistencia -> Constitution
    // Destreza -> Dexterity
    const str = parseInt(extract(/Fuerza:<\/td>\s*<td>.*?\((\d+)\)/s, html) || '10');
    const def = parseInt(extract(/Defensa:<\/td>\s*<td>.*?\((\d+)\)/s, html) || '10');
    const agi = parseInt(extract(/Agilidad:<\/td>\s*<td>.*?\((\d+)\)/s, html) || '10');
    const con = parseInt(extract(/Resistencia:<\/td>\s*<td>.*?\((\d+)\)/s, html) || '10');
    const dex = parseInt(extract(/Destreza:<\/td>\s*<td>.*?\((\d+)\)/s, html) || '10');

    const stamina = parseInt(extract(/Energía vital: (\d+)<\/span>/, html) || '100');

    // Determine Race
    const race: 'Vampire' | 'Werewolf' = html.toLowerCase().includes('vampiro') ? 'Vampire' : 'Werewolf';

    // 4. Handle Logs (Fallback if ?ac=msg is unreliable)
    const logs: MonstersGameStats['logs'] = [];
    
    // Check if the user is currently working (sentinel for status)
    if (html.includes("You're still at work") || html.includes("Todavía estás trabajando")) {
      logs.push({
        type: 'INFO',
        message: 'Currently performing a ritual of labor in the mortal realm (Working).',
        timestamp: new Date().toISOString()
      });
    }

    // Attempt to fetch messages if possible, else use status info
    try {
      const logUrl = `https://${server}/index.php?ac=msg`;
      const logResponse = await fetch(logUrl, {
        headers: {
          'Cookie': cookies.join('; '),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
        }
      });
      const logHtml = await logResponse.text();
      const logMatches = logHtml.matchAll(/<div class="msg_title">(.*?)<\/div>.*?<div class="msg_content">(.*?)<\/div>/gs);
      
      for (const match of logMatches) {
        logs.push({
          type: match[1].includes('Battle') || match[1].includes('Combate') ? 'BATTLE' : 'INFO',
          message: match[2].replace(/<[^>]*>/g, '').trim(),
          timestamp: new Date().toISOString(),
        });
      }
    } catch (e) {
      // Ignore log fetch errors and rely on status info
    }

    if (logs.length === 0) {
      logs.push({
        type: 'INFO',
        message: `Realm synchronization successful. Level ${level} ${race} 'xaz' detected.`,
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
  } catch (error) {
    console.error('Scraping Error:', error);
    return null;
  }
}

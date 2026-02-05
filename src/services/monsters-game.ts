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
  server: string
): Promise<MonstersGameStats | null> {
  try {
    const cookies: string[] = [];
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

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

    const setCookies = loginResponse.headers.getSetCookie();
    cookies.push(...setCookies.map(c => c.split(';')[0]));

    // 2. Connect to the specific game server status page
    const realmUrl = `https://${server}/index.php?ac=status`;
    const statusResponse = await fetch(realmUrl, {
      headers: {
        'Cookie': cookies.join('; '),
        'User-Agent': userAgent,
      }
    });

    const html = await statusResponse.text();

    // 3. Extract Stats using Regex targeting the Spanish UI
    const extract = (regex: RegExp, content: string) => {
      const match = content.match(regex);
      return match ? match[1] : null;
    };

    // Extracting from Statbar (very reliable summary)
    const rawGold = extract(/id="goldbalance">([\d,.]+)<\/span>/i, html);
    const gold = parseMGNumber(rawGold);
    
    // Experiencia: 1411 / 1445
    const expMatch = html.match(/Experiencia:\s*(\d+)\s*\/\s*(\d+)/i);
    const experience = expMatch ? parseInt(expMatch[1]) : 0;
    const nextLevelExp = expMatch ? parseInt(expMatch[2]) : 0;

    // Nivel 17
    const levelMatch = html.match(/char_level">Nivel\s*(\d+)<\/span>/i);
    const level = levelMatch ? parseInt(levelMatch[1]) : 0;

    // Attributes from the main skills table
    // Regex matches the Spanish labels and pulls the bracketed numeric value: (55)
    const str = parseInt(extract(/Fuerza:.*?\((\d+)\)/si, html) || '10');
    const def = parseInt(extract(/Defensa:.*?\((\d+)\)/si, html) || '10');
    const agi = parseInt(extract(/Agilidad:.*?\((\d+)\)/si, html) || '10');
    const con = parseInt(extract(/Resistencia:.*?\((\d+)\)/si, html) || '10');
    const dex = parseInt(extract(/Destreza:.*?\((\d+)\)/si, html) || '10');

    // Energía vital: 780
    const rawStamina = extract(/Energía vital:\s*(\d+)/i, html);
    const stamina = rawStamina ? parseInt(rawStamina) : 100;

    // Determine Race
    const race: 'Vampire' | 'Werewolf' = html.toLowerCase().includes('vampiro') ? 'Vampire' : 'Werewolf';

    // 4. Activity Logs
    const logs: MonstersGameStats['logs'] = [];
    
    // Check for activity status
    if (html.includes("You're still at work") || html.includes("Todavía estás trabajando")) {
      logs.push({
        type: 'INFO',
        message: 'Currently performing a ritual of labor in the mortal realm (Working).',
        timestamp: new Date().toISOString()
      });
    }

    // Attempt to pull recent messages/battle reports
    try {
      const logUrl = `https://${server}/index.php?ac=msg`;
      const logResponse = await fetch(logUrl, {
        headers: {
          'Cookie': cookies.join('; '),
          'User-Agent': userAgent,
        }
      });
      const logHtml = await logResponse.text();
      // Basic message extraction
      const logMatches = Array.from(logHtml.matchAll(/<div class="msg_title">(.*?)<\/div>.*?<div class="msg_content">(.*?)<\/div>/gs));
      
      for (const match of logMatches.slice(0, 5)) {
        const title = match[1];
        const content = match[2].replace(/<[^>]*>/g, '').trim();
        logs.push({
          type: title.includes('Battle') || title.includes('Combate') ? 'BATTLE' : 'INFO',
          message: content,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (e) {
      // Fallback if message page fails
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
    console.error('MonstersGame Service Error:', error);
    return null;
  }
}

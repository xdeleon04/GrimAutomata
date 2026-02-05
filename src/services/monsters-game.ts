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
    maxStamina: number;
    experience: number;
    nextLevelExp: number;
    skillAverage: number;
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
  // Remove thousands separator (dot) and replace decimal separator (comma) with dot
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
    const cookies: Map<string, string> = new Map();
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

    const getCookieString = () => Array.from(cookies.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
    const updateCookies = (setCookieHeaders: string[] | null) => {
      if (!setCookieHeaders) return;
      setCookieHeaders.forEach(header => {
        const part = header.split(';')[0];
        const [key, ...valParts] = part.split('=');
        if (key) cookies.set(key.trim(), valParts.join('='));
      });
    };

    logDebug(`[DEBUG] Step 1: Visiting MoonID Login`);
    const preAuthResponse = await fetch('https://moonid.net/account/login/', {
      headers: { 
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
      }
    });
    updateCookies(preAuthResponse.headers.getSetCookie());
    const preAuthHtml = await preAuthResponse.text();
    
    const csrfMatch = preAuthHtml.match(/name=['"]csrfmiddlewaretoken['"]\s+value=['"]([^'"]+)['"]/i);
    const csrfToken = csrfMatch ? csrfMatch[1] : '';

    logDebug(`[DEBUG] Step 2: Posting Credentials to MoonID`);
    const loginPayload = new URLSearchParams({
      csrfmiddlewaretoken: csrfToken,
      username: username,
      password: password,
      next: '/api/account/connect/83/'
    });

    const loginResponse = await fetch('https://moonid.net/account/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': getCookieString(),
        'User-Agent': userAgent,
        'Origin': 'https://moonid.net',
        'Referer': 'https://moonid.net/account/login/'
      },
      body: loginPayload,
      redirect: 'manual'
    });

    updateCookies(loginResponse.headers.getSetCookie());

    let targetUrl = loginResponse.headers.get('Location');
    if (loginResponse.status === 302 && targetUrl) {
      logDebug(`[DEBUG] Step 3: Following MoonID Redirect to ${targetUrl}`);
      if (targetUrl.startsWith('/')) targetUrl = 'https://moonid.net' + targetUrl;
      const connectResponse = await fetch(targetUrl, {
        headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent },
        redirect: 'manual'
      });
      updateCookies(connectResponse.headers.getSetCookie());
      
      const gameUrl = connectResponse.headers.get('Location');
      if (gameUrl) {
        logDebug(`[DEBUG] Step 4: Finalizing Connection to Game Server ${gameUrl}`);
        const gameInitResponse = await fetch(gameUrl, {
          headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent },
          redirect: 'manual'
        });
        updateCookies(gameInitResponse.headers.getSetCookie());
      }
    }

    const statusUrl = `https://${server}/index.php?ac=status`;
    const statusResponse = await fetch(statusUrl, {
      headers: { 
        'Cookie': getCookieString(), 
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
      }
    });

    const html = await statusResponse.text();

    // Stats Extraction using flexible regex
    // Level: <span class="char_level">Nivel 17</span>
    const levelMatch = html.match(/class=["']char_level["'][^>]*>(?:Nivel\s*)?(\d+)/i);
    const level = levelMatch ? parseInt(levelMatch[1]) : 0;
    logDebug(`[DEBUG] Level Match: ${levelMatch ? levelMatch[0] : 'FAILED'} -> ${level}`);
    
    // Gold: <span id="goldbalance">66.788,06</span>
    const goldMatch = html.match(/id=["']goldbalance["'][^>]*>([\d,.]+)</i);
    const gold = parseMGNumber(goldMatch ? goldMatch[1] : "0");
    logDebug(`[DEBUG] Gold Match: ${goldMatch ? goldMatch[0] : 'FAILED'} -> ${gold}`);
    
    // Skill Average: id="statbarSkillAverage">Promedio de Habilidad: 50,00</span>
    const skillAvgMatch = html.match(/id=["']statbarSkillAverage["'][^>]*>.*?(?:Promedio de Habilidad:)?\s*([\d,.]+)/i);
    const skillAverage = parseMGNumber(skillAvgMatch ? skillAvgMatch[1] : "0");
    logDebug(`[DEBUG] Skill Average Match: ${skillAvgMatch ? skillAvgMatch[0] : 'FAILED'} -> ${skillAverage}`);

    // Experience: handles (1411|1445) or Experiencia: 1411 / 1445
    const expMatch = html.match(/Experiencia.*?\(\s*(\d+)\s*[|/]\s*(\d+)\s*\)/i) || 
                     html.match(/Experiencia:\s*(\d+)\s*[|/]\s*(\d+)/i);
    const experience = expMatch ? parseInt(expMatch[1]) : 0;
    const nextLevelExp = expMatch ? parseInt(expMatch[2]) : 100;
    logDebug(`[DEBUG] XP Match: ${expMatch ? expMatch[0] : 'FAILED'} -> ${experience}/${nextLevelExp}`);

    // Attributes (Spanish labels)
    const findStat = (label: string) => {
      const regex = new RegExp(`${label}:.*?\\(\\s*(\\d+)\\s*\\)`, 'si');
      const match = html.match(regex);
      return match ? parseInt(match[1]) : 0;
    };

    const str = findStat('Fuerza');
    const def = findStat('Defensa');
    const agi = findStat('Agilidad');
    const con = findStat('Resistencia');
    const dex = findStat('Destreza');

    // Stamina/Energy ratio extraction: Energía vital: (780|780)
    const staminaMatch = html.match(/Energía\s+vital:.*?\(\s*(\d+)\s*[|/]\s*(\d+)\s*\)/si) || 
                         html.match(/Energía\s+vital:\s*(\d+)\s*[|/]\s*(\d+)/i) ||
                         html.match(/Energía\s+vital:\s*(\d+)/i);
    const stamina = staminaMatch ? parseInt(staminaMatch[1]) : 0;
    const maxStamina = (staminaMatch && staminaMatch[2]) ? parseInt(staminaMatch[2]) : 100;
    logDebug(`[DEBUG] Stamina Match: ${staminaMatch ? staminaMatch[0] : 'FAILED'} -> ${stamina}/${maxStamina}`);

    const race: 'Vampire' | 'Werewolf' = (html.toLowerCase().includes('vampiro') || html.toLowerCase().includes('vampira')) ? 'Vampire' : 'Werewolf';
    
    const logs: MonstersGameStats['logs'] = [];
    debugLogs.forEach(msg => {
      logs.push({ type: 'DEBUG', message: msg, timestamp: new Date().toISOString() });
    });

    if (html.includes("You're still at work") || html.includes("estás trabajando") || html.includes("trabajando")) {
      logs.push({
        type: 'INFO',
        message: 'Currently performing a ritual of labor (Working). System on standby.',
        timestamp: new Date().toISOString()
      });
    }

    if (level > 0) {
      logs.push({
        type: 'INFO',
        message: `Sanctuary synchronization complete. Level ${level} ${race} scrolls verified.`,
        timestamp: new Date().toISOString()
      });
    } else {
      logs.push({
        type: 'ERROR',
        message: 'Realm accessed, but identity scrolls were illegible (Parsing failure). Check debug logs.',
        timestamp: new Date().toISOString()
      });
    }

    return {
      race,
      stats: {
        level, gold, stamina, maxStamina, experience, nextLevelExp, skillAverage,
        attributes: { strength: str, defense: def, dexterity: dex, agility: agi, constitution: con }
      },
      logs
    };
  } catch (error: any) {
    return {
      race: 'Vampire',
      stats: { level: 0, gold: 0, stamina: 0, maxStamina: 100, experience: 0, nextLevelExp: 0, skillAverage: 0, attributes: { strength: 0, defense: 0, dexterity: 0, agility: 0, constitution: 0 } },
      logs: [{ type: 'ERROR', message: `Ritual failed: ${error.message}`, timestamp: new Date().toISOString() }]
    };
  }
}

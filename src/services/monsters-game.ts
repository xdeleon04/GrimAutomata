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

    logDebug(`[DEBUG] Ritual Step 1: Visiting MoonID Login Sanctum`);
    
    // 1a. Get initial session cookies and CSRF token
    const preAuthResponse = await fetch('https://moonid.net/account/login/', {
      headers: { 'User-Agent': userAgent }
    });
    updateCookies(preAuthResponse.headers.getSetCookie());
    const preAuthHtml = await preAuthResponse.text();
    
    const csrfMatch = preAuthHtml.match(/name=['"]csrfmiddlewaretoken['"]\s+value=['"]([^'"]+)['"]/i);
    const csrfToken = csrfMatch ? csrfMatch[1] : '';
    logDebug(`[DEBUG] Gatekeeper Token (CSRF): ${csrfToken ? 'CAPTURED' : 'MISSING'}`);

    logDebug(`[DEBUG] Ritual Step 2: Binding Identity to MoonID`);
    
    const loginPayload = new URLSearchParams({
      csrfmiddlewaretoken: csrfToken,
      username: username,
      password: password,
      next: '/api/account/connect/83/'
    });

    const loginResponse = await fetch('https://moonid.net/account/login/', {
      method: 'POST',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'max-age=0',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': getCookieString(),
        'Origin': 'https://moonid.net',
        'Referer': 'https://moonid.net/account/login/',
        'User-Agent': userAgent,
      },
      body: loginPayload,
      redirect: 'manual'
    });

    logDebug(`[DEBUG] MoonID Gate Status: ${loginResponse.status}`);
    updateCookies(loginResponse.headers.getSetCookie());

    let targetUrl = loginResponse.headers.get('Location');
    if (loginResponse.status === 302 && targetUrl) {
      if (targetUrl.startsWith('/')) targetUrl = 'https://moonid.net' + targetUrl;
      logDebug(`[DEBUG] Descending to Connect API: ${targetUrl}`);
      
      const connectResponse = await fetch(targetUrl, {
        headers: {
          'Cookie': getCookieString(),
          'User-Agent': userAgent,
          'Referer': 'https://moonid.net/account/login/'
        },
        redirect: 'manual'
      });
      updateCookies(connectResponse.headers.getSetCookie());
      
      let gameUrl = connectResponse.headers.get('Location');
      if (gameUrl) {
        logDebug(`[DEBUG] Finalizing connection to Realm Core: ${gameUrl}`);
        const gameInitResponse = await fetch(gameUrl, {
          headers: {
            'Cookie': getCookieString(),
            'User-Agent': userAgent
          },
          redirect: 'manual'
        });
        updateCookies(gameInitResponse.headers.getSetCookie());
      }
    }

    const statusUrl = `https://${server}/index.php?ac=status`;
    logDebug(`[DEBUG] Ritual Step 3: Scanning Character Scrolls at ${statusUrl}`);
    
    const statusResponse = await fetch(statusUrl, {
      headers: {
        'Cookie': getCookieString(),
        'User-Agent': userAgent,
        'Referer': 'https://moonid.net/'
      }
    });

    const html = await statusResponse.text();
    logDebug(`[DEBUG] Scroll Data Length: ${html.length} symbols`);

    // Extract Stats using robust Regex targeting the Spanish UI provided
    const extractValue = (regex: RegExp, content: string) => {
      const match = content.match(regex);
      return match ? match[1] : null;
    };

    // 1. Level extraction - multiple patterns for robustness
    let level = 0;
    const levelMatch = html.match(/class="char_level"[^>]*>(?:Nivel\s*)?(\d+)/i) || 
                       html.match(/Nivel del personaje:.*?(\d+)/si);
    if (levelMatch) {
      level = parseInt(levelMatch[1]);
      logDebug(`[DEBUG] Extracted Level: ${level}`);
    } else {
      logDebug(`[DEBUG] Level not found in char_level or label. Checking raw text.`);
      const fallbackLevel = html.match(/Nivel\s+(\d+)/i);
      if (fallbackLevel) level = parseInt(fallbackLevel[1]);
    }

    // 2. Gold extraction from statbar
    const gold = parseMGNumber(extractValue(/id="goldbalance">([\d,.]+)<\/span>/i, html));
    
    // 3. Experience extraction - prioritizing statbar for summary
    let experience = 0;
    let nextLevelExp = 100;
    const expMatch = html.match(/Experiencia:\s*([\d.]+)\s*[\/|]\s*([\d.]+)/i);
    if (expMatch) {
      experience = parseInt(expMatch[1].replace(/\./g, ''));
      nextLevelExp = parseInt(expMatch[2].replace(/\./g, ''));
      logDebug(`[DEBUG] Experience Sync: ${experience} / ${nextLevelExp}`);
    } else {
      // Table fallback for XP
      const expTableMatch = html.match(/Experiencia total:.*?\((\d+)\|(\d+)\)/si);
      if (expTableMatch) {
        experience = parseInt(expTableMatch[1]);
        nextLevelExp = parseInt(expTableMatch[2]);
      }
    }

    // 4. Attributes extraction - targeting the Spanish labels
    const findStat = (label: string) => {
      const regex = new RegExp(`${label}:.*?\\((\\d+)\\)`, 'si');
      const match = html.match(regex);
      return match ? parseInt(match[1]) : 0;
    };

    const str = findStat('Fuerza');
    const def = findStat('Defensa');
    const agi = findStat('Agilidad');
    const con = findStat('Resistencia');
    const dex = findStat('Destreza');

    // 5. Vital Energy (Stamina)
    const rawStamina = extractValue(/Energía\s+vital:.*?\((\d+)[|/]/si, html);
    const stamina = rawStamina ? parseInt(rawStamina) : 100;

    // Determine Race
    const race: 'Vampire' | 'Werewolf' = (html.toLowerCase().includes('vampiro') || html.toLowerCase().includes('vampira')) ? 'Vampire' : 'Werewolf';
    
    logDebug(`[DEBUG] Scan Finalized -> Lvl: ${level}, Gold: ${gold}, STR: ${str}, CON: ${con}`);

    const logs: MonstersGameStats['logs'] = [];
    debugLogs.forEach(msg => {
      logs.push({
        type: 'DEBUG',
        message: msg,
        timestamp: new Date().toISOString()
      });
    });

    if (html.includes("You're still at work") || html.includes("estás trabajando")) {
      logs.push({
        type: 'INFO',
        message: 'Currently performing a ritual of labor (Working). System on standby.',
        timestamp: new Date().toISOString()
      });
    }

    if (logs.length === 0 || (debug && logs.length === debugLogs.length)) {
      logs.push({
        type: 'INFO',
        message: `Sanctuary synchronization complete. Level ${level} ${race} scrolls verified.`,
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
    console.error('MonstersGame Service Ritual Failure:', error);
    return {
      race: 'Vampire',
      stats: { level: 0, gold: 0, stamina: 0, experience: 0, nextLevelExp: 0, attributes: { strength: 0, defense: 0, dexterity: 0, agility: 0, constitution: 0 } },
      logs: [{
        type: 'ERROR',
        message: `Ritual failed: ${error.message}`,
        timestamp: new Date().toISOString()
      }]
    };
  }
}

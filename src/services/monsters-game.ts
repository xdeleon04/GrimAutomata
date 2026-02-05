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

    logDebug(`[DEBUG] Step 1: Visiting MoonID Login Page for Session/CSRF`);
    
    // 1a. Get initial session cookies and CSRF token
    const preAuthResponse = await fetch('https://moonid.net/account/login/', {
      headers: { 'User-Agent': userAgent }
    });
    updateCookies(preAuthResponse.headers.getSetCookie());
    const preAuthHtml = await preAuthResponse.text();
    
    // Extract CSRF token if present (common in Django apps like MoonID)
    const csrfMatch = preAuthHtml.match(/name=['"]csrfmiddlewaretoken['"]\s+value=['"]([^'"]+)['"]/i);
    const csrfToken = csrfMatch ? csrfMatch[1] : '';
    logDebug(`[DEBUG] CSRF Token found: ${csrfToken ? 'YES' : 'NO'}`);

    logDebug(`[DEBUG] Step 2: Authenticating with MoonID`);
    
    // 1b. Perform Login
    const loginPayload = new URLSearchParams({
      username: username,
      password: password,
      csrfmiddlewaretoken: csrfToken,
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

    logDebug(`[DEBUG] MoonID Auth Status: ${loginResponse.status}`);
    updateCookies(loginResponse.headers.getSetCookie());

    if (loginResponse.status === 403) {
      logDebug(`[DEBUG] CRITICAL: MoonID Sanctuary denied entry (403). Possible bot protection or rate limiting.`);
      throw new Error("Forbidden: MoonID sanctuary denied access. Ensure credentials are valid and try again later.");
    }

    // 2. Connect to the specific game server status page
    const realmUrl = `https://${server}/index.php?ac=status`;
    logDebug(`[DEBUG] Step 3: Penetrating Realm Status: ${realmUrl}`);
    
    const statusResponse = await fetch(realmUrl, {
      headers: {
        'Cookie': getCookieString(),
        'User-Agent': userAgent,
        'Referer': 'https://moonid.net/'
      }
    });

    const html = await statusResponse.text();
    logDebug(`[DEBUG] Sanctuary HTML Length: ${html.length} chars`);

    if (html.includes('login') && html.length < 5000) {
      logDebug(`[DEBUG] WARNING: Redirected to login. Session might not have bound correctly.`);
    }

    // 3. Extract Stats using Regex targeting the Spanish UI
    const extract = (regex: RegExp, content: string) => {
      const match = content.match(regex);
      return match ? match[1] : null;
    };

    // Extracting from Statbar (Reliable summary)
    const rawGold = extract(/id="goldbalance">([\d,.]+)<\/span>/i, html);
    const gold = parseMGNumber(rawGold);
    
    // Experiencia: 1411 / 1445
    const expMatch = html.match(/Experiencia:\s*([\d.]+)\s*\/\s*([\d.]+)/i);
    const experience = expMatch ? parseInt(expMatch[1].replace(/\./g, '')) : 0;
    const nextLevelExp = expMatch ? parseInt(expMatch[2].replace(/\./g, '')) : 0;

    // Nivel 17
    const levelMatch = html.match(/char_level">Nivel\s*(\d+)<\/span>/i);
    const level = levelMatch ? parseInt(levelMatch[1]) : 0;

    // Attributes from Spanish skills table
    const str = parseInt(extract(/Fuerza:.*?\((\d+)\)/si, html) || '0');
    const def = parseInt(extract(/Defensa:.*?\((\d+)\)/si, html) || '0');
    const agi = parseInt(extract(/Agilidad:.*?\((\d+)\)/si, html) || '0');
    const con = parseInt(extract(/Resistencia:.*?\((\d+)\)/si, html) || '0');
    const dex = parseInt(extract(/Destreza:.*?\((\d+)\)/si, html) || '0');

    // Energía vital: (780|780)
    const rawStamina = extract(/Energía vital:.*?\((\d+)\|/si, html);
    const stamina = rawStamina ? parseInt(rawStamina) : 100;

    // Determine Race
    const race: 'Vampire' | 'Werewolf' = html.toLowerCase().includes('vampiro') ? 'Vampire' : 'Werewolf';
    logDebug(`[DEBUG] Final Stats -> Level: ${level}, Gold: ${gold}, Race: ${race}`);

    const logs: MonstersGameStats['logs'] = [];
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
        message: `Ritual failed: ${error.message}`,
        timestamp: new Date().toISOString()
      }]
    };
  }
}

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
    
    // 1b. Perform Login
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

    // 1c. Follow Redirect to API Connect (This is crucial for establishing the game session)
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
      
      // 1d. Follow final redirect to the game server
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
    } else if (loginResponse.status === 403) {
      throw new Error("Sanctum denied entry (403). Gateway protection detected.");
    }

    // 2. Connect to the specific game server status page
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

    // Extract Stats using robust Regex targeting the Spanish UI
    const extract = (regex: RegExp, content: string) => {
      const match = content.match(regex);
      return match ? match[1] : null;
    };

    // Extracting from Statbar (Reliable summary at the bottom)
    const rawGold = extract(/id="goldbalance">([\d,.]+)<\/span>/i, html);
    const gold = parseMGNumber(rawGold);
    
    // Experiencia: 1411 / 1445 (Targeting the statbarEntry)
    const expMatch = html.match(/Experiencia:\s*([\d.]+)\s*\/\s*([\d.]+)/i);
    const experience = expMatch ? parseInt(expMatch[1].replace(/\./g, '')) : 0;
    const nextLevelExp = expMatch ? parseInt(expMatch[2].replace(/\./g, '')) : 0;

    // Nivel del personaje (Targeting the char_level span in the habilidades table)
    // <span class="char_level">Nivel 17</span>
    const levelMatch = html.match(/class="char_level"[^>]*>(?:Nivel\s*)?(\d+)/i);
    const level = levelMatch ? parseInt(levelMatch[1]) : 0;
    logDebug(`[DEBUG] Extracted Character Level: ${level}`);

    // Attributes from Spanish skills table
    const str = parseInt(extract(/Fuerza:.*?\((\d+)\)/si, html) || '0');
    const def = parseInt(extract(/Defensa:.*?\((\d+)\)/si, html) || '0');
    const agi = parseInt(extract(/Agilidad:.*?\((\d+)\)/si, html) || '0');
    const con = parseInt(extract(/Resistencia:.*?\((\d+)\)/si, html) || '0');
    const dex = parseInt(extract(/Destreza:.*?\((\d+)\)/si, html) || '0');

    // Energía vital: (780|780)
    const rawStamina = extract(/Energía\s+vital:.*?\((\d+)\|/si, html);
    const stamina = rawStamina ? parseInt(rawStamina) : 100;

    // Determine Race (Check for Spanish terms)
    const race: 'Vampire' | 'Werewolf' = (html.toLowerCase().includes('vampiro') || html.toLowerCase().includes('vampira')) ? 'Vampire' : 'Werewolf';
    
    logDebug(`[DEBUG] Final Stats Scanned -> Level: ${level}, Gold: ${gold}, Race: ${race}, STR: ${str}, CON: ${con}`);

    const logs: MonstersGameStats['logs'] = [];
    debugLogs.forEach(msg => {
      logs.push({
        type: 'DEBUG',
        message: msg,
        timestamp: new Date().toISOString()
      });
    });

    if (html.includes("You're still at work") || html.includes("Todavía estás trabajando") || html.includes("estás trabajando")) {
      logs.push({
        type: 'INFO',
        message: 'Currently performing a ritual of labor in the mortal realm (Working).',
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

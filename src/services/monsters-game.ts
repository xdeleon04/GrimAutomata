
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
      headers: { 'User-Agent': userAgent }
    });
    updateCookies(preAuthResponse.headers.getSetCookie());
    const preAuthHtml = await preAuthResponse.text();
    
    const csrfMatch = preAuthHtml.match(/name=['"]csrfmiddlewaretoken['"]\s+value=['"]([^'"]+)['"]/i);
    const csrfToken = csrfMatch ? csrfMatch[1] : '';

    logDebug(`[DEBUG] Step 2: Posting Credentials`);
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
        'Referer': 'https://moonid.net/account/login/'
      },
      body: loginPayload,
      redirect: 'manual'
    });

    updateCookies(loginResponse.headers.getSetCookie());

    let targetUrl = loginResponse.headers.get('Location');
    if (loginResponse.status === 302 && targetUrl) {
      if (targetUrl.startsWith('/')) targetUrl = 'https://moonid.net' + targetUrl;
      const connectResponse = await fetch(targetUrl, {
        headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent },
        redirect: 'manual'
      });
      updateCookies(connectResponse.headers.getSetCookie());
      
      const gameUrl = connectResponse.headers.get('Location');
      if (gameUrl) {
        const gameInitResponse = await fetch(gameUrl, {
          headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent },
          redirect: 'manual'
        });
        updateCookies(gameInitResponse.headers.getSetCookie());
      }
    }

    const statusUrl = `https://${server}/index.php?ac=status`;
    const statusResponse = await fetch(statusUrl, {
      headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent }
    });

    const html = await statusResponse.text();

    // Stats Extraction
    const extractValue = (regex: RegExp, content: string) => {
      const match = content.match(regex);
      return match ? match[1] : null;
    };

    const levelMatch = html.match(/class="char_level"[^>]*>(?:Nivel\s*)?(\d+)/i);
    const level = levelMatch ? parseInt(levelMatch[1]) : 0;
    
    const gold = parseMGNumber(extractValue(/id="goldbalance">([\d,.]+)<\/span>/i, html));
    
    const expMatch = html.match(/Experiencia:\s*([\d.]+)\s*[\/|]\s*([\d.]+)/i) || 
                     html.match(/Experiencia total:.*?\((\d+)\|(\d+)\)/si);
    const experience = expMatch ? parseInt(expMatch[1].replace(/\./g, '')) : 0;
    const nextLevelExp = expMatch ? parseInt(expMatch[2].replace(/\./g, '')) : 100;

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

    // Stamina: Prioritize the (current|max) format from the skills table
    const staminaMatch = html.match(/Energía\s+vital:.*?\((\d+)[|/](\d+)\)/si);
    const stamina = staminaMatch ? parseInt(staminaMatch[1]) : 100;
    const maxStamina = staminaMatch ? parseInt(staminaMatch[2]) : 100;

    const race: 'Vampire' | 'Werewolf' = (html.toLowerCase().includes('vampiro') || html.toLowerCase().includes('vampira')) ? 'Vampire' : 'Werewolf';
    
    const logs: MonstersGameStats['logs'] = [];
    debugLogs.forEach(msg => {
      logs.push({ type: 'DEBUG', message: msg, timestamp: new Date().toISOString() });
    });

    if (html.includes("You're still at work") || html.includes("estás trabajando")) {
      logs.push({
        type: 'INFO',
        message: 'Currently performing a ritual of labor (Working). System on standby.',
        timestamp: new Date().toISOString()
      });
    } else {
      logs.push({
        type: 'INFO',
        message: `Sanctuary synchronization complete. Level ${level} ${race} verified.`,
        timestamp: new Date().toISOString()
      });
    }

    return {
      race,
      stats: {
        level, gold, stamina, maxStamina, experience, nextLevelExp,
        attributes: { strength: str, defense: def, dexterity: dex, agility: agi, constitution: con }
      },
      logs
    };
  } catch (error: any) {
    return {
      race: 'Vampire',
      stats: { level: 0, gold: 0, stamina: 0, maxStamina: 100, experience: 0, nextLevelExp: 0, attributes: { strength: 0, defense: 0, dexterity: 0, agility: 0, constitution: 0 } },
      logs: [{ type: 'ERROR', message: `Ritual failed: ${error.message}`, timestamp: new Date().toISOString() }]
    };
  }
}

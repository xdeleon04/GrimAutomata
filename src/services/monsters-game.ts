/**
 * @fileOverview Service for interacting with MonstersGame via MoonID.
 * Handles authentication, cookie persistence, and active ritual execution (automations).
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
  // Remove thousands separator (.) and replace decimal separator (,) with (.)
  const normalized = str.replace(/\./g, '').replace(',', '.');
  return parseFloat(normalized) || 0;
}

/**
 * Executes active rituals (automations) and fetches real data from the MonstersGame server.
 */
export async function fetchMonstersGameData(
  username: string, 
  password: string, 
  server: string,
  debug: boolean = false,
  settings: Record<string, any> = {}
): Promise<MonstersGameStats | null> {
  const debugLogs: string[] = [];
  const logs: MonstersGameStats['logs'] = [];
  const logDebug = (msg: string) => {
    if (debug) {
      debugLogs.push(msg);
      logs.push({ type: 'DEBUG', message: msg, timestamp: new Date().toISOString() });
    }
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

    logDebug(`[AUTH] Initiating MoonID authentication ritual...`);
    
    // 1. Visit Login Page to get CSRF
    const preAuthResponse = await fetch('https://moonid.net/account/login/', {
      headers: { 'User-Agent': userAgent }
    });
    updateCookies(preAuthResponse.headers.getSetCookie());
    const preAuthHtml = await preAuthResponse.text();
    const csrfMatch = preAuthHtml.match(/name=['"]csrfmiddlewaretoken['"]\s+value=['"]([^'"]+)['"]/i);
    const csrfToken = csrfMatch ? csrfMatch[1] : '';

    // 2. Perform Login
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
        'Referer': 'https://moonid.net/account/login/',
        'Origin': 'https://moonid.net',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
      },
      body: loginPayload,
      redirect: 'manual'
    });
    updateCookies(loginResponse.headers.getSetCookie());

    // 3. Follow Redirects to establish session
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

    // --- STEP 1: INITIAL SYNC ---
    const statusUrl = `https://${server}/index.php?ac=status`;
    let statusResponse = await fetch(statusUrl, {
      headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent }
    });
    let html = await statusResponse.text();

    // Extract Basic Stats for ritual decisions
    const staminaMatch = html.match(/Energía\s+vital:.*?\(\s*(\d+)\s*[|/]\s*(\d+)\s*\)/si);
    const stamina = staminaMatch ? parseInt(staminaMatch[1]) : 0;
    const maxStamina = staminaMatch ? parseInt(staminaMatch[2]) : 100;
    const staminaReserve = parseInt(settings.stamina_reserve || '5');

    const goldMatch = html.match(/id=["']goldbalance["'][^>]*>([\d,.]+)</i);
    const gold = parseMGNumber(goldMatch ? goldMatch[1] : "0");

    const levelMatch = html.match(/class=["']char_level["'][^>]*>(?:Nivel\s*)?(\d+)/i);
    const level = levelMatch ? parseInt(levelMatch[1]) : 0;

    logDebug(`[SYNC] Initial state: Level ${level}, Gold ${gold}, Stamina ${stamina}/${maxStamina}`);

    // --- STEP 2: AUTOMATION RITUALS ---
    const isWorking = html.includes("estás trabajando") || html.includes("trabajando") || html.includes("at work");
    const onMission = html.includes("misión") || html.includes("Gruta Ancestral") || html.includes("Ancestral Grotto");

    if (!isWorking && !onMission && stamina > staminaReserve) {
      
      // 2.1 Ancestral Grotto (PvE Missions)
      if (settings.auto_grotto) {
        logDebug(`[AUTOMATA] Initiating Ancestral Grotto ritual...`);
        const grottoUrl = `https://${server}/index.php?ac=ahnenstaette`;
        const gPageRes = await fetch(grottoUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
        const gHtml = await gPageRes.text();

        // Find difficulty index (Easy=0, Medium=1, Hard=2)
        const difficulty = settings.mission_difficulty || 'medium';
        const diffMap: Record<string, number> = { 'easy': 0, 'medium': 1, 'hard': 2 };
        const diffIndex = diffMap[difficulty];

        // Perform mission start
        const missionPayload = new URLSearchParams({
          'mision': 'true',
          'schwierigkeit': diffIndex.toString(),
          'go': 'Aceptar'
        });

        const mStartRes = await fetch(grottoUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': getCookieString(), 'User-Agent': userAgent },
          body: missionPayload
        });
        
        if (mStartRes.status === 200) {
          logs.push({ type: 'MISSION', message: `Shadow Ritual: Entered Ancestral Grotto (${difficulty}).`, timestamp: new Date().toISOString() });
          // Refresh status
          statusResponse = await fetch(statusUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
          html = await statusResponse.text();
        }
      }

      // 2.2 Auto-Manhunt (Only if not already on mission)
      const updatedOnMission = html.includes("misión") || html.includes("Gruta Ancestral");
      if (settings.auto_manhunt && !updatedOnMission) {
        logDebug(`[AUTOMATA] Initiating Manhunt ritual...`);
        const duration = settings.manhunt_duration || '60';
        const manhuntUrl = `https://${server}/index.php?ac=raubzug`;
        
        const mPayload = new URLSearchParams({
          duration: duration,
          search: 'Empezar la búsqueda'
        });
        
        const mRes = await fetch(manhuntUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': getCookieString(), 'User-Agent': userAgent },
          body: mPayload
        });
        
        if (mRes.status === 200) {
          logs.push({ type: 'MANHUNT', message: `Shadow Ritual: Manhunt started for ${duration} minutes.`, timestamp: new Date().toISOString() });
          statusResponse = await fetch(statusUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
          html = await statusResponse.text();
        }
      }
    } else if (isWorking || onMission) {
      logDebug(`[AUTOMATA] Ritual already in progress. System idle.`);
    } else {
      logDebug(`[AUTOMATA] Stamina reserve triggered (${stamina} <= ${staminaReserve}). Resting.`);
    }

    // --- STEP 3: FINAL DATA EXTRACTION ---
    const skillAvgMatch = html.match(/id=["']statbarSkillAverage["'][^>]*>.*?(?:Promedio de Habilidad:)?\s*([\d,.]+)/i);
    const skillAverage = parseMGNumber(skillAvgMatch ? skillAvgMatch[1] : "0");

    const expMatch = html.match(/Experiencia.*?\(\s*(\d+)\s*[|/]\s*(\d+)\s*\)/i) || 
                     html.match(/Experiencia:\s*(\d+)\s*[|/]\s*(\d+)/i);
    const experience = expMatch ? parseInt(expMatch[1]) : 0;
    const nextLevelExp = expMatch ? parseInt(expMatch[2]) : 100;

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

    const staminaFinalMatch = html.match(/Energía\s+vital:.*?\(\s*(\d+)\s*[|/]\s*(\d+)\s*\)/si);
    const curStamina = staminaFinalMatch ? parseInt(staminaFinalMatch[1]) : 0;
    const finMaxStamina = staminaFinalMatch ? parseInt(staminaFinalMatch[2]) : 100;

    const race: 'Vampire' | 'Werewolf' = (html.toLowerCase().includes('vampiro') || html.toLowerCase().includes('vampira')) ? 'Vampire' : 'Werewolf';
    
    if (level > 0) {
      logs.push({ type: 'INFO', message: `Realm synchronization complete. Current level: ${level}.`, timestamp: new Date().toISOString() });
    } else {
      logs.push({ type: 'ERROR', message: 'Identity scrolls illegible. Check debug logs.', timestamp: new Date().toISOString() });
    }

    return {
      race,
      stats: {
        level, gold, stamina: curStamina, maxStamina: finMaxStamina, experience, nextLevelExp, skillAverage,
        attributes: { strength: str, defense: def, dexterity: dex, agility: agi, constitution: con }
      },
      logs
    };
  } catch (error: any) {
    return {
      race: 'Vampire',
      stats: { level: 0, gold: 0, stamina: 0, maxStamina: 100, experience: 0, nextLevelExp: 0, skillAverage: 0, attributes: { strength: 0, defense: 0, dexterity: 0, agility: 0, constitution: 0 } },
      logs: [{ type: 'ERROR', message: `Ritual Interrupted: ${error.message}`, timestamp: new Date().toISOString() }]
    };
  }
}

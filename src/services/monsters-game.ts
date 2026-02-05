'use server';
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
 * Normalizes European number formatting (e.g., 66.876,06 -> 66876.06)
 */
function parseMGNumber(str: string | null): number {
  if (!str) return 0;
  // MonstersGame uses . for thousands and , for decimals in ES realm
  const normalized = str.trim()
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
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
  const logs: MonstersGameStats['logs'] = [];
  const logDebug = (msg: string) => {
    if (debug) {
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

    logDebug(`[AUTH] Initiating MoonID authentication ritual for [${username}]...`);
    
    const preAuthResponse = await fetch('https://moonid.net/account/login/', {
      headers: { 'User-Agent': userAgent }
    });
    updateCookies(preAuthResponse.headers.getSetCookie());
    const preAuthHtml = await preAuthResponse.text();
    const csrfMatch = preAuthHtml.match(/name=['"]csrfmiddlewaretoken['"]\s+value=['"]([^'"]+)['"]/i);
    const csrfToken = csrfMatch ? csrfMatch[1] : '';

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
        'Origin': 'https://moonid.net'
      },
      body: loginPayload,
      redirect: 'manual'
    });
    updateCookies(loginResponse.headers.getSetCookie());

    let currentUrl = loginResponse.headers.get('Location');
    while (currentUrl) {
      if (currentUrl.startsWith('/')) currentUrl = 'https://moonid.net' + currentUrl;
      const res = await fetch(currentUrl, {
        headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent },
        redirect: 'manual'
      });
      updateCookies(res.headers.getSetCookie());
      currentUrl = res.headers.get('Location');
    }

    // --- STEP 1: INITIAL SYNC ---
    const statusUrl = `https://${server}/index.php?ac=status`;
    logDebug(`[SYNC] Reading scrolls from ${statusUrl}`);
    let statusResponse = await fetch(statusUrl, {
      headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent }
    });
    let html = await statusResponse.text();

    const staminaMatch = html.match(/Energía\s+vital:.*?\(\s*([\d,.]+)\s*[|/]\s*([\d,.]+)\s*\)/si)
                       || html.match(/Energía\s+vital:\s*([\d,.]+)/i);
    const stamina = parseMGNumber(staminaMatch ? staminaMatch[1] : "0");
    const maxStamina = parseMGNumber(staminaMatch && staminaMatch[2] ? staminaMatch[2] : "780");
    const staminaReserve = parseInt(settings.stamina_reserve || '5');

    const isBusy = html.includes("trabajando") || html.includes("misión") || html.includes("Gruta Ancestral");
    logDebug(`[SYNC] Stamina: ${stamina}/${maxStamina} | Busy: ${isBusy} | Threshold: ${staminaReserve}`);

    // Log stamina conservation if applicable
    if (stamina <= staminaReserve && !isBusy) {
      logs.push({ 
        type: 'INFO', 
        message: `Shadow Ritual: Conserving energy. Current stamina (${stamina}) is below threshold (${staminaReserve}).`, 
        timestamp: new Date().toISOString() 
      });
    }

    // --- STEP 2: AUTOMATION RITUALS ---
    if (!isBusy && stamina > staminaReserve) {
      const huntPageUrl = `https://${server}/index.php?ac=raubzug`;
      logDebug(`[AUTOMATA] Accessing hunting grounds: ${huntPageUrl}`);
      const huntPageRes = await fetch(huntPageUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
      const huntHtml = await huntPageRes.text();

      // --- ADVANCED COOLDOWN DETECTION ---
      // SecondsCOUNTER is populated via JS variables
      const secondsMatch = huntHtml.match(/var\s+SecondsCOUNTER\s*=\s*(\d+);/i);
      const secondsRemaining = secondsMatch ? parseInt(secondsMatch[1]) : 0;
      
      let cooldownDisplay = 'NONE';
      if (secondsRemaining > 0) {
        const h = Math.floor(secondsRemaining / 3600);
        const m = Math.floor((secondsRemaining % 3600) / 60);
        const s = secondsRemaining % 60;
        cooldownDisplay = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      }

      logDebug(`[AUTOMATA] Cooldown scan result: ${cooldownDisplay}`);

      const hasCooldownText = huntHtml.includes("every 15 minutes") || huntHtml.includes("cada 15 minutos");

      if (cooldownDisplay !== 'NONE' || hasCooldownText) {
        const timerMsg = cooldownDisplay !== 'NONE' ? ` (${cooldownDisplay})` : '';
        logs.push({ 
          type: 'INFO', 
          message: `Shadow Ritual: Resting in shadows. PvP cooldown active${timerMsg}.`, 
          timestamp: new Date().toISOString() 
        });
        logDebug(`[AUTOMATA] PvP blocked by cooldown.`);
      } else {
        const humanLimitReached = huntHtml.includes("used all of today's hunting time") || huntHtml.includes("ya has usado todo tu tiempo de caza");
        
        if (humanLimitReached) {
          logDebug(`[AUTOMATA] Manhunt limit reached. Attempting PvP...`);
          if (settings.pvp_attack) {
            const targetName = settings.pvp_target_name;
            const strategy = settings.pvp_search_strategy === 'none' ? '' : (settings.pvp_search_strategy || '');
            
            const pvpSearchPayload = new URLSearchParams({
              ac: 'raubzug',
              sac: 'gegner',
              searchname: targetName || '',
              searchopt: strategy,
            });

            logDebug(`[AUTOMATA] Searching district for [${targetName || 'random rivals'}] with strategy [${strategy}]...`);
            const pvpSearchRes = await fetch(huntPageUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': getCookieString(), 'User-Agent': userAgent },
              body: pvpSearchPayload
            });
            
            const searchHtml = await pvpSearchRes.text();
            
            if (searchHtml.includes("successful") || searchHtml.includes("Exitoso")) {
              const gegnerIdMatch = searchHtml.match(/name=['"]gegnerid['"]\s+value=['"](\d+)['"]/i);
              const opponentNameMatch = searchHtml.match(/tracked down the (?:Hombre Lobo|Vampiro|Adversario|Hombre-Lobo|Hombre\s+Lobo)\s+([^ ]+)\s+and/i)
                                     || searchHtml.match(/<div class=["']headerRow["'][^>]*>(?:Hombre Lobo|Vampiro)\s+(.*?)<\/div>/i);
              const opponentName = opponentNameMatch ? opponentNameMatch[1].trim() : (targetName || "Unknown Rival");

              if (gegnerIdMatch) {
                logDebug(`[AUTOMATA] Opponent found: ${opponentName}. Executing Asalto...`);
                logs.push({ type: 'INFO', message: `Shadow Ritual: Opponent [${opponentName}] located! Initiating combat...`, timestamp: new Date().toISOString() });
                
                const attackPayload = new URLSearchParams({ ac: 'raubzug', sac: 'attack', gegnerid: gegnerIdMatch[1] });
                const battleRes = await fetch(huntPageUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': getCookieString(), 'User-Agent': userAgent },
                  body: attackPayload
                });
                
                const battleHtml = await battleRes.text();
                const winnerMatch = battleHtml.match(/class=["']headerRowCWinner["'][^>]*>(?:Vencedor\/a:\s*)?(.*?)<\/div>/i)
                                  || battleHtml.match(/Vencedor\/a:\s*([^<]+)/i);
                const lootMatch = battleHtml.match(/Ha conseguido ([\d,.]+) <img[^>]+alt=["']Oro["']/i);
                const expMatch = battleHtml.match(/sumados (\d+) punto\(s\) de experiencia/i);

                if (winnerMatch) {
                  const winnerName = winnerMatch[1].trim();
                  const isWinner = winnerName === username || winnerName.includes(username);
                  const loot = lootMatch ? lootMatch[1] : '0';
                  const exp = expMatch ? expMatch[1] : '0';
                  
                  logs.push({ 
                    type: 'BATTLE', 
                    message: `Shadow Ritual: ${isWinner ? 'VICTORY' : 'DEFEAT'} against [${opponentName}]. Spoils: ${loot} gold, +${exp} XP.`, 
                    timestamp: new Date().toISOString() 
                  });
                }
              }
            } else if (searchHtml.includes("in vain") || searchHtml.includes("en vano")) {
              logDebug(`[AUTOMATA] PvP search failed: IN_VAIN.`);
              logs.push({ type: 'INFO', message: `Shadow Ritual: Scanned the district for rivals in vain.`, timestamp: new Date().toISOString() });
            }
          }
        } else if (settings.auto_manhunt) {
          const duration = settings.manhunt_duration || '60';
          logDebug(`[AUTOMATA] Initiating Manhunt for ${duration}m...`);
          const mPayload = new URLSearchParams({ ac: 'raubzug', sac: 'vampir', duration: duration, search: 'Empezar la búsqueda' });
          await fetch(huntPageUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': getCookieString(), 'User-Agent': userAgent },
            body: mPayload
          });
          logs.push({ type: 'MANHUNT', message: `Shadow Ritual: Manhunt started for ${duration} minutes.`, timestamp: new Date().toISOString() });
        }
      }

      // Grotto Fallback
      if (settings.auto_grotto && !logs.some(l => l.type === 'MANHUNT' || l.type === 'BATTLE' || l.type === 'INFO' && l.message.includes('Resting'))) {
        const grottoUrl = `https://${server}/index.php?ac=ahnenstaette`;
        const gCheck = await fetch(grottoUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
        const gHtml = await gCheck.text();

        if (!gHtml.includes("ya estás") && !gHtml.includes("misión")) {
          logDebug(`[AUTOMATA] Entering Ancestral Grotto...`);
          const diffMap = { 'easy': '0', 'medium': '1', 'hard': '2' };
          const diffVal = (diffMap as any)[settings.mission_difficulty || 'medium'] || '1';
          const gPayload = new URLSearchParams({ 'mision': 'true', 'schwierigkeit': diffVal, 'go': 'Aceptar' });
          await fetch(grottoUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': getCookieString(), 'User-Agent': userAgent },
            body: gPayload
          });
          logs.push({ type: 'MISSION', message: `Shadow Ritual: Entering Grotto on ${settings.mission_difficulty || 'medium'} difficulty.`, timestamp: new Date().toISOString() });
        }
      }

      statusResponse = await fetch(statusUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
      html = await statusResponse.text();
    }

    // --- STEP 3: FINAL EXTRACTION ---
    const levelMatch = html.match(/class=["']char_level["'][^>]*>(?:Nivel\s*)?(\d+)/i);
    const goldMatch = html.match(/id=["']goldbalance["'][^>]*>([\d,.]+)</i);
    const skillMatch = html.match(/id=["']statbarSkillAverage["'][^>]*>(?:.*?):\s*([\d,.]+)/i);
    const xpMatch = html.match(/Experiencia(?:.*?):\s*.*?\(?\s*([\d,.]+)\s*[|/]\s*([\d,.]+)\)?/si);

    const findStat = (label: string) => {
      const regex = new RegExp(`${label}:.*?\\(\\s*(\\d+)\\s*\\)`, 'si');
      return parseInt(html.match(regex)?.[1] || "0");
    };

    const stats = {
      level: parseInt(levelMatch?.[1] || "0"),
      gold: parseMGNumber(goldMatch?.[1] || "0"),
      stamina: stamina,
      maxStamina: maxStamina,
      experience: parseMGNumber(xpMatch?.[1] || "0"),
      nextLevelExp: parseMGNumber(xpMatch?.[2] || "100"),
      skillAverage: parseMGNumber(skillMatch?.[1] || "0"),
      attributes: {
        strength: findStat('Fuerza'),
        defense: findStat('Defensa'),
        dexterity: findStat('Destreza'),
        agility: findStat('Agilidad'),
        constitution: findStat('Resistencia')
      }
    };

    logDebug(`[SYNC] Final Stats Sync OK.`);

    return { 
      race: (html.toLowerCase().includes('vampiro') || html.toLowerCase().includes('vampira')) ? 'Vampire' : 'Werewolf', 
      stats, 
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

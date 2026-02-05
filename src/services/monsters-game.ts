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
        'Origin': 'https://moonid.net'
      },
      body: loginPayload,
      redirect: 'manual'
    });
    updateCookies(loginResponse.headers.getSetCookie());

    // 3. Handle Redirect Chain (MoonID -> API -> Game Server)
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
    let statusResponse = await fetch(statusUrl, {
      headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent }
    });
    let html = await statusResponse.text();

    // Basic State Detection
    const staminaMatch = html.match(/Energía\s+vital:.*?\(\s*([\d,.]+)\s*[|/]\s*([\d,.]+)\s*\)/si)
                       || html.match(/Energía\s+vital:\s*([\d,.]+)/i);
    const stamina = parseMGNumber(staminaMatch ? staminaMatch[1] : "0");
    const maxStamina = parseMGNumber(staminaMatch && staminaMatch[2] ? staminaMatch[2] : "780");
    const staminaReserve = parseInt(settings.stamina_reserve || '5');

    const isBusy = html.includes("trabajando") || html.includes("misión") || html.includes("Gruta Ancestral");

    logDebug(`[SYNC] Initial state: Stamina ${stamina}/${maxStamina}, Busy: ${isBusy}`);

    // --- STEP 2: AUTOMATION RITUALS ---
    if (!isBusy && stamina > staminaReserve) {
      
      // 2.1 Hunting Logic (Manhunt vs PvP Cooldowns)
      const huntPageUrl = `https://${server}/index.php?ac=raubzug`;
      const huntPageRes = await fetch(huntPageUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
      const huntHtml = await huntPageRes.text();

      const humanHuntExhausted = huntHtml.includes("already used all of today's hunting time") || huntHtml.includes("ya has usado todo tu tiempo de caza");
      
      // Detect PvP 15m Cooldown
      const pvpCooldownMatch = huntHtml.match(/Puedes volver a luchar en aproximadamente (\d+) minutos/i) 
                            || huntHtml.match(/Puedes volver a atacar en (\d+) minutos/i);

      if (humanHuntExhausted) {
        logDebug(`[AUTOMATA] Human hunt limit reached.`);
        
        if (settings.pvp_attack) {
          if (pvpCooldownMatch) {
            logDebug(`[AUTOMATA] PvP is on cooldown: ${pvpCooldownMatch[1]} minutes remaining.`);
            logs.push({ type: 'INFO', message: `Shadow Ritual: PvP cooldown active (${pvpCooldownMatch[1]}m remaining).`, timestamp: new Date().toISOString() });
          } else {
            logDebug(`[AUTOMATA] Initiating random district hunt...`);
            const pvpSearchPayload = new URLSearchParams({
              ac: 'raubzug',
              sac: 'gegner',
              searchopt: '', // Normal search
            });
            const pvpSearchRes = await fetch(huntPageUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': getCookieString(), 'User-Agent': userAgent },
              body: pvpSearchPayload
            });
            
            if (pvpSearchRes.status === 200) {
              const huntResultHtml = await pvpSearchRes.text();
              
              if (huntResultHtml.includes("successful") || huntResultHtml.includes("Exitoso")) {
                // Successful search - Extract gegnerid and ATTACK
                const gegnerIdMatch = huntResultHtml.match(/name=['"]gegnerid['"]\s+value=['"](\d+)['"]/i);
                if (gegnerIdMatch) {
                  logDebug(`[AUTOMATA] Target found! GegnerID: ${gegnerIdMatch[1]}. Launching asalto...`);
                  const attackPayload = new URLSearchParams({
                    ac: 'raubzug',
                    sac: 'attack',
                    gegnerid: gegnerIdMatch[1]
                  });
                  await fetch(huntPageUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': getCookieString(), 'User-Agent': userAgent },
                    body: attackPayload
                  });
                  logs.push({ type: 'BATTLE', message: `Shadow Ritual: Successful hunt. Asalto launched against target ID ${gegnerIdMatch[1]}.`, timestamp: new Date().toISOString() });
                }
              } else if (huntResultHtml.includes("scanned the area") || huntResultHtml.includes("in vain") || huntResultHtml.includes("Adversario in vain")) {
                logs.push({ type: 'INFO', message: 'Shadow Ritual: Scanned for Werewolves in vain.', timestamp: new Date().toISOString() });
              }
            }
          }
        }
      } else if (settings.auto_manhunt) {
        logDebug(`[AUTOMATA] Initiating Manhunt...`);
        const duration = settings.manhunt_duration || '60';
        const mPayload = new URLSearchParams({
          ac: 'raubzug',
          sac: 'vampir',
          duration: duration,
          search: 'Empezar la búsqueda'
        });
        const mRes = await fetch(huntPageUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': getCookieString(), 'User-Agent': userAgent },
          body: mPayload
        });
        if (mRes.status === 200) {
          logs.push({ type: 'MANHUNT', message: `Shadow Ritual: Manhunt started (${duration} min).`, timestamp: new Date().toISOString() });
        }
      }

      // 2.2 Grotto Fallback if no hunt started
      if (settings.auto_grotto && !logs.some(l => l.type === 'MANHUNT' || l.type === 'BATTLE')) {
        logDebug(`[AUTOMATA] Checking Ancestral Grotto...`);
        const grottoUrl = `https://${server}/index.php?ac=ahnenstaette`;
        const grottoCheck = await fetch(grottoUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
        const grottoHtml = await grottoCheck.text();

        if (!grottoHtml.includes("ya estás") && !grottoHtml.includes("misión")) {
          logDebug(`[AUTOMATA] Entering Grotto...`);
          const diffIndex = { 'easy': '0', 'medium': '1', 'hard': '2' }[settings.mission_difficulty || 'medium'] || '1';
          const gPayload = new URLSearchParams({ 'mision': 'true', 'schwierigkeit': diffIndex, 'go': 'Aceptar' });
          await fetch(grottoUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': getCookieString(), 'User-Agent': userAgent },
            body: gPayload
          });
          logs.push({ type: 'MISSION', message: `Shadow Ritual: Entered Ancestral Grotto.`, timestamp: new Date().toISOString() });
        }
      }

      // Refresh final status
      statusResponse = await fetch(statusUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
      html = await statusResponse.text();
    }

    // --- STEP 3: FINAL EXTRACTION ---
    // Extract Level - Handles both "Nivel 17" and pure numbers
    const levelMatch = html.match(/class=["']char_level["'][^>]*>(?:Nivel\s*)?(\d+)/i);
    
    // Extract Gold
    const goldMatch = html.match(/id=["']goldbalance["'][^>]*>([\d,.]+)</i);
    
    // Extract Skill Average (Promedio de Habilidad)
    const skillAvgMatch = html.match(/id=["']statbarSkillAverage["'][^>]*>.*?([\d,.]+)/i);
    
    // Extract Experience (Current / Next) - Handles (1411|1445) and 1411 / 1445
    const expMatch = html.match(/Experiencia(?:.*?):\s*.*?\(?\s*([\d,.]+)\s*[|/]\s*([\d,.]+)\)?/si) 
                  || html.match(/Experiencia:?\s*([\d,.]+)\s*[|/]\s*([\d,.]+)/i);

    const race: 'Vampire' | 'Werewolf' = (html.toLowerCase().includes('vampiro') || html.toLowerCase().includes('vampira')) ? 'Vampire' : 'Werewolf';

    const findStat = (label: string) => {
      const regex = new RegExp(`${label}:.*?\\(\\s*(\\d+)\\s*\\)`, 'si');
      return parseInt(html.match(regex)?.[1] || "0");
    };

    const stats = {
      level: parseInt(levelMatch?.[1] || "0"),
      gold: parseMGNumber(goldMatch?.[1] || "0"),
      stamina: stamina,
      maxStamina: maxStamina,
      experience: parseMGNumber(expMatch?.[1] || "0"),
      nextLevelExp: parseMGNumber(expMatch?.[2] || "100"),
      skillAverage: parseMGNumber(skillAvgMatch?.[1] || "0"),
      attributes: {
        strength: findStat('Fuerza'),
        defense: findStat('Defensa'),
        dexterity: findStat('Destreza'),
        agility: findStat('Agilidad'),
        constitution: findStat('Resistencia')
      }
    };

    if (stats.level > 0) {
      logs.push({ type: 'INFO', message: `Realm synchronization complete. Level ${stats.level}.`, timestamp: new Date().toISOString() });
    }

    return { race, stats, logs };

  } catch (error: any) {
    return {
      race: 'Vampire',
      stats: { level: 0, gold: 0, stamina: 0, maxStamina: 100, experience: 0, nextLevelExp: 0, skillAverage: 0, attributes: { strength: 0, defense: 0, dexterity: 0, agility: 0, constitution: 0 } },
      logs: [{ type: 'ERROR', message: `Ritual Interrupted: ${error.message}`, timestamp: new Date().toISOString() }]
    };
  }
}

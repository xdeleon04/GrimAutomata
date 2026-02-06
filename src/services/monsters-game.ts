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
  pvpCooldown: number; // Seconds remaining for any active cooldown (PvP, Work, or Manhunt)
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
  const normalized = str.trim()
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(normalized) || 0;
}

/**
 * Formats seconds into a human-readable duration string (Xh Ym Zs).
 */
function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || (h === 0 && m === 0)) parts.push(`${s}s`);
  
  return parts.join(' ');
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
  let pvpCooldown = 0;

  const logDebug = (msg: string) => {
    if (debug) {
      logs.push({ type: 'DEBUG', message: msg, timestamp: new Date().toISOString() });
    }
  };

  const POTIONS = [
    { id: 8, cost: 891, name: 'Esencia de fortaleza (1000)' },
    { id: 7, cost: 445, name: 'Esencia de fortaleza (500)' },
    { id: 2, cost: 89, name: 'Esencia de fortaleza (100)' },
    { id: 1, cost: 49, name: 'Esencia de fortaleza (50)' },
  ];

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
    let statusResponse = await fetch(statusUrl, {
      headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent }
    });
    let html = await statusResponse.text();

    const staminaMatch = html.match(/Energía\s+vital:.*?\(\s*([\d,.]+)\s*[|/]\s*([\d,.]+)\s*\)/si)
                       || html.match(/Energía\s+vital:\s*([\d,.]+)/i);
    const stamina = parseMGNumber(staminaMatch ? staminaMatch[1] : "0");
    const maxStamina = parseMGNumber(staminaMatch && staminaMatch[2] ? staminaMatch[2] : "800");
    
    const staminaReservePercent = parseInt(settings.stamina_reserve || '10');
    const thresholdValue = (staminaReservePercent / 100) * maxStamina;
    
    const race = (html.toLowerCase().includes('vampiro') || html.toLowerCase().includes('vampira')) ? 'Vampire' : 'Werewolf';

    const goldMatch = html.match(/id=["']goldbalance["'][^>]*>([\d,.]+)</i);
    const currentGold = parseMGNumber(goldMatch?.[1] || "0");

    const secondsMatchStatus = html.match(/var\s+SecondsCOUNTER\s*=\s*(\d+);/i);
    pvpCooldown = secondsMatchStatus ? parseInt(secondsMatchStatus[1]) : 0;
    
    // Improved busy state detection via status page content
    const busyMessageBox = html.match(/class=["']pageContentC["'][^>]*>(.*?)<\/div>/si);
    const busyMsgText = busyMessageBox ? busyMessageBox[1].toLowerCase() : "";
    
    // Check specific task keywords in Spanish and English
    const isWorking = busyMsgText.includes("trabajando") || busyMsgText.includes("work") || busyMsgText.includes("friedhof") || busyMsgText.includes("cementerio");
    const isInMission = busyMsgText.includes("misión") || busyMsgText.includes("mision") || busyMsgText.includes("mission") || busyMsgText.includes("grotto") || busyMsgText.includes("ahnenstaette");
    const isManhunting = busyMsgText.includes("raid") || busyMsgText.includes("caza") || busyMsgText.includes("humanos") || busyMsgText.includes("raubzug");
    const isBusy = isWorking || isInMission || isManhunting || pvpCooldown > 0;

    if (isBusy) {
      const timeLeft = formatDuration(pvpCooldown);
      let busyMsg = `Shadow Vigil: Character is currently resting. PvP Cooldown: ${timeLeft}.`;
      
      if (isWorking) {
        busyMsg = `Shadow Vigil: Character is currently working at the graveyard. Shift ends in ${timeLeft}.`;
      } else if (isInMission) {
        busyMsg = `Shadow Vigil: Character is currently on a mission in the Ancestral Grotto. Ends in ${timeLeft}.`;
      } else if (isManhunting) {
        busyMsg = `Shadow Vigil: Character is currently hunting humans. Hunt ends in ${timeLeft}.`;
      }

      logs.push({ 
        type: 'INFO', 
        message: busyMsg, 
        timestamp: new Date().toISOString() 
      });
    }

    // --- STEP 2: AUTOMATION RITUALS (ALCHEMY & WORK) ---
    if (!isBusy) {
      // Alchemy Ritual: Auto-Use/Buy Consumables
      if (stamina <= thresholdValue && settings.auto_alchemy) {
        const budget = parseInt(settings.potion_budget || '445');
        logDebug(`[ALCHEMY] Stamina low (${stamina.toFixed(0)}). Budget: ${budget}. Gold: ${currentGold}.`);
        
        // Find best potion in inventory or to buy
        const targetPotion = POTIONS.find(p => p.cost <= budget && p.cost <= currentGold) || POTIONS[POTIONS.length - 1];
        
        // Check inventory for any usable potion (prioritizing stronger ones)
        const potionInInventory = POTIONS.find(p => html.includes(`useitem=${p.id}`));
        
        if (potionInInventory) {
          logDebug(`[ALCHEMY] Elixir ${potionInInventory.name} found in inventory. Invoking restoration...`);
          const useUrl = `https://${server}/index.php?ac=status&useitem=${potionInInventory.id}`;
          await fetch(useUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
          logs.push({ type: 'LOOT', message: `Shadow Alchemy: Used ${potionInInventory.name} to restore vitality.`, timestamp: new Date().toISOString() });
          
          // Re-sync status
          statusResponse = await fetch(statusUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
          html = await statusResponse.text();
        } else if (currentGold >= targetPotion.cost) {
          logDebug(`[ALCHEMY] Purchasing ${targetPotion.name} (Cost: ${targetPotion.cost})...`);
          
          // ES1 Merchant Form Data
          const buyPayload = new URLSearchParams({
            ac: 'stadt',
            prod_group: '4',
            item_id: targetPotion.id.toString(),
            cur_price: targetPotion.cost.toString(),
            bonus_gold: '',
            server_amount: targetPotion.cost.toString(),
            portal_amount: '0',
            action: 'buy',
            currency: 'gold',
            upgrade_level: '0',
            num_items: '1',
            x: '172',
            y: '30'
          });

          const traderUrl = `https://${server}/index.php?ac=stadt&sac=warenhaendler&waren=items&prod_group=4`;
          await fetch(traderUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/x-www-form-urlencoded', 
              'Cookie': getCookieString(), 
              'User-Agent': userAgent,
              'Referer': traderUrl
            },
            body: buyPayload
          });
          
          // Use it immediately
          const useUrl = `https://${server}/index.php?ac=status&useitem=${targetPotion.id}`;
          await fetch(useUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
          
          logs.push({ type: 'LOOT', message: `Shadow Alchemy: Purchased and used ${targetPotion.name} from the merchant.`, timestamp: new Date().toISOString() });
          
          // Re-sync status
          statusResponse = await fetch(statusUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
          html = await statusResponse.text();
        }
      }

      // Re-calculate stamina after potential potion use
      const finalStaminaMatch = html.match(/Energía\s+vital:.*?\(\s*([\d,.]+)\s*[|/]\s*([\d,.]+)\s*\)/si);
      const currentStamina = parseMGNumber(finalStaminaMatch ? finalStaminaMatch[1] : stamina.toString());

      if (currentStamina <= thresholdValue) {
        if (settings.auto_work !== false) {
          // Rule: 10 stamina per hour
          const pointsNeeded = Math.max(0, thresholdValue - currentStamina + 10); 
          const hoursToWork = Math.min(12, Math.max(1, Math.ceil(pointsNeeded / 10))); 
          
          const workUrl = `https://${server}/index.php?ac=friedhof`;
          logDebug(`[AUTOMATA] Energy still low (${currentStamina.toFixed(0)}). Initiating graveyard shift for ${hoursToWork}h.`);
          
          const workPayload = new URLSearchParams({
            ac: 'friedhof',
            sac: 'startjob',
            arbeitszeit: hoursToWork.toString()
          });

          const workRes = await fetch(workUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/x-www-form-urlencoded', 
              'Cookie': getCookieString(), 
              'User-Agent': userAgent,
              'Referer': workUrl
            },
            body: workPayload
          });

          const workHtml = await workRes.text();
          const secondsMatchWork = workHtml.match(/var\s+SecondsCOUNTER\s*=\s*(\d+);/i);
          pvpCooldown = secondsMatchWork ? parseInt(secondsMatchWork[1]) : hoursToWork * 3600;

          logs.push({ 
            type: 'INFO', 
            message: `Shadow Ritual: Energy low (${currentStamina.toFixed(0)}). Graveyard shift started for ${hoursToWork}h. Cooldown: ${formatDuration(pvpCooldown)}.`, 
            timestamp: new Date().toISOString() 
          });
        }
      } else {
        // --- STEP 3: COMBAT RITUALS ---
        const huntPageUrl = `https://${server}/index.php?ac=raubzug`;
        const huntPageRes = await fetch(huntPageUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
        const huntHtml = await huntPageRes.text();

        const secondsMatch = huntHtml.match(/var\s+SecondsCOUNTER\s*=\s*(\d+);/i);
        pvpCooldown = secondsMatch ? parseInt(secondsMatch[1]) : 0;
        
        if (pvpCooldown === 0) {
          const humanLimitReached = huntHtml.includes("used all of today's hunting time") || huntHtml.includes("ya has usado todo tu tiempo de caza");
          
          if (humanLimitReached) {
            if (settings.pvp_attack) {
              const targetName = settings.pvp_target_name;
              const strategyValue = settings.pvp_search_strategy === 'none' ? '' : (settings.pvp_search_strategy || '');
              
              const pvpSearchPayload = new URLSearchParams({
                ac: 'raubzug',
                sac: 'gegner',
                searchname: targetName || '',
                searchopt: strategyValue,
              });

              const pvpSearchRes = await fetch(huntPageUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': getCookieString(), 'User-Agent': userAgent },
                body: pvpSearchPayload
              });
              
              const searchHtml = await pvpSearchRes.text();
              const gegnerIdMatch = searchHtml.match(/name=['"]gegnerid['"]\s+value=['"](\d+)['"]/i);

              if (gegnerIdMatch) {
                const attackPayload = new URLSearchParams({ ac: 'raubzug', sac: 'attack', gegnerid: gegnerIdMatch[1] });
                const battleRes = await fetch(huntPageUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': getCookieString(), 'User-Agent': userAgent },
                  body: attackPayload
                });
                
                const battleHtml = await battleRes.text();
                const winnerMatch = battleHtml.match(/class=["']headerRowCWinner["'][^>]*>(?:Vencedor\/a:\s*)?(.*?)<\/div>/i);
                const lootMatch = battleHtml.match(/Ha conseguido ([\d,.]+) <img[^>]+alt=["']Oro["']/i);
                const expMatch = battleHtml.match(/sumados (\d+) punto\(s\) de experiencia/i);
                const secondsMatchBattle = battleHtml.match(/var\s+SecondsCOUNTER\s*=\s*(\d+);/i);
                pvpCooldown = secondsMatchBattle ? parseInt(secondsMatchBattle[1]) : 900;

                if (winnerMatch) {
                  const winnerName = winnerMatch[1].trim();
                  const isWinner = winnerName === username || winnerName.includes(username);
                  const loot = lootMatch ? lootMatch[1] : '0';
                  const exp = expMatch ? expMatch[1] : '0';
                  
                  logs.push({ 
                    type: 'BATTLE', 
                    message: `Shadow Ritual: PvP ${isWinner ? 'VICTORY' : 'DEFEAT'}. Loot: ${loot} gold, +${exp} XP. Cooldown: ${formatDuration(pvpCooldown)}.`, 
                    timestamp: new Date().toISOString() 
                  });
                }
              }
            }
          } else if (settings.auto_manhunt) {
            const durationMinutes = parseInt(settings.manhunt_duration || '60');
            const jagdzeitSeconds = durationMinutes * 60;
            // Correct ES1 payload for Manhunt
            const mPayload = new URLSearchParams({ 
              ac: 'raubzug', 
              sac: race === 'Vampire' ? 'vampir' : 'wolf', 
              jagdzeit: jagdzeitSeconds.toString(), 
              x: '194', 
              y: '45' 
            });
            
            const mRes = await fetch(huntPageUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': getCookieString(), 'User-Agent': userAgent, 'Referer': huntPageUrl },
              body: mPayload
            });
            const mHtml = await mRes.text();
            const secondsMatchM = mHtml.match(/var\s+SecondsCOUNTER\s*=\s*(\d+);/i);
            pvpCooldown = secondsMatchM ? parseInt(secondsMatchM[1]) : jagdzeitSeconds;
            
            logs.push({ 
              type: 'MANHUNT', 
              message: `Shadow Ritual: Manhunt started for ${durationMinutes}m. Cooldown: ${formatDuration(pvpCooldown)}.`, 
              timestamp: new Date().toISOString() 
            });
          }
        }

        if (settings.auto_grotto && pvpCooldown === 0) {
          const grottoUrl = `https://${server}/index.php?ac=ahnenstaette`;
          const gCheck = await fetch(grottoUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
          const gHtml = await gCheck.text();

          if (!gHtml.includes("ya estás") && !gHtml.includes("misión")) {
            const diffMap = { 'easy': '0', 'medium': '1', 'hard': '2' };
            const diffVal = (diffMap as any)[settings.mission_difficulty || 'medium'] || '1';
            const gPayload = new URLSearchParams({ 'mision': 'true', 'schwierigkeit': diffVal, 'go': 'Aceptar' });
            const gRes = await fetch(grottoUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': getCookieString(), 'User-Agent': userAgent },
              body: gPayload
            });
            const gResHtml = await gRes.text();
            const gSecondsMatch = gResHtml.match(/var\s+SecondsCOUNTER\s*=\s*(\d+);/i);
            pvpCooldown = gSecondsMatch ? parseInt(gSecondsMatch[1]) : 600;

            logs.push({ type: 'MISSION', message: `Shadow Ritual: Entering Ancestral Grotto (${settings.mission_difficulty || 'medium'}). Cooldown: ${formatDuration(pvpCooldown)}.`, timestamp: new Date().toISOString() });
          }
        }
      }

      statusResponse = await fetch(statusUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
      html = await statusResponse.text();
    }

    const levelMatch = html.match(/class=["']char_level["'][^>]*>(?:Nivel\s*)?(\d+)/i);
    const goldSyncMatch = html.match(/id=["']goldbalance["'][^>]*>([\d,.]+)</i);
    const skillMatch = html.match(/id=["']statbarSkillAverage["'][^>]*>(?:.*?):\s*([\d,.]+)/i);
    const xpMatch = html.match(/Experiencia(?:.*?):\s*.*?\(?\s*([\d,.]+)\s*[|/]\s*([\d,.]+)\)?/si);

    const findStat = (label: string) => {
      const regex = new RegExp(`${label}:.*?\\(\\s*(\\d+)\\s*\\)`, 'si');
      return parseInt(html.match(regex)?.[1] || "0");
    };

    return { 
      race, 
      stats: {
        level: parseInt(levelMatch?.[1] || "0"),
        gold: parseMGNumber(goldSyncMatch?.[1] || "0"),
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
      }, 
      logs,
      pvpCooldown
    };

  } catch (error: any) {
    return {
      race: 'Vampire',
      pvpCooldown: 0,
      stats: { level: 0, gold: 0, stamina: 0, maxStamina: 100, experience: 0, nextLevelExp: 0, skillAverage: 0, attributes: { strength: 0, defense: 0, dexterity: 0, agility: 0, constitution: 0 } },
      logs: [{ type: 'ERROR', message: `Ritual Error: ${error.message}`, timestamp: new Date().toISOString() }]
    };
  }
}

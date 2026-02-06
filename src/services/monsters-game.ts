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

  const TRAINING_MAP: Record<string, { type: string, label: string }> = {
    'train_strength': { type: 'staerke', label: 'Fuerza' },
    'train_defense': { type: 'verteidigung', label: 'Defensa' },
    'train_agility': { type: 'gewandtheit', label: 'Agilidad' },
    'train_constitution': { type: 'ausdauer', label: 'Resistencia' },
    'train_dexterity': { type: 'charisma', label: 'Destreza' }
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
    let currentGold = parseMGNumber(goldMatch?.[1] || "0");

    const secondsMatchStatus = html.match(/var\s+SecondsCOUNTER\s*=\s*(\d+);/i);
    pvpCooldown = secondsMatchStatus ? parseInt(secondsMatchStatus[1]) : 0;
    
    const busyMsgBox = html.match(/class=["']pageContentC["'][^>]*>(.*?)<\/div>/si);
    const busyText = busyMsgBox ? busyMsgBox[1].toLowerCase() : "";
    
    if (pvpCooldown > 0) {
      const timeLeft = formatDuration(pvpCooldown);
      let busyMsg = `Shadow Vigil: Character is currently resting. Cooldown: ${timeLeft}.`;
      
      if (busyText.includes("trabajando") || busyText.includes("cementerio") || busyText.includes("friedhof")) {
        busyMsg = `Shadow Vigil: Character is currently working at the graveyard. Shift ends in ${timeLeft}.`;
      } else if (busyText.includes("misión") || busyText.includes("mision") || busyText.includes("grotto") || busyText.includes("ahnenstaette")) {
        busyMsg = `Shadow Vigil: Character is currently on a mission in the Ancestral Grotto. Ends in ${timeLeft}.`;
      } else if (busyText.includes("raid") || busyText.includes("caza") || busyText.includes("raubzug")) {
        busyMsg = `Shadow Vigil: Character is currently hunting humans. Hunt ends in ${timeLeft}.`;
      }

      logs.push({ type: 'INFO', message: busyMsg, timestamp: new Date().toISOString() });
    }

    // --- STEP 2: AUTOMATION RITUALS (ALCHEMY & WORK) ---
    if (pvpCooldown <= 0) {
      if (stamina <= thresholdValue && settings.auto_alchemy) {
        const budget = parseInt(settings.potion_budget || '445');
        const targetPotion = POTIONS.find(p => p.cost <= budget && p.cost <= currentGold) || POTIONS[POTIONS.length - 1];
        
        const potionInInventory = POTIONS.find(p => html.includes(`useitem=${p.id}`));
        
        if (potionInInventory) {
          const useUrl = `https://${server}/index.php?ac=status&useitem=${potionInInventory.id}`;
          await fetch(useUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
          logs.push({ type: 'LOOT', message: `Shadow Alchemy: Used ${potionInInventory.name} from inventory.`, timestamp: new Date().toISOString() });
          statusResponse = await fetch(statusUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
          html = await statusResponse.text();
        } else if (currentGold >= targetPotion.cost) {
          const buyPayload = new URLSearchParams({
            ac: 'stadt',
            prod_group: '4',
            item_id: targetPotion.id.toString(),
            num_items: '0',
            cur_price: targetPotion.cost.toString(),
            bonus_gold: '',
            server_amount: targetPotion.cost.toString(),
            portal_amount: '0',
            action: 'buy',
            currency: 'gold',
            upgrade_level: '0',
            num_items_buy: '1',
            x: '172',
            y: '30'
          });
          
          const traderUrl = `https://${server}/index.php?ac=stadt&sac=warenhaendler&action=buy&item_id=${targetPotion.id}&prod_group=4&currency=gold&sc=`;
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
          
          const useUrl = `https://${server}/index.php?ac=status&useitem=${targetPotion.id}`;
          await fetch(useUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
          logs.push({ type: 'LOOT', message: `Shadow Alchemy: Purchased and used ${targetPotion.name}.`, timestamp: new Date().toISOString() });
          statusResponse = await fetch(statusUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
          html = await statusResponse.text();
        }
      }

      const finalStaminaMatch = html.match(/Energía\s+vital:.*?\(\s*([\d,.]+)\s*[|/]\s*([\d,.]+)\s*\)/si);
      const currentStamina = parseMGNumber(finalStaminaMatch ? finalStaminaMatch[1] : stamina.toString());

      if (currentStamina <= thresholdValue && settings.auto_work !== false) {
        const pointsNeeded = Math.max(0, thresholdValue - currentStamina + 10); 
        const hoursToWork = Math.min(12, Math.max(1, Math.ceil(pointsNeeded / 10))); 
        const workPayload = new URLSearchParams({ ac: 'friedhof', sac: 'startjob', arbeitszeit: hoursToWork.toString() });
        const workRes = await fetch(`https://${server}/index.php?ac=friedhof`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': getCookieString(), 'User-Agent': userAgent },
          body: workPayload
        });
        const workHtml = await workRes.text();
        const secondsMatchWork = workHtml.match(/var\s+SecondsCOUNTER\s*=\s*(\d+);/i);
        pvpCooldown = secondsMatchWork ? parseInt(secondsMatchWork[1]) : hoursToWork * 3600;
        logs.push({ type: 'INFO', message: `Shadow Ritual: Graveyard shift started for ${hoursToWork}h.`, timestamp: new Date().toISOString() });
      } else {
        // --- STEP 3: COMBAT RITUALS (MANHUNT & PVP) ---
        const huntPageUrl = `https://${server}/index.php?ac=raubzug`;
        const huntPageRes = await fetch(huntPageUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
        const huntHtml = await huntPageRes.text();
        pvpCooldown = parseInt(huntHtml.match(/var\s+SecondsCOUNTER\s*=\s*(\d+);/i)?.[1] || "0");
        
        // Parse Manhunt Results
        if (huntHtml.includes("Resultado de la caza") || huntHtml.includes("Resultado")) {
          const bloodMatch = huntHtml.match(/(\d+)\s+litros\s+de\s+sangre/i);
          const huntGoldMatch = huntHtml.match(/([\d,.]+)\s+<img[^>]+alt=["']Oro["']/i);
          const huntExpMatch = huntHtml.match(/(\d+)\s+(?:experience\s+points|puntos\s+de\s+experiencia|experiencia)/i);
          
          if (bloodMatch || huntGoldMatch || huntExpMatch) {
            const blood = bloodMatch ? bloodMatch[1] : '0';
            const gold = parseMGNumber(huntGoldMatch ? huntGoldMatch[1] : '0');
            const exp = huntExpMatch ? huntExpMatch[1] : '0';
            logs.push({ 
              type: 'MANHUNT', 
              message: `Manhunt Harvest: Collected ${blood} liters of blood, ${gold.toFixed(2)} gold, and ${exp} XP.`, 
              timestamp: new Date().toISOString() 
            });
          } else if (huntHtml.includes("nothing to be found") || huntHtml.includes("nada que encontrar")) {
            logs.push({ type: 'MANHUNT', message: "Manhunt result: Nothing to be found in the shadows.", timestamp: new Date().toISOString() });
          }
        }

        if (pvpCooldown <= 0) {
          const humanLimitReached = huntHtml.includes("used all of today's hunting time") || huntHtml.includes("ya has usado todo tu tiempo de caza");
          if (humanLimitReached && settings.pvp_attack) {
            const pvpSearchPayload = new URLSearchParams({ ac: 'raubzug', sac: 'gegner', searchname: settings.pvp_target_name || '', searchopt: settings.pvp_search_strategy === 'none' ? '' : (settings.pvp_search_strategy || '') });
            const pvpSearchRes = await fetch(huntPageUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': getCookieString(), 'User-Agent': userAgent }, body: pvpSearchPayload });
            const searchHtml = await pvpSearchRes.text();
            
            const gegnerIdMatch = searchHtml.match(/name=['"]gegnerid['"]\s+value=['"](\d+)['"]/i);
            const rivalNameMatch = searchHtml.match(/<h3>(?:versus|contra|contra\s+)\s*([^<]+)<\/h3>/i) 
                                || searchHtml.match(/gegnerid=\d+[^>]*>([^<]+)<\/a>/i)
                                || searchHtml.match(/sac=info&amp;id=\d+[^>]*>([^<]+)<\/a>/i);
            const rivalName = rivalNameMatch ? rivalNameMatch[1].trim() : 'Unknown Rival';

            if (gegnerIdMatch) {
              const battleRes = await fetch(huntPageUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': getCookieString(), 'User-Agent': userAgent }, body: new URLSearchParams({ ac: 'raubzug', sac: 'attack', gegnerid: gegnerIdMatch[1] }) });
              const battleHtml = await battleRes.text();
              const isWinner = (battleHtml.includes('headerRowCWinner') && battleHtml.includes(username)) || battleHtml.includes('ganado');
              const loot = parseMGNumber(battleHtml.match(/Ha conseguido ([\d,.]+) <img[^>]+alt=["']Oro["']/i)?.[1] || '0');
              const battleExp = parseMGNumber(battleHtml.match(/([\d,.]+)\s+(?:experience\s+points|puntos\s+de\s+experiencia|experiencia)/i)?.[1] || '0');
              
              pvpCooldown = parseInt(battleHtml.match(/var\s+SecondsCOUNTER\s*=\s*(\d+);/i)?.[1] || "900");
              logs.push({ 
                type: 'BATTLE', 
                message: `PvP Ritual: ${isWinner ? 'VICTORY' : 'DEFEAT'} vs ${rivalName}. Loot: ${loot.toFixed(2)} gold, ${battleExp} XP.`, 
                timestamp: new Date().toISOString() 
              });
            }
          } else if (settings.auto_manhunt && !humanLimitReached) {
            const duration = parseInt(settings.manhunt_duration || '3600');
            const mPayload = new URLSearchParams({ 
              ac: 'raubzug', 
              sac: race === 'Vampire' ? 'vampir' : 'wolf', 
              jagdzeit: duration.toString(),
              x: '194',
              y: '45'
            });
            const mRes = await fetch(huntPageUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': getCookieString(), 'User-Agent': userAgent }, body: mPayload });
            const mHtml = await mRes.text();
            pvpCooldown = parseInt(mHtml.match(/var\s+SecondsCOUNTER\s*=\s*(\d+);/i)?.[1] || duration.toString());
            logs.push({ type: 'MANHUNT', message: `Manhunt started for ${formatDuration(parseInt(duration.toString()))}.`, timestamp: new Date().toISOString() });
          }
        }

        if (settings.auto_grotto && pvpCooldown <= 0) {
          const grottoUrl = `https://${server}/index.php?ac=ahnenstaette`;
          const gCheck = await fetch(grottoUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
          const gHtml = await gCheck.text();
          if (!gHtml.includes("misión") && !gHtml.includes("mision")) {
            const diffMap: any = { 'easy': '0', 'medium': '1', 'hard': '2' };
            await fetch(grottoUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': getCookieString(), 'User-Agent': userAgent }, body: new URLSearchParams({ 'mision': 'true', 'schwierigkeit': diffMap[settings.mission_difficulty || 'medium'] || '1', 'go': 'Aceptar' }) });
            logs.push({ type: 'MISSION', message: `Entering Grotto (${settings.mission_difficulty || 'medium'}).`, timestamp: new Date().toISOString() });
          }
        }

        // --- STEP 4: AUTO-TRAINING RITUAL ---
        if (settings.auto_training && pvpCooldown <= 0) {
          const trainingUrl = `https://${server}/index.php?ac=training`;
          const tRes = await fetch(trainingUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
          const tHtml = await tRes.text();
          const syncGoldMatch = tHtml.match(/Tu oro:.*?([\d,.]+)/si);
          currentGold = parseMGNumber(syncGoldMatch?.[1] || currentGold.toString());
          
          const availableTrainings = [];
          for (const [settingKey, config] of Object.entries(TRAINING_MAP)) {
            if (settings[settingKey] !== false) {
              const costRegex = new RegExp(`typ=${config.type}["']>Entrenamiento\\s*\\(coste\\)\\s*([\\d,.]+)`, 'i');
              const costMatch = tHtml.match(costRegex);
              if (costMatch) {
                availableTrainings.push({ type: config.type, label: config.label, cost: parseMGNumber(costMatch[1]) });
              }
            }
          }

          if (availableTrainings.length > 0) {
            availableTrainings.sort((a, b) => a.cost - b.cost);
            const cheapest = availableTrainings[0];
            const alchemyReserve = settings.auto_alchemy ? parseInt(settings.potion_budget || '445') : 0;
            
            if (currentGold >= cheapest.cost + alchemyReserve) {
              await fetch(`${trainingUrl}&typ=${cheapest.type}`, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
              logs.push({ type: 'TRAINING', message: `Shadow Training: Enhanced ${cheapest.label} for ${cheapest.cost.toFixed(2)} gold.`, timestamp: new Date().toISOString() });
            }
          }
        }
      }
    }

    statusResponse = await fetch(statusUrl, { headers: { 'Cookie': getCookieString(), 'User-Agent': userAgent } });
    html = await statusResponse.text();

    return { 
      race, 
      stats: {
        level: parseInt(html.match(/char_level["'][^>]*>(?:Nivel\s*)?(\d+)/i)?.[1] || "0"),
        gold: parseMGNumber(html.match(/id=["']goldbalance["'][^>]*>([\d,.]+)</i)?.[1] || "0"),
        stamina: stamina, maxStamina: maxStamina,
        experience: parseMGNumber(html.match(/Experiencia.*?([\d,.]+)\s*[|/]\s*([\d,.]+)/si)?.[1] || "0"),
        nextLevelExp: parseMGNumber(html.match(/Experiencia.*?([\d,.]+)\s*[|/]\s*([\d,.]+)/si)?.[2] || "100"),
        skillAverage: parseMGNumber(html.match(/statbarSkillAverage["'][^>]*>.*?:\s*([\d,.]+)/i)?.[1] || "0"),
        attributes: {
          strength: parseInt(html.match(/Fuerza:.*?\((\d+)\)/si)?.[1] || "0"),
          defense: parseInt(html.match(/Defensa:.*?\((\d+)\)/si)?.[1] || "0"),
          dexterity: parseInt(html.match(/Destreza:.*?\((\d+)\)/si)?.[1] || "0"),
          agility: parseInt(html.match(/Agilidad:.*?\((\d+)\)/si)?.[1] || "0"),
          constitution: parseInt(html.match(/Resistencia:.*?\((\d+)\)/si)?.[1] || "0")
        }
      }, 
      logs, pvpCooldown
    };

  } catch (error: any) {
    return { race: 'Vampire', pvpCooldown: 0, stats: { level: 0, gold: 0, stamina: 0, maxStamina: 100, experience: 0, nextLevelExp: 0, skillAverage: 0, attributes: { strength: 0, defense: 0, dexterity: 0, agility: 0, constitution: 0 } }, logs: [{ type: 'ERROR', message: `Ritual Error: ${error.message}`, timestamp: new Date().toISOString() }] };
  }
}

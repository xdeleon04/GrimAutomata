"use server";
/**
 * @fileOverview Service for interacting with MonstersGame via MoonID.
 * Handles authentication, cookie persistence, and active ritual execution (automations).
 */

export interface MonstersGameStats {
  race: "Vampire" | "Werewolf";
  logs: Array<{
    type:
      | "INFO"
      | "BATTLE"
      | "TRAINING"
      | "LOOT"
      | "ERROR"
      | "MANHUNT"
      | "MISSION"
      | "DEBUG";
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
  pvpResults: Array<{
    rivalName: string;
    rivalGameId: string;
    rivalRace?: string;
    isWinner: boolean;
    goldLooted: number;
    xpEarned: number;
    timestamp: string;
  }>;
}

/**
 * Normalizes European number formatting (e.g., 66.876,06 -> 66876.06)
 */
function parseMGNumber(str: string | null): number {
  if (!str) return 0;
  const normalized = str
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
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

  return parts.join(" ");
}

/**
 * Parses actual remaining time from page text.
 * Handles patterns like:
 * - "In 9 minutes" / "En 9 minutos"
 * - "every 15 minutes" / "cada 15 minutos"
 * - "X hours" / "X horas"
 * Returns seconds, or null if no text-based time found.
 */
function parseTimeFromText(html: string): number | null {
  const combinedMatch = html.match(
    /(?:In|En)\s+(\d+)\s+(?:hours?|horas?)\s+(?:and|y|,)\s+(\d+)\s+(?:minutes?|minutos?)/i,
  );
  if (combinedMatch)
    return parseInt(combinedMatch[1]) * 3600 + parseInt(combinedMatch[2]) * 60;

  const hoursMatch = html.match(
    /(?:In|En)\s+(\d+)\s+(?:hours?|horas?)/i,
  );
  if (hoursMatch) return parseInt(hoursMatch[1]) * 3600;

  const minutesMatch = html.match(
    /(?:In|En)\s+(\d+)\s+(?:minutes?|minutos?)/i,
  );
  if (minutesMatch) return parseInt(minutesMatch[1]) * 60;

  return null;
}

/**
 * Executes active rituals (automations) and fetches real data from the MonstersGame server.
 */
export async function fetchMonstersGameData(
  username: string,
  password: string,
  server: string,
  debug: boolean = false,
  settings: Record<string, any> = {},
): Promise<MonstersGameStats | null> {
  const logs: MonstersGameStats["logs"] = [];
  const pvpResults: MonstersGameStats["pvpResults"] = [];
  let pvpCooldown = 0;

  const logDebug = (msg: string) => {
    if (debug) {
      logs.push({
        type: "DEBUG",
        message: msg,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const POTIONS = [
    { id: 11, cost: 4250, name: "Esencia de fortaleza (5000)" },
    { id: 10, cost: 2200, name: "Esencia de fortaleza (2500)" },
    { id: 8, cost: 891, name: "Esencia de fortaleza (1000)" },
    { id: 7, cost: 445, name: "Esencia de fortaleza (500)" },
    { id: 2, cost: 89, name: "Esencia de fortaleza (100)" },
    { id: 1, cost: 49, name: "Esencia de fortaleza (50)" },
  ];

  const TRAINING_MAP: Record<string, { type: string; label: string }> = {
    train_strength: { type: "staerke", label: "Fuerza" },
    train_defense: { type: "verteidigung", label: "Defensa" },
    train_agility: { type: "gewandtheit", label: "Agilidad" },
    train_constitution: { type: "ausdauer", label: "Resistencia" },
    train_dexterity: { type: "charisma", label: "Destreza" },
  };

  try {
    const cookies: Map<string, string> = new Map();
    const userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

    const getCookieString = () =>
      Array.from(cookies.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
    const updateCookies = (setCookieHeaders: string[] | null) => {
      if (!setCookieHeaders) return;
      setCookieHeaders.forEach((header) => {
        const part = header.split(";")[0];
        const [key, ...valParts] = part.split("=");
        if (key) cookies.set(key.trim(), valParts.join("="));
      });
    };

    logDebug(
      `[AUTH] Initiating MoonID authentication ritual for [${username}]...`,
    );

    const preAuthResponse = await fetch("https://moonid.net/account/login/", {
      headers: { "User-Agent": userAgent },
    });
    updateCookies(preAuthResponse.headers.getSetCookie());
    const preAuthHtml = await preAuthResponse.text();
    const csrfMatch = preAuthHtml.match(
      /name=['"]csrfmiddlewaretoken['"]\s+value=['"]([^'"]+)['"]/i,
    );
    const csrfToken = csrfMatch ? csrfMatch[1] : "";

    const loginPayload = new URLSearchParams({
      csrfmiddlewaretoken: csrfToken,
      username: username,
      password: password,
      next: "/api/account/connect/83/",
    });

    const loginResponse = await fetch("https://moonid.net/account/login/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: getCookieString(),
        "User-Agent": userAgent,
        Referer: "https://moonid.net/account/login/",
        Origin: "https://moonid.net",
      },
      body: loginPayload,
      redirect: "manual",
    });
    updateCookies(loginResponse.headers.getSetCookie());

    let currentUrl = loginResponse.headers.get("Location");
    while (currentUrl) {
      if (currentUrl.startsWith("/"))
        currentUrl = "https://moonid.net" + currentUrl;
      const res = await fetch(currentUrl, {
        headers: { Cookie: getCookieString(), "User-Agent": userAgent },
        redirect: "manual",
      });
      updateCookies(res.headers.getSetCookie());
      currentUrl = res.headers.get("Location");
    }

    // --- STEP 1: INITIAL SYNC ---
    const statusUrl = `https://${server}/index.php?ac=status`;
    let statusResponse = await fetch(statusUrl, {
      headers: { Cookie: getCookieString(), "User-Agent": userAgent },
    });
    let html = await statusResponse.text();

    const staminaMatch =
      html.match(
        /Energía\s+vital:.*?\(\s*([\d,.]+)\s*[|/]\s*([\d,.]+)\s*\)/is,
      ) || html.match(/Energía\s+vital:\s*([\d,.]+)/i);
    const stamina = parseMGNumber(staminaMatch ? staminaMatch[1] : "0");
    const maxStamina = parseMGNumber(
      staminaMatch && staminaMatch[2] ? staminaMatch[2] : "800",
    );

    const staminaReservePercent = parseInt(settings.stamina_reserve || "10");
    const thresholdValue = (staminaReservePercent / 100) * maxStamina;

    const race =
      html.toLowerCase().includes("vampiro") ||
      html.toLowerCase().includes("vampira")
        ? "Vampire"
        : "Werewolf";

    const goldMatch = html.match(/id=["']goldbalance["'][^>]*>([\d,.]+)</i);
    let currentGold = parseMGNumber(goldMatch?.[1] || "0");

    const secondsMatchStatus = html.match(/var\s+SecondsCOUNTER\s*=\s*(\d+);/i);
    pvpCooldown = secondsMatchStatus ? parseInt(secondsMatchStatus[1]) : 0;

    // Improved context-aware busy detection using pageContentC
    const busyMsgBox = html.match(
      /class=["']pageContentC["'][^>]*>(.*?)<\/div>/is,
    );
    const busyText = busyMsgBox ? busyMsgBox[1].toLowerCase() : "";

    const isWorking =
      busyText.includes("trabajando") ||
      busyText.includes("cementerio") ||
      busyText.includes("friedhof");
    const isInMission =
      busyText.includes("misión") ||
      busyText.includes("mision") ||
      busyText.includes("grotto") ||
      busyText.includes("ahnenstaette");
    const isManhunting =
      busyText.includes("raid") ||
      busyText.includes("caza") ||
      busyText.includes("raubzug");

    if (pvpCooldown > 0 || isWorking || isInMission || isManhunting) {
      const timeLeft = formatDuration(pvpCooldown);
      let busyMsg = `Shadow Vigil: Character is currently resting. Cooldown: ${timeLeft}.`;

      if (isWorking) {
        busyMsg = `Shadow Vigil: Character is currently working at the graveyard. Shift ends in ${timeLeft}.`;
      } else if (isInMission) {
        busyMsg = `Shadow Vigil: Character is currently on a mission in the Ancestral Grotto. Ends in ${timeLeft}.`;
      } else if (isManhunting) {
        busyMsg = `Shadow Vigil: Character is currently hunting humans. Hunt ends in ${timeLeft}.`;
      }

      logs.push({
        type: "INFO",
        message: busyMsg,
        timestamp: new Date().toISOString(),
      });
    }

    // --- STEP 2: AUTOMATION RITUALS ---
    if (pvpCooldown <= 0 && !isWorking && !isInMission && !isManhunting) {
      // Alchemy Check
      if (stamina <= thresholdValue && settings.auto_alchemy) {
        const budget = parseInt(settings.potion_budget || "445");
        const targetPotion =
          POTIONS.find((p) => p.cost <= budget && p.cost <= currentGold) ||
          POTIONS[POTIONS.length - 1];

        const potionInInventory = POTIONS.find((p) =>
          html.includes(`useitem=${p.id}`),
        );

        if (potionInInventory) {
          const useUrl = `https://${server}/index.php?ac=status&useitem=${potionInInventory.id}`;
          await fetch(useUrl, {
            headers: { Cookie: getCookieString(), "User-Agent": userAgent },
          });
          logs.push({
            type: "LOOT",
            message: `Shadow Alchemy: Used ${potionInInventory.name} from inventory.`,
            timestamp: new Date().toISOString(),
          });
          statusResponse = await fetch(statusUrl, {
            headers: { Cookie: getCookieString(), "User-Agent": userAgent },
          });
          html = await statusResponse.text();
        } else if (currentGold >= targetPotion.cost) {
          // Precise POST data for ES1 merchant
          const traderParams = new URLSearchParams();
          traderParams.append("ac", "stadt");
          traderParams.append("prod_group", "4");
          traderParams.append("item_id", targetPotion.id.toString());
          traderParams.append("num_items", "0");
          traderParams.append("cur_price", targetPotion.cost.toString());
          traderParams.append("bonus_gold", "");
          traderParams.append("server_amount", targetPotion.cost.toString());
          traderParams.append("portal_amount", "0");
          traderParams.append("action", "buy");
          traderParams.append("currency", "gold");
          traderParams.append("upgrade_level", "0");
          traderParams.append("num_items", "1"); // Replicate the dual num_items parameter
          traderParams.append("x", "172");
          traderParams.append("y", "30");

          const traderUrl = `https://${server}/index.php?ac=stadt&sac=warenhaendler&action=buy&item_id=${targetPotion.id}&prod_group=4&currency=gold&sc=`;
          await fetch(traderUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Cookie: getCookieString(),
              "User-Agent": userAgent,
              Referer: traderUrl,
            },
            body: traderParams,
          });

          const useUrl = `https://${server}/index.php?ac=status&useitem=${targetPotion.id}`;
          await fetch(useUrl, {
            headers: { Cookie: getCookieString(), "User-Agent": userAgent },
          });
          logs.push({
            type: "LOOT",
            message: `Shadow Alchemy: Purchased and used ${targetPotion.name} (${targetPotion.cost.toFixed(2)} gold).`,
            timestamp: new Date().toISOString(),
          });
          statusResponse = await fetch(statusUrl, {
            headers: { Cookie: getCookieString(), "User-Agent": userAgent },
          });
          html = await statusResponse.text();
        }
      }

      // Check final stamina after potential alchemy
      const finalStaminaMatch = html.match(
        /Energía\s+vital:.*?\(\s*([\d,.]+)\s*[|/]\s*([\d,.]+)\s*\)/is,
      );
      const currentStamina = parseMGNumber(
        finalStaminaMatch ? finalStaminaMatch[1] : stamina.toString(),
      );

      if (currentStamina <= thresholdValue && settings.auto_work !== false) {
        const pointsNeeded = Math.max(0, thresholdValue - currentStamina + 10);
        const hoursToWork = Math.min(
          12,
          Math.max(1, Math.ceil(pointsNeeded / 10)),
        );
        const workPayload = new URLSearchParams({
          ac: "friedhof",
          sac: "startjob",
          arbeitszeit: hoursToWork.toString(),
        });
        const workRes = await fetch(`https://${server}/index.php?ac=friedhof`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: getCookieString(),
            "User-Agent": userAgent,
          },
          body: workPayload,
        });
        const workHtml = await workRes.text();
        const textCooldownWork = parseTimeFromText(workHtml);
        pvpCooldown =
          textCooldownWork ??
          parseInt(
            workHtml.match(/var\s+SecondsCOUNTER\s*=\s*(\d+);/i)?.[1] ||
              (hoursToWork * 3600).toString(),
          );
        logs.push({
          type: "INFO",
          message: `Shadow Ritual: Graveyard shift started for ${hoursToWork}h. Earning gold while resting.`,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Combat Rituals
        const huntPageUrl = `https://${server}/index.php?ac=raubzug`;
        const huntPageRes = await fetch(huntPageUrl, {
          headers: { Cookie: getCookieString(), "User-Agent": userAgent },
        });
        const huntHtml = await huntPageRes.text();

        // Parse Manhunt Spoils if just returned
        if (huntHtml.includes("Resultado de la caza")) {
          const blood =
            huntHtml.match(/(\d+)\s+litros\s+de\s+sangre/i)?.[1] || "0";
          const goldVal = parseMGNumber(
            huntHtml.match(/([\d,.]+)\s+<img[^>]+alt=["']Oro["']/i)?.[1] || "0",
          );
          const expVal = parseMGNumber(
            huntHtml.match(
              /([\d,.]+)\s+(?:experience\s+points|puntos\s+de\s+experiencia|experiencia|experience)/i,
            )?.[1] || "0",
          );

          if (blood !== "0" || goldVal > 0 || expVal > 0) {
            logs.push({
              type: "MANHUNT",
              message: `Manhunt Harvest: Collected ${blood} liters of blood, ${goldVal.toFixed(2)} gold, and ${expVal} XP.`,
              timestamp: new Date().toISOString(),
            });
          } else if (
            huntHtml.includes("nada que encontrar") ||
            huntHtml.includes("nothing to be found")
          ) {
            logs.push({
              type: "MANHUNT",
              message: "Manhunt result: The shadows yielded nothing this time.",
              timestamp: new Date().toISOString(),
            });
          }
        }

        pvpCooldown = parseInt(
          huntHtml.match(/var\s+SecondsCOUNTER\s*=\s*(\d+);/i)?.[1] || "0",
        );

        if (pvpCooldown <= 0) {
          const humanLimitReached =
            huntHtml.includes("used all of today's hunting time") ||
            huntHtml.includes("ya has usado todo tu tiempo de caza");

          if (humanLimitReached && settings.pvp_attack) {
            const pvpSearchPayload = new URLSearchParams({
              ac: "raubzug",
              sac: "gegner",
              searchname: settings.pvp_target_name || "",
              searchopt:
                settings.pvp_search_strategy === "none"
                  ? ""
                  : settings.pvp_search_strategy || "",
            });
            const pvpSearchRes = await fetch(huntPageUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Cookie: getCookieString(),
                "User-Agent": userAgent,
              },
              body: pvpSearchPayload,
            });
            const searchHtml = await pvpSearchRes.text();

            if (
              searchHtml.includes("en vano") ||
              searchHtml.includes("no character matches")
            ) {
              logs.push({
                type: "BATTLE",
                message:
                  "PvP Ritual: Rival eluded our sight. Try increasing Dexterity or retry next cycle.",
                timestamp: new Date().toISOString(),
              });
            } else {
              const gegnerIdMatch = searchHtml.match(
                /name=['"]gegnerid['"]\s+value=['"](\d+)['"]/i,
              );
              const rivalNameMatch =
                searchHtml.match(
                  /<div class="headerRow">(?:Hombre Lobo|Vampiro|Vampira|Werwolf|Werewolf)\s+([^<]+)<\/div>/i,
                ) ||
                searchHtml.match(/sac=info&amp;id=\d+[^>]*>([^<]+)<\/a>/i) ||
                searchHtml.match(
                  /<h3>(?:versus|contra|contra\s+)\s*([^<]+)<\/h3>/i,
                );
              const rivalRaceMatch = searchHtml.match(
                /<div class="headerRow">(Hombre Lobo|Vampiro|Vampira|Werwolf|Werewolf)/i,
              );
              const rivalRace = rivalRaceMatch
                ? rivalRaceMatch[1]
                : undefined;
              const rivalName = rivalNameMatch
                ? rivalNameMatch[1].trim()
                : "Unknown Rival";

              if (gegnerIdMatch) {
                const battleRes = await fetch(huntPageUrl, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Cookie: getCookieString(),
                    "User-Agent": userAgent,
                  },
                  body: new URLSearchParams({
                    ac: "raubzug",
                    sac: "attack",
                    gegnerid: gegnerIdMatch[1],
                  }),
                });
                const battleHtml = await battleRes.text();

                const isWinner =
                  battleHtml.includes("headerRowCWinner") ||
                  battleHtml.includes("ganado");
                const lootVal = parseMGNumber(
                  battleHtml.match(
                    /Ha conseguido ([\d,.]+) <img[^>]+alt=["']Oro["']/i,
                  )?.[1] || "0",
                );
                const expVal = parseMGNumber(
                  battleHtml.match(
                    /([\d,.]+)\s+(?:experience\s+points|punto\(?s?\)?\s+de\s+experiencia|puntos\s+de\s+experiencia|experiencia|puntos\s+de\s+exp|experience)/i,
                  )?.[1] || "0",
                );

                const textCooldownPvP = parseTimeFromText(battleHtml);
                pvpCooldown =
                  textCooldownPvP ??
                  parseInt(
                    battleHtml.match(
                      /var\s+SecondsCOUNTER\s*=\s*(\d+);/i,
                    )?.[1] || "900",
                  );
                logs.push({
                  type: "BATTLE",
                  message: `PvP Ritual: ${isWinner ? "VICTORY" : "DEFEAT"} vs ${rivalName}. Loot: ${lootVal.toFixed(2)} gold, ${expVal} XP.`,
                  timestamp: new Date().toISOString(),
                });
                pvpResults.push({
                  rivalName,
                  rivalGameId: gegnerIdMatch[1],
                  rivalRace,
                  isWinner,
                  goldLooted: lootVal,
                  xpEarned: expVal,
                  timestamp: new Date().toISOString(),
                });
              }
            }
          } else if (settings.auto_manhunt && !humanLimitReached) {
            const minutes = parseInt(settings.manhunt_duration || "10");
            const seconds = minutes * 60;
            const mPayload = new URLSearchParams({
              ac: "raubzug",
              sac: "vampir",
              jagdzeit: seconds.toString(),
              x: "194",
              y: "45",
            });
            const mRes = await fetch(huntPageUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Cookie: getCookieString(),
                "User-Agent": userAgent,
              },
              body: mPayload,
            });
            const mHtml = await mRes.text();
            const textCooldown = parseTimeFromText(mHtml);
            pvpCooldown =
              textCooldown ??
              parseInt(
                mHtml.match(/var\s+SecondsCOUNTER\s*=\s*(\d+);/i)?.[1] ||
                  seconds.toString(),
              );
            logs.push({
              type: "MANHUNT",
              message: `Manhunt Ritual: Tracking humans for ${minutes}m. Blood shall flow.`,
              timestamp: new Date().toISOString(),
            });
          }
        }

        if (settings.auto_grotto && pvpCooldown <= 0) {
          const grottoUrl = `https://${server}/index.php?ac=ahnenstaette`;
          const gCheck = await fetch(grottoUrl, {
            headers: { Cookie: getCookieString(), "User-Agent": userAgent },
          });
          const gHtml = await gCheck.text();
          if (!gHtml.includes("misión") && !gHtml.includes("mision")) {
            const diffMap: any = { easy: "0", medium: "1", hard: "2" };
            await fetch(grottoUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Cookie: getCookieString(),
                "User-Agent": userAgent,
              },
              body: new URLSearchParams({
                mision: "true",
                schwierigkeit:
                  diffMap[settings.mission_difficulty || "medium"] || "1",
                go: "Aceptar",
              }),
            });
            logs.push({
              type: "MISSION",
              message: `Shadow Ritual: Entering the Ancestral Grotto (${settings.mission_difficulty || "medium"}).`,
              timestamp: new Date().toISOString(),
            });
          }
        }

        // Auto-Training Ritual
        if (settings.auto_training && pvpCooldown <= 0) {
          const trainingUrl = `https://${server}/index.php?ac=training`;
          const tRes = await fetch(trainingUrl, {
            headers: { Cookie: getCookieString(), "User-Agent": userAgent },
          });
          const tHtml = await tRes.text();
          currentGold = parseMGNumber(
            tHtml.match(/Tu oro:.*?([\d,.]+)/is)?.[1] || currentGold.toString(),
          );

          const availableTrainings = [];
          for (const [settingKey, config] of Object.entries(TRAINING_MAP)) {
            if (settings[settingKey] !== false) {
              const costMatch = tHtml.match(
                new RegExp(
                  `typ=${config.type}["']>Entrenamiento\\s*\\(coste\\)\\s*([\\d,.]+)`,
                  "i",
                ),
              );
              if (costMatch) {
                availableTrainings.push({
                  type: config.type,
                  label: config.label,
                  cost: parseMGNumber(costMatch[1]),
                });
              }
            }
          }

          if (availableTrainings.length > 0) {
            availableTrainings.sort((a, b) => a.cost - b.cost);
            const cheapest = availableTrainings[0];
            const alchemyReserve = settings.auto_alchemy
              ? parseInt(settings.potion_budget || "445")
              : 0;

            if (currentGold >= cheapest.cost + alchemyReserve) {
              await fetch(`${trainingUrl}&typ=${cheapest.type}`, {
                headers: { Cookie: getCookieString(), "User-Agent": userAgent },
              });
              logs.push({
                type: "TRAINING",
                message: `Shadow Training: Enhanced ${cheapest.label} for ${cheapest.cost.toFixed(2)} gold.`,
                timestamp: new Date().toISOString(),
              });
            }
          }
        }
      }
    }

    // Final Sync
    statusResponse = await fetch(statusUrl, {
      headers: { Cookie: getCookieString(), "User-Agent": userAgent },
    });
    html = await statusResponse.text();

    const finalStaminaMatch =
      html.match(
        /Energía\s+vital:.*?\(\s*([\d,.]+)\s*[|/]\s*([\d,.]+)\s*\)/is,
      ) || html.match(/Energía\s+vital:\s*([\d,.]+)/i);
    const finalStamina = parseMGNumber(
      finalStaminaMatch ? finalStaminaMatch[1] : "0",
    );
    const finalMaxStamina = parseMGNumber(
      finalStaminaMatch && finalStaminaMatch[2] ? finalStaminaMatch[2] : "800",
    );

    // --- STEP 3: SCRAPE PVP HISTORY FROM MESSAGES ---
    try {
      const messagesUrl = `https://${server}/index.php?ac=nachrichten&sac=angriff`;
      const msgRes = await fetch(messagesUrl, {
        headers: { Cookie: getCookieString(), "User-Agent": userAgent },
      });
      const msgHtml = await msgRes.text();

      const fightIdRegex =
        /ac=fightreport&(?:amp;)?fightid=(\d+)&(?:amp;)?sac=angriff/gi;
      const fightIds: string[] = [];
      let fightMatch;
      while ((fightMatch = fightIdRegex.exec(msgHtml)) !== null) {
        if (!fightIds.includes(fightMatch[1])) {
          fightIds.push(fightMatch[1]);
        }
      }

      const reportsToFetch = fightIds.slice(0, 10);
      for (const fightId of reportsToFetch) {
        try {
          const reportUrl = `https://${server}/index.php?ac=fightreport&fightid=${fightId}&sac=angriff`;
          const reportRes = await fetch(reportUrl, {
            headers: { Cookie: getCookieString(), "User-Agent": userAgent },
          });
          const reportHtml = await reportRes.text();

          const reportRivalName = reportHtml
            .match(/sac=info&(?:amp;)?id=\d+[^>]*>([^<]+)<\/a>/i)?.[1]
            ?.trim();
          const reportRivalId = reportHtml.match(
            /sac=info&(?:amp;)?id=(\d+)/i,
          )?.[1];
          const reportIsWinner =
            reportHtml.includes("headerRowCWinner") ||
            reportHtml.includes("ganado");
          const reportGold = parseMGNumber(
            reportHtml.match(
              /Ha conseguido ([\d,.]+)\s*<img[^>]+alt=["']Oro["']/i,
            )?.[1] || "0",
          );
          const reportXp = parseMGNumber(
            reportHtml.match(
              /([\d,.]+)\s+(?:experience\s+points|punto\(?s?\)?\s+de\s+experiencia|puntos\s+de\s+experiencia|experiencia|puntos\s+de\s+exp|experience)/i,
            )?.[1] || "0",
          );
          const reportRivalRace = reportHtml.match(
            /<div class="headerRow[^"]*">(Hombre Lobo|Vampiro|Vampira|Werwolf|Werewolf)/i,
          )?.[1];

          if (reportRivalName && reportRivalId) {
            const alreadyRecorded = pvpResults.some(
              (r) => r.rivalGameId === reportRivalId,
            );
            if (!alreadyRecorded) {
              pvpResults.push({
                rivalName: reportRivalName,
                rivalGameId: reportRivalId,
                rivalRace: reportRivalRace,
                isWinner: reportIsWinner,
                goldLooted: reportGold,
                xpEarned: reportXp,
                timestamp: new Date().toISOString(),
              });
            }
          }
        } catch {
          // Skip individual report errors
        }
      }
    } catch {
      logDebug("[MESSAGES] Failed to fetch PvP message history");
    }

    return {
      race,
      stats: {
        level: parseInt(
          html.match(/char_level["'][^>]*>(?:Nivel\s*)?(\d+)/i)?.[1] || "0",
        ),
        gold: parseMGNumber(
          html.match(/id=["']goldbalance["'][^>]*>([\d,.]+)</i)?.[1] || "0",
        ),
        stamina: finalStamina,
        maxStamina: finalMaxStamina,
        experience: parseMGNumber(
          html.match(/Experiencia.*?([\d,.]+)\s*[|/]\s*([\d,.]+)/is)?.[1] ||
            "0",
        ),
        nextLevelExp: parseMGNumber(
          html.match(/Experiencia.*?([\d,.]+)\s*[|/]\s*([\d,.]+)/is)?.[2] ||
            "100",
        ),
        skillAverage: parseMGNumber(
          html.match(/statbarSkillAverage["'][^>]*>.*?:\s*([\d,.]+)/i)?.[1] ||
            "0",
        ),
        attributes: {
          strength: parseInt(html.match(/Fuerza:.*?\((\d+)\)/is)?.[1] || "0"),
          defense: parseInt(html.match(/Defensa:.*?\((\d+)\)/is)?.[1] || "0"),
          dexterity: parseInt(
            html.match(/Destreza:.*?\((\d+)\)/is)?.[1] || "0",
          ),
          agility: parseInt(html.match(/Agilidad:.*?\((\d+)\)/is)?.[1] || "0"),
          constitution: parseInt(
            html.match(/Resistencia:.*?\((\d+)\)/is)?.[1] || "0",
          ),
        },
      },
      logs,
      pvpCooldown,
      pvpResults,
    };
  } catch (error: any) {
    return {
      race: "Vampire",
      pvpCooldown: 0,
      stats: {
        level: 0,
        gold: 0,
        stamina: 0,
        maxStamina: 100,
        experience: 0,
        nextLevelExp: 0,
        skillAverage: 0,
        attributes: {
          strength: 0,
          defense: 0,
          dexterity: 0,
          agility: 0,
          constitution: 0,
        },
      },
      logs: [
        {
          type: "ERROR",
          message: `Ritual Error: ${error.message}`,
          timestamp: new Date().toISOString(),
        },
      ],
      pvpResults,
    };
  }
}

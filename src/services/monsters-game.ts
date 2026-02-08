"use server";
/**
 * @fileOverview Service for interacting with MonstersGame via MoonID.
 * Handles authentication, cookie persistence, and active ritual execution (automations).
 */

import {
  MG_ACTIONS,
  MG_ROUTES,
  MG_PARAMS,
  MG_TEXT,
  MG_REGEX,
  MG_POTIONS,
  MG_TRAINING,
  parseEuropeanNumber,
  formatDuration,
  parseTimeFromText,
  extractCooldownTimer,
  matchesAnyPattern,
  detectRace,
  detectBusyState,
  detectCooldownReason,
  parseStatbar,
  parseAttributes,
  parseBattleResult,
  findBestPotion,
  findPotionInInventory,
  buildUrl,
} from "./mg-selectors";

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
  cooldownReason?: string; // Human-readable reason for the current cooldown
  stats: {
    level: number;
    gold: number;
    blood: number;
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
  manualPvpStatus?: {
    currentTargetId: string;
    currentTargetName: string;
    targetIndex: number;
    totalTargets: number;
    attempted: string[];
  };
}

/**
 * Authenticates with MoonID and returns session cookies for MonstersGame requests.
 */
export async function authenticateMoonId(
  username: string,
  password: string,
): Promise<{ getCookieString: () => string; userAgent: string }> {
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

  const preAuthResponse = await fetch("https://moonid.net/account/login/", {
    headers: { "User-Agent": userAgent },
  });
  updateCookies(preAuthResponse.headers.getSetCookie());
  const preAuthHtml = await preAuthResponse.text();
  const csrfMatch = preAuthHtml.match(MG_REGEX.CSRF_TOKEN);
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

  return { getCookieString, userAgent };
}

/**
 * Lightweight heartbeat: authenticates and fetches only the cooldown timer from the status page.
 * Returns pvpCooldown >= 0 on success, or -1 on error.
 */
export async function fetchCooldownOnly(
  username: string,
  password: string,
  server: string,
): Promise<{ pvpCooldown: number }> {
  try {
    const { getCookieString, userAgent } = await authenticateMoonId(
      username,
      password,
    );
    const statusUrl = buildUrl(server, MG_ROUTES.STATUS);
    const statusResponse = await fetch(statusUrl, {
      headers: { Cookie: getCookieString(), "User-Agent": userAgent },
    });
    const html = await statusResponse.text();
    return { pvpCooldown: extractCooldownTimer(html) };
  } catch {
    return { pvpCooldown: -1 };
  }
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
  pvpTargetList: Array<{ rivalGameId: string; rivalName: string }> = [],
): Promise<MonstersGameStats | null> {
  const logs: MonstersGameStats["logs"] = [];
  const pvpResults: MonstersGameStats["pvpResults"] = [];
  let pvpCooldown = 0;
  let cooldownReason = "";
  let manualPvpStatus: MonstersGameStats["manualPvpStatus"] = undefined;

  const logDebug = (msg: string) => {
    if (debug) {
      logs.push({
        type: "DEBUG",
        message: msg,
        timestamp: new Date().toISOString(),
      });
    }
  };

  try {
    logDebug(
      `[AUTH] Initiating MoonID authentication ritual for [${username}]...`,
    );

    const { getCookieString, userAgent } = await authenticateMoonId(
      username,
      password,
    );

    // --- STEP 1: INITIAL SYNC ---
    const statusUrl = buildUrl(server, MG_ROUTES.STATUS);
    let statusResponse = await fetch(statusUrl, {
      headers: { Cookie: getCookieString(), "User-Agent": userAgent },
    });
    let html = await statusResponse.text();

    const statbar = parseStatbar(html);
    const stamina = statbar.stamina;
    const maxStamina = statbar.maxStamina;

    const staminaReservePercent = parseInt(settings.stamina_reserve || "10");
    const thresholdValue = (staminaReservePercent / 100) * maxStamina;

    const race = detectRace(html);
    let currentGold = statbar.gold;
    pvpCooldown = extractCooldownTimer(html);

    const busyState = detectBusyState(html);
    let isWorking = busyState.isWorking;
    let isInMission = busyState.isInMission;
    let isManhunting = busyState.isManhunting;

    // --- MANHUNT COMPLETION: collect results when timer has expired ---
    if (isManhunting && pvpCooldown <= 0) {
      const huntPageUrl = buildUrl(server, MG_ROUTES.RAID);
      const huntCollectRes = await fetch(huntPageUrl, {
        headers: { Cookie: getCookieString(), "User-Agent": userAgent },
      });
      const huntCollectHtml = await huntCollectRes.text();

      // Parse manhunt spoils
      if (matchesAnyPattern(huntCollectHtml, MG_TEXT.HUNT_RESULT)) {
        const blood = huntCollectHtml.match(MG_REGEX.LOOT_BLOOD)?.[1] || "0";
        const goldVal = parseEuropeanNumber(
          huntCollectHtml.match(MG_REGEX.LOOT_GOLD)?.[1] || "0",
        );
        const expVal = parseEuropeanNumber(
          huntCollectHtml.match(MG_REGEX.LOOT_XP)?.[1] || "0",
        );

        if (blood !== "0" || goldVal > 0 || expVal > 0) {
          logs.push({
            type: "MANHUNT",
            message: `Manhunt Harvest: Collected ${blood} liters of blood, ${goldVal.toFixed(2)} gold, and ${expVal} XP.`,
            timestamp: new Date().toISOString(),
          });
        } else if (matchesAnyPattern(huntCollectHtml, MG_TEXT.HUNT_NOTHING)) {
          logs.push({
            type: "MANHUNT",
            message: "Manhunt result: The shadows yielded nothing this time.",
            timestamp: new Date().toISOString(),
          });
        }
      }

      const huntLimitReached = matchesAnyPattern(
        huntCollectHtml,
        MG_TEXT.HUNT_LIMIT,
      );
      const hasRepeatForm = MG_REGEX.MANHUNT_REPEAT_FORM.test(huntCollectHtml);

      if (settings.auto_manhunt && hasRepeatForm && !huntLimitReached) {
        // Extract jagdzeit from the repeat form, or use configured duration
        const jagdzeitMatch = huntCollectHtml.match(MG_REGEX.MANHUNT_JAGDZEIT);
        const jagdzeitSeconds = jagdzeitMatch
          ? parseInt(jagdzeitMatch[1])
          : parseInt(settings.manhunt_duration || "10") * 60;
        const repeatMinutes = Math.round(jagdzeitSeconds / 60);

        const repeatPayload = new URLSearchParams({
          ac: MG_ACTIONS.RAID,
          sac: MG_PARAMS.MANHUNT_SAC,
          [MG_PARAMS.MANHUNT_TIME]: jagdzeitSeconds.toString(),
        });
        const repeatRes = await fetch(huntPageUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: getCookieString(),
            "User-Agent": userAgent,
          },
          body: repeatPayload,
        });
        const repeatHtml = await repeatRes.text();
        const textCooldown = parseTimeFromText(repeatHtml);
        pvpCooldown =
          textCooldown ?? (extractCooldownTimer(repeatHtml) || jagdzeitSeconds);
        cooldownReason = "Manhunt in progress";
        logs.push({
          type: "MANHUNT",
          message: `Manhunt Ritual: Repeating hunt for ${repeatMinutes}m. Blood shall flow.`,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Submit the back form to return to hunt page and clear busy state
        await fetch(huntPageUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: getCookieString(),
            "User-Agent": userAgent,
          },
          body: new URLSearchParams({ ac: MG_ACTIONS.RAID }),
        });
      }

      // Re-fetch status to clear stale busy state
      statusResponse = await fetch(statusUrl, {
        headers: { Cookie: getCookieString(), "User-Agent": userAgent },
      });
      html = await statusResponse.text();
      pvpCooldown = extractCooldownTimer(html);

      const refreshedBusyState = detectBusyState(html);
      isWorking = refreshedBusyState.isWorking;
      isInMission = refreshedBusyState.isInMission;
      isManhunting = refreshedBusyState.isManhunting;
    }

    if (pvpCooldown > 0 || isWorking || isInMission || isManhunting) {
      const timeLeft = formatDuration(pvpCooldown);
      let busyMsg = "";

      if (isWorking) {
        busyMsg = `Shadow Vigil: Character is currently working at the graveyard. Shift ends in ${timeLeft}.`;
        cooldownReason = "Graveyard work shift in progress";
      } else if (isInMission) {
        busyMsg = `Shadow Vigil: Character is currently on a mission in the Ancestral Grotto. Ends in ${timeLeft}.`;
        cooldownReason = "Ancestral Grotto mission in progress";
      } else if (isManhunting) {
        busyMsg = `Shadow Vigil: Character is currently hunting humans. Hunt ends in ${timeLeft}.`;
        cooldownReason = "Manhunt in progress";
      } else {
        // Cooldown exists but no specific busy state - likely PvP protection or action recovery
        busyMsg = `Shadow Vigil: Awaiting action cooldown (PvP protection or activity recovery). Available in ${timeLeft}.`;
        cooldownReason = "PvP protection or activity recovery";
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
          findBestPotion(currentGold, budget) ||
          MG_POTIONS[MG_POTIONS.length - 1];

        const potionInInventory = findPotionInInventory(html);

        if (potionInInventory) {
          const useUrl = `${statusUrl}&useitem=${potionInInventory.id}`;
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
          traderParams.append("ac", MG_ACTIONS.CITY);
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

          const traderUrl = `${buildUrl(
            server,
            MG_ROUTES.STORE,
          )}&action=buy&item_id=${targetPotion.id}&prod_group=4&currency=gold&sc=`;
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

          const useUrl = `${statusUrl}&useitem=${targetPotion.id}`;
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
      const currentStamina = parseStatbar(html).stamina;

      if (currentStamina <= thresholdValue && settings.auto_work !== false) {
        const pointsNeeded = Math.max(0, thresholdValue - currentStamina + 10);
        const hoursToWork = Math.min(
          12,
          Math.max(1, Math.ceil(pointsNeeded / 10)),
        );
        const workPayload = new URLSearchParams({
          ac: MG_ACTIONS.GRAVEYARD,
          sac: MG_PARAMS.WORK_SAC,
          [MG_PARAMS.WORK_TIME]: hoursToWork.toString(),
        });
        const graveyardUrl = buildUrl(server, MG_ROUTES.GRAVEYARD);
        const workRes = await fetch(graveyardUrl, {
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
          (extractCooldownTimer(workHtml) || hoursToWork * 3600);
        cooldownReason = "Graveyard work shift in progress";
        logs.push({
          type: "INFO",
          message: `Shadow Ritual: Graveyard shift started for ${hoursToWork}h. Earning gold while resting.`,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Combat Rituals
        const huntPageUrl = buildUrl(server, MG_ROUTES.RAID);
        const huntPageRes = await fetch(huntPageUrl, {
          headers: { Cookie: getCookieString(), "User-Agent": userAgent },
        });
        const huntHtml = await huntPageRes.text();

        // Parse Manhunt Spoils if just returned
        if (matchesAnyPattern(huntHtml, MG_TEXT.HUNT_RESULT)) {
          const blood = huntHtml.match(MG_REGEX.LOOT_BLOOD)?.[1] || "0";
          const goldVal = parseEuropeanNumber(
            huntHtml.match(MG_REGEX.LOOT_GOLD)?.[1] || "0",
          );
          const expVal = parseEuropeanNumber(
            huntHtml.match(MG_REGEX.LOOT_XP)?.[1] || "0",
          );

          if (blood !== "0" || goldVal > 0 || expVal > 0) {
            logs.push({
              type: "MANHUNT",
              message: `Manhunt Harvest: Collected ${blood} liters of blood, ${goldVal.toFixed(2)} gold, and ${expVal} XP.`,
              timestamp: new Date().toISOString(),
            });
          } else if (matchesAnyPattern(huntHtml, MG_TEXT.HUNT_NOTHING)) {
            logs.push({
              type: "MANHUNT",
              message: "Manhunt result: The shadows yielded nothing this time.",
              timestamp: new Date().toISOString(),
            });
          }
        }

        pvpCooldown = extractCooldownTimer(huntHtml);

        // Detect specific cooldown reason from hunt page content
        if (pvpCooldown > 0 && !cooldownReason) {
          cooldownReason = detectCooldownReason(huntHtml);
        }

        if (pvpCooldown <= 0) {
          const humanLimitReached = matchesAnyPattern(
            huntHtml,
            MG_TEXT.HUNT_LIMIT,
          );

          if (pvpCooldown <= 0 && humanLimitReached) {
            if (settings.manual_pvp && pvpTargetList.length > 0) {
              const attemptedTargets: string[] = [];
              let manualAttackSucceeded = false;

              for (let index = 0; index < pvpTargetList.length; index += 1) {
                const rival = pvpTargetList[index];
                attemptedTargets.push(rival.rivalGameId);

                const battleRes = await fetch(huntPageUrl, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Cookie: getCookieString(),
                    "User-Agent": userAgent,
                  },
                  body: new URLSearchParams({
                    ac: MG_ACTIONS.RAID,
                    sac: MG_PARAMS.PVP_ATTACK_SAC,
                    gegnerid: rival.rivalGameId,
                  }),
                });
                const battleHtml = await battleRes.text();

                const notFound = matchesAnyPattern(
                  battleHtml,
                  MG_TEXT.NOT_FOUND,
                );
                const hasBattleResult =
                  battleHtml.includes("headerRowCWinner") ||
                  MG_REGEX.LOOT_XP.test(battleHtml);

                if (notFound) {
                  logs.push({
                    type: "INFO",
                    message: `Manual PvP: Rival ${rival.rivalName} was not found. Trying next target.`,
                    timestamp: new Date().toISOString(),
                  });
                  continue;
                }

                if (!hasBattleResult) {
                  logs.push({
                    type: "INFO",
                    message: `Manual PvP: Rival ${rival.rivalName} could not be attacked. Trying next target.`,
                    timestamp: new Date().toISOString(),
                  });
                  continue;
                }

                const battleResult = parseBattleResult(battleHtml);
                const textCooldownPvP = parseTimeFromText(battleHtml);
                pvpCooldown =
                  textCooldownPvP ?? (extractCooldownTimer(battleHtml) || 900);
                cooldownReason = "PvP battle recovery";

                logs.push({
                  type: "BATTLE",
                  message: `Manual PvP: ${battleResult.isWinner ? "VICTORY" : "DEFEAT"} vs ${rival.rivalName}. Loot: ${battleResult.goldLooted.toFixed(2)} gold, ${battleResult.xpEarned} XP.`,
                  timestamp: new Date().toISOString(),
                });
                pvpResults.push({
                  rivalName: rival.rivalName,
                  rivalGameId: rival.rivalGameId,
                  rivalRace: undefined,
                  isWinner: battleResult.isWinner,
                  goldLooted: battleResult.goldLooted,
                  xpEarned: battleResult.xpEarned,
                  timestamp: new Date().toISOString(),
                });
                manualPvpStatus = {
                  currentTargetId: rival.rivalGameId,
                  currentTargetName: rival.rivalName,
                  targetIndex: index + 1,
                  totalTargets: pvpTargetList.length,
                  attempted: attemptedTargets,
                };
                manualAttackSucceeded = true;
                break;
              }

              if (!manualAttackSucceeded) {
                logs.push({
                  type: "INFO",
                  message:
                    "Manual PvP: All targets in the win list were unavailable.",
                  timestamp: new Date().toISOString(),
                });
              }
            } else if (settings.pvp_attack) {
              const pvpSearchPayload = new URLSearchParams({
                ac: MG_ACTIONS.RAID,
                sac: MG_PARAMS.PVP_SEARCH_SAC,
                [MG_PARAMS.SEARCH_NAME]: settings.pvp_target_name || "",
                [MG_PARAMS.SEARCH_OPT]:
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
                matchesAnyPattern(searchHtml, MG_TEXT.NOT_FOUND) ||
                searchHtml.includes("no character matches")
              ) {
                logs.push({
                  type: "BATTLE",
                  message:
                    "PvP Ritual: Rival eluded our sight. Try increasing Dexterity or retry next cycle.",
                  timestamp: new Date().toISOString(),
                });
              } else {
                const gegnerIdMatch = searchHtml.match(MG_REGEX.OPPONENT_ID);
                const rivalLinkMatch = searchHtml.match(MG_REGEX.RIVAL_LINK);
                const rivalNameMatch = rivalLinkMatch
                  ? [rivalLinkMatch[2]]
                  : searchHtml.match(
                      /<div class="headerRow">(?:Hombre Lobo|Vampiro|Vampira|Werwolf|Werewolf)\s+([^<]+)<\/div>/i,
                    ) ||
                    searchHtml.match(
                      /sac=info&amp;id=\d+[^>]*>([^<]+)<\/a>/i,
                    ) ||
                    searchHtml.match(
                      /<h3>(?:versus|contra|contra\s+)\s*([^<]+)<\/h3>/i,
                    );
                const rivalRaceMatch = searchHtml.match(
                  /<div class="headerRow">(Hombre Lobo|Vampiro|Vampira|Werwolf|Werewolf)/i,
                );
                const rivalRace = rivalRaceMatch
                  ? rivalRaceMatch[1]
                  : undefined;
                let rivalName = rivalNameMatch?.[1]?.trim();

                if (!rivalName && gegnerIdMatch) {
                  try {
                    const profileUrl = buildUrl(
                      server,
                      `${MG_ROUTES.PROFILE}&showuserid=${gegnerIdMatch[1]}`,
                    );
                    const profileRes = await fetch(profileUrl, {
                      headers: {
                        Cookie: getCookieString(),
                        "User-Agent": userAgent,
                      },
                    });
                    const profileHtml = await profileRes.text();
                    const profileNameMatch =
                      profileHtml.match(MG_REGEX.PROFILE_NAME) ||
                      profileHtml.match(MG_REGEX.RIVAL_LINK) ||
                      profileHtml.match(
                        /sac=info&(?:amp;)?id=\d+[^>]*>([^<]+)<\/a>/i,
                      );
                    rivalName = profileNameMatch?.[1]?.trim();
                    if (!rivalName) {
                      rivalName = `Rival#${gegnerIdMatch[1]}`;
                    }
                  } catch {
                    rivalName = `Rival#${gegnerIdMatch[1]}`;
                  }
                }

                const resolvedRivalName = rivalName || "Unknown Rival";

                if (gegnerIdMatch) {
                  const battleRes = await fetch(huntPageUrl, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/x-www-form-urlencoded",
                      Cookie: getCookieString(),
                      "User-Agent": userAgent,
                    },
                    body: new URLSearchParams({
                      ac: MG_ACTIONS.RAID,
                      sac: MG_PARAMS.PVP_ATTACK_SAC,
                      gegnerid: gegnerIdMatch[1],
                    }),
                  });
                  const battleHtml = await battleRes.text();

                  const battleResult = parseBattleResult(battleHtml);

                  const textCooldownPvP = parseTimeFromText(battleHtml);
                  pvpCooldown =
                    textCooldownPvP ??
                    (extractCooldownTimer(battleHtml) || 900);
                  cooldownReason = "PvP battle recovery";
                  logs.push({
                    type: "BATTLE",
                    message: `PvP Ritual: ${battleResult.isWinner ? "VICTORY" : "DEFEAT"} vs ${resolvedRivalName}. Loot: ${battleResult.goldLooted.toFixed(2)} gold, ${battleResult.xpEarned} XP.`,
                    timestamp: new Date().toISOString(),
                  });
                  pvpResults.push({
                    rivalName: resolvedRivalName,
                    rivalGameId: gegnerIdMatch[1],
                    rivalRace,
                    isWinner: battleResult.isWinner,
                    goldLooted: battleResult.goldLooted,
                    xpEarned: battleResult.xpEarned,
                    timestamp: new Date().toISOString(),
                  });
                }
              }
            }
          } else if (settings.auto_manhunt && !humanLimitReached) {
            const minutes = parseInt(settings.manhunt_duration || "10");
            const seconds = minutes * 60;
            const mPayload = new URLSearchParams({
              ac: MG_ACTIONS.RAID,
              sac: MG_PARAMS.MANHUNT_SAC,
              [MG_PARAMS.MANHUNT_TIME]: seconds.toString(),
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
              textCooldown ?? (extractCooldownTimer(mHtml) || seconds);
            cooldownReason = "Manhunt in progress";
            logs.push({
              type: "MANHUNT",
              message: `Manhunt Ritual: Tracking humans for ${minutes}m. Blood shall flow.`,
              timestamp: new Date().toISOString(),
            });
          }
        }

        if (settings.auto_grotto && pvpCooldown <= 0) {
          const grottoUrl = buildUrl(server, MG_ROUTES.ANCESTRAL);
          const gCheck = await fetch(grottoUrl, {
            headers: { Cookie: getCookieString(), "User-Agent": userAgent },
          });
          const gHtml = await gCheck.text();
          if (!gHtml.includes("misión") && !gHtml.includes("mision")) {
            const diffMap: Record<string, string> = {
              easy: "0",
              medium: "1",
              hard: "2",
            };
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
          const trainingUrl = buildUrl(server, MG_ROUTES.TRAINING);
          const tRes = await fetch(trainingUrl, {
            headers: { Cookie: getCookieString(), "User-Agent": userAgent },
          });
          const tHtml = await tRes.text();
          currentGold = parseEuropeanNumber(
            tHtml.match(MG_REGEX.GOLD_TEXT)?.[1] || currentGold.toString(),
          );

          const availableTrainings = [];
          const trainingEntries = Object.entries(MG_TRAINING) as Array<
            [string, { type: string; label: string }]
          >;

          for (const [settingKey, config] of trainingEntries) {
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
                  cost: parseEuropeanNumber(costMatch[1]),
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

    const finalStatbar = parseStatbar(html);
    const finalAttributes = parseAttributes(html);

    // --- STEP 3: SCRAPE PVP HISTORY FROM MESSAGES ---
    try {
      const messagesUrl = buildUrl(server, MG_ROUTES.MESSAGES_ATTACK);
      const msgRes = await fetch(messagesUrl, {
        headers: { Cookie: getCookieString(), "User-Agent": userAgent },
      });
      const msgHtml = await msgRes.text();

      const fightIdRegex = MG_REGEX.FIGHT_REPORT_LINK;
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
          const reportUrl = buildUrl(
            server,
            `index.php?ac=fightreport&fightid=${fightId}&sac=angriff`,
          );
          const reportRes = await fetch(reportUrl, {
            headers: { Cookie: getCookieString(), "User-Agent": userAgent },
          });
          const reportHtml = await reportRes.text();

          const reportRivalName = reportHtml
            .match(MG_REGEX.PROFILE_LINK_NAME)?.[1]
            ?.trim();
          const reportRivalId = reportHtml.match(
            /sac=info&(?:amp;)?id=(\d+)/i,
          )?.[1];
          const reportResult = parseBattleResult(reportHtml);
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
                isWinner: reportResult.isWinner,
                goldLooted: reportResult.goldLooted,
                xpEarned: reportResult.xpEarned,
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
        level: finalStatbar.level,
        gold: finalStatbar.gold,
        blood: finalStatbar.blood,
        stamina: finalStatbar.stamina,
        maxStamina: finalStatbar.maxStamina,
        experience: finalStatbar.experience,
        nextLevelExp: finalStatbar.nextLevelExp,
        skillAverage: finalStatbar.skillAverage,
        attributes: finalAttributes,
      },
      logs,
      pvpCooldown,
      cooldownReason,
      pvpResults,
      manualPvpStatus,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      race: "Vampire",
      pvpCooldown: 0,
      stats: {
        level: 0,
        gold: 0,
        blood: 0,
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
          message: `Ritual Error: ${message}`,
          timestamp: new Date().toISOString(),
        },
      ],
      pvpResults,
      manualPvpStatus,
    };
  }
}

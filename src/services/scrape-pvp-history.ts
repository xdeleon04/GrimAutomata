"use server";

import { decrypt } from "@/services/crypto";
import { authenticateMoonId } from "./monsters-game";
import {
  MG_REGEX,
  MG_ROUTES,
  buildUrl,
  parseEuropeanNumber,
  parseBattleResult,
} from "./mg-selectors";
import type { PvpOutcome } from "./mg-selectors";

export interface ScrapedPvpResult {
  fightId: string;
  rivalName: string;
  rivalGameId: string;
  rivalRace?: string;
  result?: PvpOutcome;
  isWinner: boolean;
  goldLooted: number;
  xpEarned: number;
  timestamp: string;
}

/**
 * Entry parsed from the messages listing page.
 */
interface MessageListEntry {
  fightId: string;
  rivalName: string;
  rivalGameId: string;
  date: string;
  winnerName: string;
  gold: number;
}

/**
 * Parse fight entries from a messages listing page HTML.
 * Each row: date | rival link (showuserid) | winner name | gold | report link (fightid)
 */
function parseMessageListPage(html: string): MessageListEntry[] {
  const entries: MessageListEntry[] = [];

  // Match each table row that contains a fight report link
  const rowRegex = MG_REGEX.MESSAGE_LIST_ROW;

  let match: RegExpExecArray | null;
  while ((match = rowRegex.exec(html)) !== null) {
    entries.push({
      date: match[1].trim(),
      rivalGameId: match[2],
      rivalName: match[3].trim(),
      winnerName: match[4].trim(),
      gold: parseEuropeanNumber(match[5]),
      fightId: match[6],
    });
  }

  return entries;
}

/**
 * Scrapes PvP battle history from MonstersGame attack messages.
 *
 * 1. Authenticates via MoonID
 * 2. Paginates through all attack messages (count=0, count=10, count=20...)
 * 3. For each fight, fetches the detailed report to get accurate win/loss, gold, XP, rival race
 */
export async function scrapePvpHistory(
  username: string,
  encryptedPassword: string,
  server: string,
): Promise<ScrapedPvpResult[]> {
  const decryptedPassword = encryptedPassword
    ? await decrypt(encryptedPassword)
    : "";

  const { getCookieString, userAgent } = await authenticateMoonId(
    username,
    decryptedPassword,
  );

  // --- STEP 1: Paginate through all attack messages ---
  const allListEntries: MessageListEntry[] = [];
  const seenFightIds = new Set<string>();
  let countOffset = 0;
  const MAX_PAGES = 50; // Safety limit

  for (let page = 0; page < MAX_PAGES; page++) {
    const listUrl = buildUrl(
      server,
      `${MG_ROUTES.MESSAGES_ATTACK}&count=${countOffset}`,
    );
    const listRes = await fetch(listUrl, {
      headers: { Cookie: getCookieString(), "User-Agent": userAgent },
    });
    const listHtml = await listRes.text();

    const pageEntries = parseMessageListPage(listHtml);

    // Add entries we haven't seen yet
    let newOnThisPage = 0;
    for (const entry of pageEntries) {
      if (!seenFightIds.has(entry.fightId)) {
        seenFightIds.add(entry.fightId);
        allListEntries.push(entry);
        newOnThisPage++;
      }
    }

    // Check if there's a next page link
    const hasNextPage = listHtml.includes(`count=${countOffset + 10}`);

    if (newOnThisPage === 0 || !hasNextPage) {
      break;
    }

    countOffset += 10;
  }

  if (allListEntries.length === 0) {
    return [];
  }

  // --- STEP 2: Fetch each fight report for detailed data ---
  const results: ScrapedPvpResult[] = [];

  for (const entry of allListEntries) {
    try {
      const reportUrl = buildUrl(
        server,
        `index.php?ac=fightreport&fightid=${entry.fightId}&sac=angriff`,
      );
      const reportRes = await fetch(reportUrl, {
        headers: { Cookie: getCookieString(), "User-Agent": userAgent },
      });
      const reportHtml = await reportRes.text();

      // Use centralized parseBattleResult for win/loss/draw detection
      const battleResult = parseBattleResult(reportHtml);

      // Parse both players from the "tdh" vs row for rival metadata
      const vsMatch = reportHtml.match(MG_REGEX.FIGHT_VS_ROW);

      let rivalName = entry.rivalName;
      let rivalRace = "";

      if (vsMatch) {
        rivalRace = vsMatch[3].trim();
        rivalName = vsMatch[4].trim();
      }

      // For non-draw battles, use per-character gold/XP parsing
      let goldLooted = battleResult.goldLooted;
      let xpEarned = battleResult.xpEarned;

      // For losses/draws, the winner's gold belongs to the opponent
      if (battleResult.result !== "WIN") {
        goldLooted = 0;
      }

      // Parse XP for our character specifically
      let ourName = "";
      if (vsMatch) {
        ourName = vsMatch[2].trim();
      }
      if (ourName && battleResult.result !== "DRAW") {
        const escapedName = ourName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const xpRegex = new RegExp(
          `A\\s+${escapedName}\\s+le han sido sumados\\s+([\\d,.]+)\\s+punto`,
          "i",
        );
        const xpMatch = reportHtml.match(xpRegex);
        xpEarned = parseEuropeanNumber(xpMatch?.[1] || "0");
      } else if (battleResult.result === "DRAW") {
        xpEarned = 0;
      }

      // Parse timestamp from report header
      const timestampMatch = reportHtml.match(MG_REGEX.FIGHT_TIMESTAMP);
      let timestamp = new Date().toISOString();
      if (timestampMatch) {
        const [day, month, year] = timestampMatch[1].split(".");
        timestamp = new Date(
          `${year}-${month}-${day}T${timestampMatch[2]}`,
        ).toISOString();
      }

      results.push({
        fightId: entry.fightId,
        rivalName,
        rivalGameId: entry.rivalGameId,
        rivalRace,
        result: battleResult.result,
        isWinner: battleResult.isWinner,
        goldLooted,
        xpEarned,
        timestamp,
      });
    } catch {
      // Skip individual report errors, continue with next
      continue;
    }
  }

  return results;
}

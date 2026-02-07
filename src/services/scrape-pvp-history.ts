"use server";

import { decrypt } from "@/services/crypto";

export interface ScrapedPvpResult {
  fightId: string;
  rivalName: string;
  rivalGameId: string;
  rivalRace?: string;
  isWinner: boolean;
  goldLooted: number;
  xpEarned: number;
  timestamp: string;
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
  const rowRegex = /<tr>\s*<td>\s*del dia\s+(.+?)<\/td>\s*<td><a\s+href="index\.php\?ac=showuser&(?:amp;)?showuserid=(\d+)">([^<]+)<\/a><\/td>\s*<td>([^<]*)<\/td>\s*<td>([\d,.]+)\s*<img[^>]+alt=["']Oro["'][^>]*><\/td>\s*<td><a\s+href="index\.php\?ac=fightreport&(?:amp;)?fightid=(\d+)&(?:amp;)?sac=angriff">/gi;

  let match: RegExpExecArray | null;
  while ((match = rowRegex.exec(html)) !== null) {
    entries.push({
      date: match[1].trim(),
      rivalGameId: match[2],
      rivalName: match[3].trim(),
      winnerName: match[4].trim(),
      gold: parseMGNumber(match[5]),
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

  const cookies: Map<string, string> = new Map();
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

  const getCookieString = () =>
    Array.from(cookies.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");

  const updateCookies = (setCookieHeaders: string[] | null) => {
    if (!setCookieHeaders) return;
    setCookieHeaders.forEach((header) => {
      const part = header.split(";")[0];
      const [key, ...valParts] = part.split("=");
      if (key) cookies.set(key.trim(), valParts.join("="));
    });
  };

  // --- AUTH: MoonID login + redirect chain ---
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
    username,
    password: decryptedPassword,
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
    if (currentUrl.startsWith("/")) {
      currentUrl = `https://moonid.net${currentUrl}`;
    }
    const res = await fetch(currentUrl, {
      headers: { Cookie: getCookieString(), "User-Agent": userAgent },
      redirect: "manual",
    });
    updateCookies(res.headers.getSetCookie());
    currentUrl = res.headers.get("Location");
  }

  // --- STEP 1: Paginate through all attack messages ---
  const allListEntries: MessageListEntry[] = [];
  const seenFightIds = new Set<string>();
  let countOffset = 0;
  const MAX_PAGES = 20; // Safety limit

  for (let page = 0; page < MAX_PAGES; page++) {
    const listUrl = `https://${server}/index.php?ac=nachrichten&sac=angriff&count=${countOffset}`;
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
      const reportUrl = `https://${server}/index.php?ac=fightreport&fightid=${entry.fightId}&sac=angriff`;
      const reportRes = await fetch(reportUrl, {
        headers: { Cookie: getCookieString(), "User-Agent": userAgent },
      });
      const reportHtml = await reportRes.text();

      // Parse winner name from header
      const winnerMatch = reportHtml.match(
        /class="headerRowCWinner"[^>]*>Vencedor\/a:\s*([^<]+)</i,
      );
      const winnerName = winnerMatch ? winnerMatch[1].trim() : "";

      // Parse both players from the "tdh" vs row
      // Left side = our character, Right side = rival
      const vsMatch = reportHtml.match(
        /class="tdh"[^>]*>(Vampiro|Vampira|Hombre Lobo)\s+([^<]+)<\/td>\s*<td[^>]*>vs\.\s*<\/td>\s*<td[^>]*class="tdh"[^>]*>(Vampiro|Vampira|Hombre Lobo)\s+([^<]+)<\/td>/i,
      );

      let ourName = "";
      let rivalName = entry.rivalName;
      let rivalRace = "";

      if (vsMatch) {
        ourName = vsMatch[2].trim();
        rivalRace = vsMatch[3].trim();
        rivalName = vsMatch[4].trim();
      }

      // Determine win/loss
      const isWinner = winnerName !== "" && ourName !== "" && winnerName === ourName;

      // Parse gold: "Ha conseguido N <img...alt='Oro'>" - this is what the WINNER got
      const goldMatch = reportHtml.match(
        /Ha conseguido\s+([\d,.]+)\s*<img[^>]+alt=["']Oro["']/i,
      );
      const winnerGold = parseMGNumber(goldMatch?.[1] || "0");
      const goldLooted = isWinner ? winnerGold : 0;

      // Parse XP for our character
      // Pattern: "A OURNAME le han sido sumados N punto(s) de experiencia"
      let xpEarned = 0;
      if (ourName) {
        const escapedName = ourName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const xpRegex = new RegExp(
          `A\\s+${escapedName}\\s+le han sido sumados\\s+([\\d,.]+)\\s+punto`,
          "i",
        );
        const xpMatch = reportHtml.match(xpRegex);
        xpEarned = parseMGNumber(xpMatch?.[1] || "0");
      }

      // Parse timestamp from report header
      const timestampMatch = reportHtml.match(
        /(?:del dia|del día)\s+(\d{2}\.\d{2}\.\d{4})\s+a las\s+(\d{2}:\d{2}:\d{2})/i,
      );
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
        isWinner,
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

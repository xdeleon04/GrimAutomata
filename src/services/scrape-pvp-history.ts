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

  const fightIdRegex =
    /ac=fightreport&(?:amp;)?fightid=(\d+)&(?:amp;)?sac=angriff/gi;
  const baseMessagesUrl = `https://${server}/index.php?ac=nachrichten&sac=angriff`;
  const seenOffsets = new Set<number>();
  const pendingOffsets: number[] = [0];
  const seenFightIds = new Set<string>();

  while (pendingOffsets.length > 0) {
    const offset = pendingOffsets.shift();
    if (offset === undefined || seenOffsets.has(offset)) continue;
    seenOffsets.add(offset);

    const pageUrl = offset > 0 ? `${baseMessagesUrl}&s=${offset}` : baseMessagesUrl;
    const pageRes = await fetch(pageUrl, {
      headers: { Cookie: getCookieString(), "User-Agent": userAgent },
    });
    const pageHtml = await pageRes.text();

    const offsetRegex = /(?:[?&]|&amp;)s=(\d+)/gi;
    let offsetMatch: RegExpExecArray | null;
    while ((offsetMatch = offsetRegex.exec(pageHtml)) !== null) {
      const nextOffset = parseInt(offsetMatch[1]);
      if (!Number.isNaN(nextOffset) && !seenOffsets.has(nextOffset)) {
        pendingOffsets.push(nextOffset);
      }
    }

    fightIdRegex.lastIndex = 0;
    const pageFightIds: string[] = [];
    let fightMatch: RegExpExecArray | null;
    while ((fightMatch = fightIdRegex.exec(pageHtml)) !== null) {
      pageFightIds.push(fightMatch[1]);
    }

    const newFightIds = pageFightIds.filter((id) => !seenFightIds.has(id));
    newFightIds.forEach((id) => seenFightIds.add(id));

    if (newFightIds.length === 0) {
      break;
    }
  }

  const results: ScrapedPvpResult[] = [];
  const fightIds = Array.from(seenFightIds);

  for (const fightId of fightIds) {
    try {
      const reportUrl = `https://${server}/index.php?ac=fightreport&fightid=${fightId}&sac=angriff`;
      const reportRes = await fetch(reportUrl, {
        headers: { Cookie: getCookieString(), "User-Agent": userAgent },
      });
      const reportHtml = await reportRes.text();

      const rivalName = reportHtml
        .match(/sac=info&(?:amp;)?id=\d+[^>]*>([^<]+)<\/a>/i)?.[1]
        ?.trim();
      const rivalGameId = reportHtml.match(/sac=info&(?:amp;)?id=(\d+)/i)?.[1];
      const isWinner =
        reportHtml.includes("headerRowCWinner") || reportHtml.includes("ganado");
      const goldLooted = parseMGNumber(
        reportHtml.match(
          /Ha conseguido ([\d,.]+)\s*<img[^>]+alt=["']Oro["']/i,
        )?.[1] || "0",
      );
      const xpEarned = parseMGNumber(
        reportHtml.match(
          /([\d,.]+)\s+(?:experience\s+points|punto\(?s?\)?\s+de\s+experiencia|puntos\s+de\s+experiencia|experiencia|puntos\s+de\s+exp|experience)/i,
        )?.[1] || "0",
      );
      const rivalRace = reportHtml.match(
        /<div class="headerRow[^"]*">(Hombre Lobo|Vampiro|Vampira|Werwolf|Werewolf)/i,
      )?.[1];

      if (!rivalName || !rivalGameId) continue;

      results.push({
        fightId,
        rivalName,
        rivalGameId,
        rivalRace,
        isWinner,
        goldLooted,
        xpEarned,
        timestamp: new Date().toISOString(),
      });
    } catch {
      continue;
    }
  }

  return results;
}

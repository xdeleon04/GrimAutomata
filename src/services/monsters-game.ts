/**
 * @fileOverview Service for interacting with MonstersGame via MoonID.
 * Handles authentication, cookie persistence, and HTML scraping from the game realm.
 */

export interface MonstersGameStats {
  race: 'Vampire' | 'Werewolf';
  logs: Array<{
    type: 'INFO' | 'BATTLE' | 'TRAINING' | 'LOOT' | 'ERROR' | 'MANHUNT' | 'MISSION';
    message: string;
    timestamp: string;
  }>;
  stats: {
    level: number;
    gold: number;
    stamina: number;
    experience: number;
    nextLevelExp: number;
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
 * Fetches real data from the MonstersGame server by simulating a browser session.
 */
export async function fetchMonstersGameData(
  username: string, 
  password: string, 
  server: string
): Promise<MonstersGameStats | null> {
  try {
    const cookies: string[] = [];

    // 1. Authenticate with MoonID
    // The MoonID login typically involves a POST request to the login endpoint
    const loginResponse = await fetch('https://moonid.net/api/account/connect/83/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GrimAutomata/4.2.0',
      },
      body: new URLSearchParams({
        username: username,
        password: password,
      }),
      redirect: 'manual'
    });

    // Capture cookies from the login response
    const setCookies = loginResponse.headers.getSetCookie();
    cookies.push(...setCookies.map(c => c.split(';')[0]));

    // 2. Connect to the specific game server
    // After MoonID auth, we usually get a redirect or a session token to pass to the game realm
    const realmUrl = `https://${server}/index.php?ac=status`;
    const statusResponse = await fetch(realmUrl, {
      headers: {
        'Cookie': cookies.join('; '),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GrimAutomata/4.2.0',
      }
    });

    const html = await statusResponse.text();

    // 3. Extract Stats using Regex
    // MonstersGame uses a classic table-based layout. We parse values based on standard labels.
    const extract = (regex: RegExp, content: string) => {
      const match = content.match(regex);
      return match ? match[1].replace(/[.,]/g, '') : '0';
    };

    const level = parseInt(extract(/Level:<\/td><td>(\d+)/, html));
    const gold = parseInt(extract(/Gold:<\/td><td>([\d,.]+)/, html));
    const experience = parseInt(extract(/Experience:<\/td><td>([\d,.]+)/, html));
    const nextLevelExp = parseInt(extract(/\/ ([\d,.]+)/, html)) || (experience + 500);
    const stamina = parseInt(extract(/Stamina:<\/td><td>(\d+)/, html)) || 100;

    // Attributes
    const str = parseInt(extract(/Strength:<\/td><td>(\d+)/, html));
    const def = parseInt(extract(/Defense:<\/td><td>(\d+)/, html));
    const dex = parseInt(extract(/Dexterity:<\/td><td>(\d+)/, html));
    const agi = parseInt(extract(/Agility:<\/td><td>(\d+)/, html));
    const con = parseInt(extract(/Constitution:<\/td><td>(\d+)/, html));

    // Determine Race
    const race: 'Vampire' | 'Werewolf' = html.includes('vampire') ? 'Vampire' : 'Werewolf';

    // 4. Fetch Logs/Messages
    const logUrl = `https://${server}/index.php?ac=msg`;
    const logResponse = await fetch(logUrl, {
      headers: {
        'Cookie': cookies.join('; '),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GrimAutomata/4.2.0',
      }
    });
    const logHtml = await logResponse.text();

    // Simple parser for messages (usually in <div class="msg"> or tables)
    const logs: MonstersGameStats['logs'] = [];
    const logMatches = logHtml.matchAll(/<div class="msg_title">(.*?)<\/div>.*?<div class="msg_content">(.*?)<\/div>/gs);
    
    for (const match of logMatches) {
      logs.push({
        type: match[1].includes('Battle') ? 'BATTLE' : 'INFO',
        message: match[2].replace(/<[^>]*>/g, '').trim(),
        timestamp: new Date().toISOString(),
      });
    }

    // Default log if empty
    if (logs.length === 0) {
      logs.push({
        type: 'INFO',
        message: `Realm scanning complete. Level ${level} ${race} detected.`,
        timestamp: new Date().toISOString()
      });
    }

    return {
      race,
      stats: {
        level,
        gold,
        stamina,
        experience,
        nextLevelExp,
        attributes: {
          strength: str || 10,
          defense: def || 10,
          dexterity: dex || 10,
          agility: agi || 10,
          constitution: con || 10,
        }
      },
      logs
    };
  } catch (error) {
    console.error('Scraping Error:', error);
    return null;
  }
}

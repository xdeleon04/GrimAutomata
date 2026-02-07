"use client";

import { useMemo, useState } from "react";
import { Users, Swords, Coins, TrendingUp, RefreshCw, Loader2 } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";

import { usePvPVictories, useCredentials } from "@/components/dashboard/DashboardDataProvider";
import { useUser, useFirestore } from "@/firebase";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { scrapePvpHistory } from "@/services/scrape-pvp-history";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PvPSummaryStats {
  uniqueOpponents: number;
  totalWins: number;
  totalLosses: number;
  totalGold: number;
  totalXp: number;
}

export default function PvPOverview() {
  const { data: victoryDocs } = usePvPVictories();
  const { data: credentialsDoc } = useCredentials();
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const stats: PvPSummaryStats = useMemo(() => {
    if (!victoryDocs) {
      return {
        uniqueOpponents: 0,
        totalWins: 0,
        totalLosses: 0,
        totalGold: 0,
        totalXp: 0,
      };
    }

    return victoryDocs.reduce(
      (acc, rival) => {
        return {
          uniqueOpponents: acc.uniqueOpponents + 1,
          totalWins: acc.totalWins + (rival.wins || 0),
          totalLosses: acc.totalLosses + (rival.losses || 0),
          totalGold: acc.totalGold + (rival.totalGoldLooted || 0),
          totalXp: acc.totalXp + (rival.totalXpEarned || 0),
        };
      },
      {
        uniqueOpponents: 0,
        totalWins: 0,
        totalLosses: 0,
        totalGold: 0,
        totalXp: 0,
      } as PvPSummaryStats
    );
  }, [victoryDocs]);

  const handleSync = async () => {
    if (!user || !db || !credentialsDoc) return;

    if (!credentialsDoc?.moonIdUsername || !credentialsDoc?.encryptedMoonIdPassword || !credentialsDoc?.description) {
      toast({
        title: "Missing Credentials",
        description: "Please configure your MoonID credentials first.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    setSyncStatus(null);

    try {
      // 1. Scrape all battles from messages
      const scrapedBattles = await scrapePvpHistory(
        credentialsDoc.moonIdUsername,
        credentialsDoc.encryptedMoonIdPassword,
        credentialsDoc.description
      );

      if (scrapedBattles.length === 0) {
        setSyncStatus("No battles found in recent messages.");
        setIsSyncing(false);
        return;
      }

      // 2. Group scraped battles by rival
      const battlesByRival = new Map<string, typeof scrapedBattles>();
      for (const battle of scrapedBattles) {
        const existing = battlesByRival.get(battle.rivalGameId) || [];
        existing.push(battle);
        battlesByRival.set(battle.rivalGameId, existing);
      }

      // 3. For each rival, check Firestore for already-synced fightIds
      let totalNew = 0;
      let rivalsUpdated = 0;

      for (const [rivalGameId, battles] of battlesByRival) {
        const rivalDocRef = doc(db, "users", user.uid, "pvpVictories", rivalGameId);
        const existingSnap = await getDoc(rivalDocRef);
        const existingData = existingSnap.exists() ? existingSnap.data() : null;

        // Get the set of already-synced fight IDs from this rival's doc
        const alreadySynced = new Set<string>(existingData?.syncedFightIds || []);
        const updatedFightIds = new Set<string>(alreadySynced);

        // Filter to only truly new battles
        const newBattles = battles.filter(b => !alreadySynced.has(b.fightId));

        if (newBattles.length === 0) continue;

        // Aggregate new stats
        let newWins = 0;
        let newLosses = 0;
        let newGold = 0;
        let newXp = 0;

        for (const battle of newBattles) {
          if (battle.isWinner) newWins++;
          else newLosses++;
          newGold += battle.goldLooted;
          newXp += battle.xpEarned;
          updatedFightIds.add(battle.fightId);
        }

        const lastBattle = newBattles[newBattles.length - 1];
        const updates = {
          id: rivalGameId,
          rivalName: lastBattle.rivalName,
          rivalGameId: rivalGameId,
          rivalRace: lastBattle.rivalRace || existingData?.rivalRace || "",
          wins: (existingData?.wins || 0) + newWins,
          losses: (existingData?.losses || 0) + newLosses,
          totalGoldLooted: (existingData?.totalGoldLooted || 0) + newGold,
          totalXpEarned: (existingData?.totalXpEarned || 0) + newXp,
          lastBattleDate: lastBattle.timestamp,
          lastResult: lastBattle.isWinner ? "WIN" : "LOSS",
          syncedFightIds: Array.from(updatedFightIds),
        };

        setDocumentNonBlocking(rivalDocRef, updates, { merge: true });
        totalNew += newBattles.length;
        rivalsUpdated++;
      }

      if (totalNew === 0) {
        setSyncStatus("No new battles found in recent messages.");
      } else {
        setSyncStatus(`Synced ${totalNew} new battles from ${rivalsUpdated} opponents.`);
        toast({
          title: "Sync Complete",
          description: `Added ${totalNew} battles.`,
        });
      }
    } catch (error) {
      console.error("PvP Sync Error:", error);
      toast({
        title: "Sync Failed",
        description: "Could not retrieve battle history.",
        variant: "destructive",
      });
      setSyncStatus("Sync failed. Check logs.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Unique Opponents */}
        <div className="bg-card/30 border border-border/30 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Rivals</span>
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            {stats.uniqueOpponents.toLocaleString()}
          </div>
        </div>

        {/* W/L Ratio */}
        <div className="bg-card/30 border border-border/30 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Swords className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Win / Loss</span>
          </div>
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-2xl font-bold text-accent">{stats.totalWins}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-xl font-bold text-red-500">{stats.totalLosses}</span>
          </div>
        </div>

        {/* Gold Plundered */}
        <div className="bg-card/30 border border-border/30 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Coins className="h-4 w-4 text-[#d4af37]" />
            <span className="text-xs font-medium uppercase tracking-wider">Gold Looted</span>
          </div>
          <div className="text-2xl font-bold font-mono text-[#d4af37]">
            {stats.totalGold.toLocaleString()}
          </div>
        </div>

        {/* XP Harvested */}
        <div className="bg-card/30 border border-border/30 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">XP Gained</span>
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            {stats.totalXp.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Sync Action */}
      <div className="flex flex-col items-start gap-2">
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={isSyncing}
          className="bg-accent/10 border-accent/30 hover:bg-accent/20 text-accent gap-2"
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {isSyncing ? "Syncing..." : "Sync from Messages"}
        </Button>

        {syncStatus && (
          <p className="text-xs text-muted-foreground animate-in fade-in slide-in-from-top-1">
            {syncStatus}
          </p>
        )}
      </div>
    </div>
  );
}

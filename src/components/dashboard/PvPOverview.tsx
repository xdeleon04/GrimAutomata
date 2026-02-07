"use client";

import { useMemo, useState } from "react";
import { Users, Swords, Coins, TrendingUp, RefreshCw, Loader2 } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";

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
      // 1. Fetch synced meta
      const syncMetaRef = doc(db, "users", user.uid, "pvpVictories", "_syncMeta");
      const syncMetaSnap = await getDoc(syncMetaRef);
      const syncedFightIds = new Set<string>(syncMetaSnap.exists() ? syncMetaSnap.data()?.syncedFightIds || [] : []);

      // 2. Scrape data
      const scrapedBattles = await scrapePvpHistory(
        credentialsDoc.moonIdUsername,
        credentialsDoc.encryptedMoonIdPassword,
        credentialsDoc.description
      );

      // 3. Filter new battles
      const newBattles = scrapedBattles.filter(b => !syncedFightIds.has(b.fightId));

      if (newBattles.length === 0) {
        setSyncStatus("No new battles found in recent messages.");
        setIsSyncing(false);
        return;
      }

      // 4. Update Firestore for each new battle using non-blocking writes
      let newOpponentsCount = 0;
      const rivalsUpdated = new Set<string>();

      for (const battle of newBattles) {
        const rivalDocRef = doc(db, "users", user.uid, "pvpVictories", battle.rivalGameId);

        // We need to read the current state to merge correctly
        // Note: In a high-concurrency scenario, this read-then-write might race, but for a single user client it's acceptable
        const existingSnap = await getDoc(rivalDocRef);
        const existingData = existingSnap.exists() ? existingSnap.data() : null;

        if (!existingSnap.exists()) {
          newOpponentsCount++;
        }
        rivalsUpdated.add(battle.rivalGameId);

        const updates = {
          id: battle.rivalGameId,
          rivalName: battle.rivalName,
          rivalGameId: battle.rivalGameId,
          rivalRace: battle.rivalRace || existingData?.rivalRace || "",
          wins: (existingData?.wins || 0) + (battle.isWinner ? 1 : 0),
          losses: (existingData?.losses || 0) + (battle.isWinner ? 0 : 1),
          totalGoldLooted: (existingData?.totalGoldLooted || 0) + battle.goldLooted,
          totalXpEarned: (existingData?.totalXpEarned || 0) + battle.xpEarned,
          lastBattleDate: battle.timestamp, // Assuming latest; could act smarter here but naive for now
          lastResult: battle.isWinner ? "WIN" : "LOSS",
        };

        setDocumentNonBlocking(rivalDocRef, updates, { merge: true });
        syncedFightIds.add(battle.fightId);
      }

      // 5. Update sync meta
      // We use setDoc here to await completion ensuring the IDs are saved before we say "Done"
      await setDoc(syncMetaRef, {
        syncedFightIds: Array.from(syncedFightIds)
      }, { merge: true });

      setSyncStatus(`Synced ${newBattles.length} new battles from ${rivalsUpdated.size} opponents.`);
      toast({
        title: "Sync Complete",
        description: `Added ${newBattles.length} battles.`,
      });

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

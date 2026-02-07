"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  useUser,
  useFirestore,
  useMemoFirebase,
  setDocumentNonBlocking,
} from "@/firebase";
import { doc, collection, serverTimestamp, getDoc } from "firebase/firestore";
import { syncMoonId } from "@/ai/flows/moon-id-sync-flow";
import {
  useCredentials,
  useAutomationSettings,
  usePvPVictories,
} from "@/components/dashboard/DashboardDataProvider";

export interface AutomationEngineState {
  isRunning: boolean;
  uptime: number;
  isSyncing: boolean;
  debugMode: boolean;
  cooldown: number;
  credentials: any;
  manualPvpStatus: any;
  handleToggle: () => void;
  setDebugMode: (value: boolean) => void;
}

export function useAutomationEngine(): AutomationEngineState {
  const { user } = useUser();
  const db = useFirestore();
  const [isRunning, setIsRunning] = useState(false);
  const [uptime, setUptime] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [manualPvpStatus, setManualPvpStatus] = useState<any>(null);

  const lastSyncRef = useRef<number>(0);
  const isSyncingRef = useRef<boolean>(false);
  const cooldownRef = useRef<number>(0);
  const initialSyncRequiredRef = useRef<boolean>(false);

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user]);

  const { data: credentials } = useCredentials();
  const { data: settings } = useAutomationSettings();
  const { data: pvpRivals } = usePvPVictories();

  const triggerSync = useCallback(async () => {
    if (!user || !db || !credentials || !userDocRef || isSyncingRef.current)
      return;

    isSyncingRef.current = true;
    initialSyncRequiredRef.current = false;
    setIsSyncing(true);
    lastSyncRef.current = Date.now();

    const config: Record<string, any> = {};
    settings?.forEach((s: any) => {
      try {
        config[s.settingName] = JSON.parse(s.settingValue);
      } catch {
        config[s.settingName] = s.settingValue;
      }
    });

    // Build manual PvP target list from stored victories
    const pvpTargetList =
      config.manual_pvp && pvpRivals
        ? pvpRivals.map((r: any) => ({
            rivalGameId: r.rivalGameId,
            rivalName: r.rivalName,
          }))
        : [];

    try {
      const result = await syncMoonId({
        username: credentials.moonIdUsername,
        password: credentials.encryptedMoonIdPassword,
        server: credentials.description || "es1.monstersgame.moonid.net",
        debug: debugMode,
        settings: config,
        pvpTargetList,
      });

      cooldownRef.current = result.pvpCooldown;
      setCooldown(result.pvpCooldown);
      setManualPvpStatus(result.manualPvpStatus || null);

      const updateData: any = {
        id: user.uid,
        race: result.race,
        level: result.stats.level,
        gold: result.stats.gold,
        stamina: result.stats.stamina,
        maxStamina: result.stats.maxStamina,
        experience: result.stats.experience,
        nextLevelExp: result.stats.nextLevelExp,
        skillAverage: result.stats.skillAverage,
        attributes: result.stats.attributes,
        lastSync: serverTimestamp(),
      };

      setDocumentNonBlocking(userDocRef, updateData, { merge: true });

      const logsRef = collection(db, "users", user.uid, "activityLogs");
      result.logs.forEach((log) => {
        const newLogRef = doc(logsRef);
        setDocumentNonBlocking(
          newLogRef,
          {
            id: newLogRef.id,
            userId: user.uid,
            timestamp: log.timestamp,
            logMessage: log.message,
            logLevel: log.type,
          },
          { merge: true },
        );
      });

      if (result.pvpResults?.length > 0) {
        for (const battle of result.pvpResults) {
          const rivalDocRef = doc(
            db,
            "users",
            user.uid,
            "pvpVictories",
            battle.rivalGameId,
          );

          const existing = await getDoc(rivalDocRef);
          const existingData = existing.exists() ? existing.data() : null;

          if (battle.isWinner) {
            setDocumentNonBlocking(
              rivalDocRef,
              {
                id: battle.rivalGameId,
                rivalName: battle.rivalName,
                rivalGameId: battle.rivalGameId,
                rivalRace: battle.rivalRace || existingData?.rivalRace || "",
                wins: (existingData?.wins || 0) + 1,
                losses: existingData?.losses || 0,
                totalGoldLooted:
                  (existingData?.totalGoldLooted || 0) + battle.goldLooted,
                totalXpEarned:
                  (existingData?.totalXpEarned || 0) + battle.xpEarned,
                lastBattleDate: battle.timestamp,
                lastResult: "WIN",
              },
              { merge: true },
            );
          } else {
            setDocumentNonBlocking(
              rivalDocRef,
              {
                id: battle.rivalGameId,
                rivalName: battle.rivalName,
                rivalGameId: battle.rivalGameId,
                rivalRace: battle.rivalRace || existingData?.rivalRace || "",
                wins: existingData?.wins || 0,
                losses: (existingData?.losses || 0) + 1,
                totalGoldLooted: existingData?.totalGoldLooted || 0,
                totalXpEarned: existingData?.totalXpEarned || 0,
                lastBattleDate: battle.timestamp,
                lastResult: "LOSS",
              },
              { merge: true },
            );
          }
        }
      }
    } catch {
      // Handled by FirebaseErrorListener
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [user, db, credentials, userDocRef, settings, debugMode, pvpRivals]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setUptime((prev) => prev + 1);

        let currentCooldown = 0;
        let justFinished = false;

        setCooldown((prev) => {
          currentCooldown = Math.max(0, prev - 1);
          if (prev > 0 && currentCooldown === 0) {
            justFinished = true;
          }
          cooldownRef.current = currentCooldown;
          return currentCooldown;
        });

        const now = Date.now();
        const secondsSinceLastSync =
          lastSyncRef.current === 0
            ? Infinity
            : (now - lastSyncRef.current) / 1000;

        const shouldTrigger =
          initialSyncRequiredRef.current ||
          justFinished ||
          (cooldownRef.current === 0 && secondsSinceLastSync >= 60);

        if (shouldTrigger && !isSyncingRef.current) {
          triggerSync();
        }
      }, 1000);
    } else {
      setUptime(0);
      setCooldown(0);
      cooldownRef.current = 0;
      lastSyncRef.current = 0;
      initialSyncRequiredRef.current = false;
      isSyncingRef.current = false;
    }
    return () => clearInterval(interval);
  }, [isRunning, triggerSync]);

  const handleToggle = () => {
    const nextState = !isRunning;
    if (nextState) {
      initialSyncRequiredRef.current = true;
      lastSyncRef.current = 0;
      isSyncingRef.current = false;
    }
    setIsRunning(nextState);
  };

  return {
    isRunning,
    uptime,
    isSyncing,
    debugMode,
    cooldown,
    credentials,
    manualPvpStatus,
    handleToggle,
    setDebugMode,
  };
}

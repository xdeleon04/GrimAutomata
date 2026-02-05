
"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Power, Play, Square, Activity, ShieldAlert, Swords, Loader2, Bug, BugOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, collection, serverTimestamp } from 'firebase/firestore';
import { syncMoonId } from '@/ai/flows/moon-id-sync-flow';

export function StatusHeader() {
  const { user } = useUser();
  const db = useFirestore();
  const [isRunning, setIsRunning] = useState(false);
  const [uptime, setUptime] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  
  const lastSyncRef = useRef<number>(0);

  const credentialRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid, 'moonIdCredentials', 'primary');
  }, [db, user]);

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const settingsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'automationSettings');
  }, [db, user]);

  const { data: credentials } = useDoc(credentialRef);
  const { data: settings } = useCollection(settingsQuery);

  const triggerSync = useCallback(async () => {
    if (!user || !db || !credentials || !userDocRef || isSyncing) return;
    
    setIsSyncing(true);
    lastSyncRef.current = Date.now();
    
    const config: Record<string, any> = {};
    settings?.forEach(s => {
      try {
        config[s.settingName] = JSON.parse(s.settingValue);
      } catch {
        config[s.settingName] = s.settingValue;
      }
    });

    try {
      const result = await syncMoonId({
        username: credentials.moonIdUsername,
        password: credentials.encryptedMoonIdPassword,
        server: credentials.description || 'es1.monstersgame.moonid.net',
        debug: debugMode,
        settings: config
      });

      setCooldown(result.pvpCooldown);

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

      const logsRef = collection(db, 'users', user.uid, 'activityLogs');
      result.logs.forEach(log => {
        const newLogRef = doc(logsRef);
        setDocumentNonBlocking(newLogRef, {
          id: newLogRef.id,
          userId: user.uid,
          timestamp: log.timestamp,
          logMessage: log.message,
          logLevel: log.type,
        }, { merge: true });
      });

      // If we performed a ritual action, we might want to sync again SOON
      // but only if we aren't now in cooldown.
      const performedAction = result.logs.some(l => 
        l.type === 'BATTLE' || l.type === 'MANHUNT' || l.type === 'MISSION'
      );
      
      if (performedAction && result.pvpCooldown === 0) {
        setTimeout(() => triggerSync(), 5000);
      }

    } catch (error) {
      // Handled by FirebaseErrorListener
    } finally {
      setIsSyncing(false);
    }
  }, [user, db, credentials, userDocRef, isSyncing, settings, debugMode]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setUptime(prev => prev + 1);
        
        // Count down the cooldown in real-time
        let nextCooldownValue = 0;
        setCooldown(prev => {
          nextCooldownValue = Math.max(0, prev - 1);
          return nextCooldownValue;
        });
        
        const now = Date.now();
        const secondsSinceLastSync = (now - lastSyncRef.current) / 1000;
        
        /**
         * SMART SYNC LOGIC:
         * 1. If cooldown was active and just reached zero: SYNC IMMEDIATELY.
         * 2. If no cooldown is active: Sync every 60 seconds (heartbeat for stamina/stats).
         * 3. Safety fallback: Sync every 5 minutes regardless of cooldown.
         */
        const justFinishedCooldown = cooldown > 0 && nextCooldownValue === 0;
        const regularHeartbeat = cooldown === 0 && secondsSinceLastSync >= 60;
        const safetyHeartbeat = secondsSinceLastSync >= 300;

        if ((justFinishedCooldown || regularHeartbeat || safetyHeartbeat) && !isSyncing) {
          triggerSync();
        }
      }, 1000);
    } else {
      setUptime(0);
      setCooldown(0);
    }
    return () => clearInterval(interval);
  }, [isRunning, cooldown, isSyncing, triggerSync]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleToggle = () => {
    if (!isRunning && credentials) {
      // Trigger initial sync when starting
      setTimeout(() => triggerSync(), 100);
    }
    setIsRunning(!isRunning);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-card border-b gothic-border rounded-t-lg">
      <div className="flex items-center gap-4 mb-4 sm:mb-0">
        <div className={cn(
          "w-3 h-3 rounded-full",
          isRunning ? "bg-green-500 animate-pulse" : "bg-red-500"
        )} />
        <div>
          <h1 className="text-2xl font-headline font-bold text-accent">GrimAutomata Engine</h1>
          <p className="text-sm text-muted-foreground">
            {isRunning ? `System active - Uptime: ${formatTime(uptime)}` : 'System standby'}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="hidden lg:flex items-center gap-6 mr-6 text-sm">
          {isSyncing && (
            <div className="flex items-center gap-2 text-accent">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Invoking Ritual...</span>
            </div>
          )}
          {cooldown > 0 && (
            <div className="flex items-center gap-2 text-orange-400">
              <Activity className="w-4 h-4 animate-pulse" />
              <span>Cooldown: {formatTime(cooldown)}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDebugMode(!debugMode)}
            className={cn(
              "text-[10px] uppercase tracking-widest gap-2",
              debugMode ? "text-purple-400" : "text-muted-foreground"
            )}
          >
            {debugMode ? <Bug className="w-3 h-3" /> : <BugOff className="w-3 h-3" />}
            Shadow: {debugMode ? 'VERBOSE' : 'SILENT'}
          </Button>
        </div>
        
        <Button 
          variant={isRunning ? "destructive" : "default"}
          onClick={handleToggle}
          disabled={!credentials && !isRunning}
          className={cn(
            "flex-1 sm:flex-none gap-2 px-8 font-bold uppercase tracking-wider",
            !isRunning && "bg-accent text-accent-foreground hover:bg-accent/90"
          )}
        >
          {isRunning ? (
            <><Square className="w-4 h-4 fill-current" /> Stop Ritual</>
          ) : (
            <><Play className="w-4 h-4 fill-current" /> Start Ritual</>
          )}
        </Button>
      </div>
    </div>
  );
}

"use client"

import React, { useState, useEffect } from 'react';
import { Power, Play, Square, Activity, ShieldAlert, Swords, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, collection, serverTimestamp } from 'firebase/firestore';
import { syncMoonId } from '@/ai/flows/moon-id-sync-flow';

export function StatusHeader() {
  const { user } = useUser();
  const db = useFirestore();
  const [isRunning, setIsRunning] = useState(false);
  const [uptime, setUptime] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const credentialRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid, 'moonIdCredentials', 'primary');
  }, [db, user]);

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: credentials } = useDoc(credentialRef);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setUptime(prev => prev + 1);
        // Periodic sync simulation every 60 seconds
        if (uptime > 0 && uptime % 60 === 0) {
          triggerSync();
        }
      }, 1000);
    } else {
      setUptime(0);
    }
    return () => clearInterval(interval);
  }, [isRunning, uptime]);

  const triggerSync = async () => {
    if (!user || !db || !credentials || !userDocRef) return;
    
    setIsSyncing(true);
    try {
      // Calling the flow which now retrieves "Real" data
      const result = await syncMoonId({
        username: credentials.moonIdUsername,
        password: credentials.encryptedMoonIdPassword, // Pass credentials for real auth simulation
        server: credentials.description || 'es1.monstersgame.moonid.net',
      });

      // Update character stats in Firestore
      setDocumentNonBlocking(userDocRef, {
        id: user.uid,
        race: result.race,
        level: result.stats.level,
        gold: result.stats.gold,
        stamina: result.stats.stamina,
        experience: result.stats.experience,
        nextLevelExp: result.stats.nextLevelExp,
        attributes: result.stats.attributes,
        lastSync: serverTimestamp(),
      }, { merge: true });

      // Save activity logs to the "Chronicles"
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
    } catch (error) {
      // Errors are handled by the global error listener
    } finally {
      setIsSyncing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleToggle = () => {
    if (!isRunning && credentials) {
      triggerSync();
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
              <span>Scanning Realm...</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-accent" />
            <span className="text-muted-foreground">Real-time Sync</span>
          </div>
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
            <><Square className="w-4 h-4 fill-current" /> Stop Automata</>
          ) : (
            <><Play className="w-4 h-4 fill-current" /> Start Automata</>
          )}
        </Button>
      </div>
    </div>
  );
}

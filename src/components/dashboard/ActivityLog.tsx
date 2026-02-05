
"use client"

import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, Shield, Swords, Coins, TrendingUp, AlertCircle, Ghost, MapPin, Skull } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';

export function ActivityLog() {
  const { user } = useUser();
  const db = useFirestore();
  const [currentTime, setCurrentTime] = useState<string | null>(null);

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    }));
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const logsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'users', user.uid, 'activityLogs'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
  }, [db, user]);

  const { data: logs, isLoading } = useCollection(logsQuery);

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'battle': return <Swords className="w-4 h-4 text-red-400" />;
      case 'training': return <TrendingUp className="w-4 h-4 text-blue-400" />;
      case 'loot': return <Coins className="w-4 h-4 text-accent" />;
      case 'manhunt': return <Skull className="w-4 h-4 text-orange-400" />;
      case 'mission': return <MapPin className="w-4 h-4 text-purple-400" />;
      case 'info': return <Terminal className="w-4 h-4 text-muted-foreground" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Ghost className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-full bg-card rounded-lg gothic-border overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between bg-muted/50">
        <h2 className="text-sm font-bold uppercase tracking-widest text-accent flex items-center gap-2">
          <Terminal className="w-4 h-4" /> Ritual Chronicles
        </h2>
        <span className="text-[10px] text-muted-foreground font-mono">
          {isLoading ? 'INVOKING...' : 'REALTIME_SYNC_OK'}
        </span>
      </div>
      
      <ScrollArea className="flex-1 p-4 font-mono text-[13px] leading-relaxed log-scroll">
        <div className="space-y-3">
          {logs && logs.map((log) => (
            <div key={log.id} className="group flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="text-muted-foreground/40 whitespace-nowrap">[{formatTimestamp(log.timestamp)}]</span>
              <span className="mt-0.5">{getIcon(log.logLevel.toLowerCase())}</span>
              <span className={cn(
                "flex-1",
                log.logLevel === 'ERROR' && "text-red-500",
                log.logLevel === 'BATTLE' && "text-red-200",
                log.logLevel === 'MANHUNT' && "text-orange-200",
                log.logLevel === 'LOOT' && "text-accent/90"
              )}>
                {log.logMessage}
              </span>
            </div>
          ))}
          {!isLoading && (!logs || logs.length === 0) && (
            <div className="text-muted-foreground italic">The grimoire is empty. Start the automata to begin the record.</div>
          )}
          <div className="flex gap-3 text-accent animate-pulse">
            <span className="text-muted-foreground/40">
              [{currentTime || '--:--:--'}]
            </span>
            <span className="mt-0.5"><Terminal className="w-4 h-4" /></span>
            <span>Awaiting next shadow ritual...</span>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

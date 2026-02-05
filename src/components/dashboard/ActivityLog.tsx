
"use client"

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, Shield, Swords, Coins, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

type LogEntry = {
  id: string;
  timestamp: string;
  type: 'info' | 'battle' | 'training' | 'loot' | 'error';
  message: string;
};

const MOCK_LOGS: LogEntry[] = [
  { id: '1', timestamp: '14:20:01', type: 'info', message: 'Bot initialized. Connecting to MoonID server...' },
  { id: '2', timestamp: '14:20:05', type: 'info', message: 'Authentication successful. Character: Vlad-the-Impailer' },
  { id: '3', timestamp: '14:21:12', type: 'battle', message: 'Engaged battle with "Shadow Werewolf". Result: Victory!' },
  { id: '4', timestamp: '14:21:13', type: 'loot', message: 'Looted 42 Gold coins and 1 Small Stamina Potion.' },
  { id: '5', timestamp: '14:23:45', type: 'training', message: 'Training Strength... Level increased to 45.' },
  { id: '6', timestamp: '14:25:00', type: 'info', message: 'Resting to recover Stamina (Current: 12/100).' },
  { id: '7', timestamp: '14:28:10', type: 'battle', message: 'Defeated by "Ancient Vampire". No experience gained.' },
  { id: '8', timestamp: '14:30:00', type: 'loot', message: 'Auto-sold common item: "Rusted Dagger" for 15 Gold.' },
];

export function ActivityLog() {
  const getIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'battle': return <Swords className="w-4 h-4 text-red-400" />;
      case 'training': return <TrendingUp className="w-4 h-4 text-blue-400" />;
      case 'loot': return <Coins className="w-4 h-4 text-accent" />;
      case 'info': return <Terminal className="w-4 h-4 text-muted-foreground" />;
      default: return <Shield className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-lg gothic-border overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between bg-muted/50">
        <h2 className="text-sm font-bold uppercase tracking-widest text-accent flex items-center gap-2">
          <Terminal className="w-4 h-4" /> Activity Grimoire
        </h2>
        <span className="text-[10px] text-muted-foreground font-mono">LIVE_FEED_ENABLED</span>
      </div>
      
      <ScrollArea className="flex-1 p-4 font-mono text-sm leading-relaxed log-scroll">
        <div className="space-y-3">
          {MOCK_LOGS.map((log) => (
            <div key={log.id} className="group flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="text-muted-foreground/60 whitespace-nowrap">[{log.timestamp}]</span>
              <span className="mt-1">{getIcon(log.type)}</span>
              <span className={cn(
                "flex-1",
                log.type === 'error' && "text-red-500",
                log.type === 'battle' && "text-red-200",
                log.type === 'loot' && "text-accent/90"
              )}>
                {log.message}
              </span>
            </div>
          ))}
          <div className="flex gap-3 text-accent animate-pulse">
            <span className="text-muted-foreground/60">[{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
            <span className="mt-1"><Terminal className="w-4 h-4" /></span>
            <span>Awaiting next ritual...</span>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

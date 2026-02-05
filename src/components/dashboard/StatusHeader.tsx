
"use client"

import React, { useState, useEffect } from 'react';
import { Power, Play, Square, Activity, ShieldAlert, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export function StatusHeader() {
  const [isRunning, setIsRunning] = useState(false);
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setUptime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-accent" />
            <span className="text-muted-foreground">Battles: <span className="text-foreground">142</span></span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-accent" />
            <span className="text-muted-foreground">Alerts: <span className="text-foreground">0</span></span>
          </div>
        </div>
        
        <Button 
          variant={isRunning ? "destructive" : "default"}
          onClick={() => setIsRunning(!isRunning)}
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

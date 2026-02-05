
"use client"

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skull, Coins, Zap, Shield, Swords, Heart, Target, Wind } from 'lucide-react';

export function QuickStats() {
  // In a real app, these would come from Firestore via the useDoc hook
  // For now, we show the structure expected by MonstersGame players
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Vampire Level" 
          value="52" 
          icon={<Skull className="text-accent w-4 h-4" />} 
          progress={72} 
          progressLabel="XP: 42,100 / 58,000"
        />
        <StatCard 
          label="Blood Gold" 
          value="2,450,120" 
          icon={<Coins className="text-accent w-4 h-4" />} 
        />
        <StatCard 
          label="Stamina" 
          value="88 / 100" 
          icon={<Zap className="text-accent w-4 h-4" />} 
          progress={88}
        />
        <StatCard 
          label="Shadow Power" 
          value="12,842" 
          icon={<Shield className="text-accent w-4 h-4" />} 
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <AttributeMiniCard label="STR" value="342" icon={<Swords className="w-3 h-3" />} />
        <AttributeMiniCard label="DEF" value="315" icon={<Shield className="w-3 h-3" />} />
        <AttributeMiniCard label="DEX" value="298" icon={<Target className="w-3 h-3" />} />
        <AttributeMiniCard label="AGI" value="275" icon={<Wind className="w-3 h-3" />} />
        <AttributeMiniCard label="CON" value="320" icon={<Heart className="w-3 h-3" />} />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, progress, progressLabel }: { 
  label: string, 
  value: string, 
  icon: React.ReactNode,
  progress?: number,
  progressLabel?: string
}) {
  return (
    <Card className="gothic-border bg-card/40 border-primary/20">
      <CardContent className="pt-4 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-tighter text-muted-foreground">{label}</span>
          {icon}
        </div>
        <div className="text-xl font-bold font-headline mb-2">{value}</div>
        {progress !== undefined && (
          <div className="space-y-1">
            <Progress value={progress} className="h-1 bg-muted" />
            {progressLabel && <div className="text-[9px] text-muted-foreground text-right">{progressLabel}</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AttributeMiniCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="p-2 rounded border bg-card/30 flex flex-col items-center justify-center gap-1">
      <div className="flex items-center gap-1 text-[9px] text-muted-foreground uppercase font-mono">
        {icon} {label}
      </div>
      <div className="text-sm font-bold text-accent">{value}</div>
    </div>
  );
}
